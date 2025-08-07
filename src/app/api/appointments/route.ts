import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();

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
    const where: any = {};
    if (session.user.role === "staff") {
      const employee = await prisma.employee.findFirst({
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

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({
      appointments: appointments.map((appt) => ({
        id: appt.id,
        service: appt.service,
        client: appt.client,
        employee: appt.employee,
        dateTime: toZonedTime(appt.dateTime, timezone).toISOString(),
        status: appt.status,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { serviceId, employeeId, clientId, dateTime, status, timezone = "Europe/London" } = await request.json();

    if (!serviceId || !employeeId || !clientId || !dateTime || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure clients can only book for themselves
    if (session.user.role === "client" && clientId !== session.user.id) {
      return NextResponse.json({ error: "Clients can only book for themselves" }, { status: 403 });
    }

    // Validate relations
    const [service, client, employee, serviceEmployee] = await Promise.all([
      prisma.service.findUnique({
        where: { id: serviceId },
        select: { id: true, title: true, price: true, duration: true },
      }),
      prisma.user.findUnique({
        where: { id: clientId },
        select: { id: true, name: true },
      }),
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.serviceEmployee.findFirst({
        where: { serviceId, employeeId },
      }),
    ]);

    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!serviceEmployee) {
      return NextResponse.json({ error: "Employee not assigned to this service" }, { status: 400 });
    }

    // Conflict check
    const start = fromZonedTime(new Date(dateTime), timezone);
    const end = new Date(start.getTime() + service.duration * 60 * 1000);
    const conflicting = await prisma.appointment.findFirst({
      where: {
        employeeId,
        dateTime: {
          gte: start,
          lt: end,
        },
      },
    });
    if (conflicting) {
      return NextResponse.json({ error: "Time slot unavailable" }, { status: 409 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        serviceId,
        employeeId,
        clientId,
        dateTime: start,
        status: status || "confirmed", // Default to confirmed for client bookings
      },
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(
      {
        id: appointment.id,
        service: appointment.service,
        client: appointment.client,
        employee: appointment.employee,
        dateTime: toZonedTime(appointment.dateTime, timezone).toISOString(),
        status: appointment.status,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create appointment:", error);
    return NextResponse.json({ error: error.message || "Failed to create appointment" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}