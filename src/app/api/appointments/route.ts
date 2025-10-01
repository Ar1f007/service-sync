import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import prismaInstance from "@/lib/db";
import { sendBookingSubmitted,  sendAdminNotification } from "@/lib/email";
import { updateCustomerRiskOnAppointmentChange } from "@/lib/risk-updater";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff" && session.user.role !== "client")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const date = searchParams.get("date");
  const timezone = searchParams.get("timezone") || "Europe/London";

  try {
    const where: Record<string, unknown> = {};
    if (session.user.role === "staff") {
      const employee = await prismaInstance.employee.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!employee) return NextResponse.json({ appointments: [] });
      where.employeeId = employee.id;
    } else if (session.user.role === "client") {
      // Clients must provide employeeId and date for booking
      if (!employeeId || !date) {
        return NextResponse.json({ error: "employeeId and date are required for clients" }, { status: 400 });
      }
      where.employeeId = employeeId;
    } else if (employeeId) {
      // Admins can optionally filter by employeeId
      where.employeeId = employeeId;
    }

    if (date) {
      const zonedDate = fromZonedTime(new Date(`${date}T00:00:00`), timezone);
      where.dateTime = {
        gte: zonedDate,
        lte: fromZonedTime(new Date(`${date}T23:59:59`), timezone),
      };
    }

    const appointments = await prismaInstance.appointment.findMany({
      where: {
        ...where,
      },
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
        appointmentAddons: {
          include: {
            addon: { select: { id: true, name: true, price: true, duration: true } },
          },
        },
      },
    });

    // Filter out appointments with null clientId (MongoDB Prisma limitation)
    const validAppointments = appointments.filter(appt => appt.clientId !== null);

    return NextResponse.json({
      appointments: validAppointments.map((appt) => ({
        id: appt.id,
        service: appt.service,
        client: appt.client,
        employee: appt.employee,
        dateTime: toZonedTime(appt.dateTime, timezone).toISOString(),
        status: appt.status,
        totalPrice: appt.totalPrice,
        addons: appt.appointmentAddons.map(aa => aa.addon),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  } finally {
    // await prismaInstance.$disconnect();
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { 
      serviceId, 
      employeeId, 
      clientId, 
      dateTime, 
      status = "pending", 
      timezone = "Europe/London",
      addonIds = [],
      totalPrice: requestedTotalPrice
    } = await request.json();

    if (!serviceId || !employeeId || !clientId || !dateTime || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure clients can only book for themselves
    if (session.user.role === "client" && clientId !== session.user.id) {
      return NextResponse.json({ error: "Clients can only book for themselves" }, { status: 403 });
    }

    // Validate relations
    const [service, client, employee, serviceEmployee, addons] = await Promise.all([
      prismaInstance.service.findUnique({
        where: { id: serviceId },
        select: { id: true, title: true, price: true, duration: true },
      }),
      prismaInstance.user.findUnique({
        where: { id: clientId },
        select: { id: true, name: true },
      }),
      prismaInstance.employee.findUnique({
        where: { id: employeeId },
        include: { user: { select: { id: true, name: true } } },
      }),
      prismaInstance.serviceEmployee.findFirst({
        where: { serviceId, employeeId },
      }),
      addonIds.length > 0 ? prismaInstance.serviceAddon.findMany({
        where: {
          id: { in: addonIds },
          serviceId,
          isActive: true,
        },
      }) : Promise.resolve([]),
    ]);

    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!serviceEmployee) {
      return NextResponse.json({ error: "Employee not assigned to this service" }, { status: 400 });
    }

    // Validate add-ons
    if (addonIds.length > 0 && addons.length !== addonIds.length) {
      return NextResponse.json({ error: "One or more add-ons are invalid or inactive" }, { status: 400 });
    }

    // Calculate total price and duration
    const addonPrice = addons.reduce((sum, addon) => sum + addon.price, 0);
    const addonDuration = addons.reduce((sum, addon) => sum + addon.duration, 0);
    const calculatedTotalPrice = service.price + addonPrice;
    const totalPrice = requestedTotalPrice !== undefined ? requestedTotalPrice : calculatedTotalPrice;
    const totalDuration = service.duration + addonDuration;

    // Overbooking check - allow conflicts but determine status
    const start = fromZonedTime(new Date(dateTime), timezone);
    const end = new Date(start.getTime() + totalDuration * 60 * 1000);
    const conflictingAppointments = await prismaInstance.appointment.findMany({
      where: {
        employeeId,
        dateTime: {
          gte: start,
          lt: end,
        },
        status: { in: ['confirmed', 'pending'] }, // Only count active appointments
      },
    });
    
    // Determine appointment status based on conflicts
    let appointmentStatus = status;
    if (conflictingAppointments.length > 0) {
      // If there are conflicts, put this appointment on waitlist
      appointmentStatus = 'waitlist';
    }

    // Create appointment with add-ons in a transaction
    const result = await prismaInstance.$transaction(async (tx) => {
      const newAppointment = await tx.appointment.create({
        data: {
          serviceId,
          employeeId,
          clientId,
          dateTime: start,
          status: appointmentStatus,
          totalPrice,
        },
        include: {
          service: { select: { id: true, title: true, price: true, duration: true } },
          client: { select: { id: true, name: true, email: true } },
          employee: { include: { user: { select: { id: true, name: true } } } },
        },
      });

      // Create appointment add-ons if any
      if (addons.length > 0) {
        await tx.appointmentAddon.createMany({
          data: addons.map(addon => ({
            appointmentId: newAppointment.id,
            addonId: addon.id,
          })),
        });
      }

      // Create waitlist entry if appointment is on waitlist
      let waitlistEntry = null;
      if (appointmentStatus === 'waitlist') {
        // Get current position in queue
        const currentPosition = await tx.waitlist.count({
          where: {
            serviceId,
            employeeId,
            requestedDateTime: start,
            status: { in: ['waiting', 'notified'] },
          },
        });

        // Set expiration time (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        waitlistEntry = await tx.waitlist.create({
          data: {
            clientId,
            serviceId,
            employeeId,
            requestedDateTime: start,
            duration: totalDuration,
            position: currentPosition + 1,
            expiresAt,
            selectedAddonIds: addonIds,
            totalPrice,
          },
        });
      }

      return { appointment: newAppointment, waitlistEntry };
    });

    const appointment = result.appointment;
    const waitlistEntry = result.waitlistEntry;

    // Add add-ons information to the appointment object for email sending
    const appointmentWithAddons = {
      ...appointment,
      addons: addons.map(addon => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        duration: addon.duration,
      })),
      totalPrice,
    };

    // Send booking submitted email to customer (pending approval)
    try {
      await sendBookingSubmitted(appointmentWithAddons, appointment.client);
    } catch (error) {
      console.error("Failed to send booking submitted email:", error);
      // Don't fail the booking if email fails
    }

    // Send notification to admin
    try {
      await sendAdminNotification(appointmentWithAddons, appointment.client);
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      // Don't fail the booking if email fails
    }

    // Update customer risk assessment
    try {
      await updateCustomerRiskOnAppointmentChange(appointment.id);
    } catch (error) {
      console.error("Failed to update customer risk assessment:", error);
      // Don't fail the booking if risk assessment update fails
    }

    return NextResponse.json(
      {
        appointment: {
          id: appointment.id,
          service: appointment.service,
          client: appointment.client,
          employee: appointment.employee,
          dateTime: toZonedTime(appointment.dateTime, timezone).toISOString(),
          status: appointment.status,
          totalPrice: appointment.totalPrice,
          addons: addons.map(addon => ({
            id: addon.id,
            name: addon.name,
            price: addon.price,
            duration: addon.duration,
          })),
        },
        waitlist: appointmentStatus === 'waitlist',
        waitlistEntry: waitlistEntry ? {
          id: waitlistEntry.id,
          position: waitlistEntry.position,
          expiresAt: waitlistEntry.expiresAt,
        } : null,
        message: appointmentStatus === 'waitlist' 
          ? 'Time slot is full. You have been added to the waitlist.' 
          : 'Appointment booked successfully'
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Failed to create appointment:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create appointment" 
    }, { status: 500 });
  } finally {
    // await prismaInstance.$disconnect();
  }
}