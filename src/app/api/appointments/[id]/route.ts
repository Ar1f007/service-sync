// api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteAppointment, updateAppointment } from "@/lib/data/dashboard/appointments";
import { sendAppointmentConfirmation, sendAppointmentCancellation } from "@/lib/email";
import prismaInstance from "@/lib/db";
import { updateCustomerRiskOnAppointmentChange } from "@/lib/risk-updater";
import { processRefund } from "@/lib/actions/refunds";


type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) { 
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
  
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") || "Europe/London";
    const updateData = await request.json(); // Get the raw JSON body

    // Get appointment details before updating for email notifications
    const appointment = await prismaInstance.appointment.findUnique({
      where: { id },
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true, email: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
        appointmentAddons: {
          include: {
            addon: { select: { id: true, name: true, price: true, duration: true } }
          }
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Add cancellation tracking for admin cancellations
    if (updateData.status === 'cancelled' && appointment.status !== 'cancelled') {
      updateData.cancelledBy = session.user.id;
      updateData.cancelledByRole = 'admin';
      updateData.cancellationReason = updateData.cancellationReason || 'Cancelled by admin';
    }

    const updatedAppointment = await updateAppointment(id, updateData, timezone);

    // Process refund if appointment is cancelled and has a successful payment
    if (updateData.status === 'cancelled' && appointment.status !== 'cancelled') {
      try {
        const payment = await prismaInstance.payment.findFirst({
          where: {
            appointmentId: id,
            status: 'succeeded'
          }
        });

        if (payment) {
          const refundResult = await processRefund(
            payment.id,
            'admin_cancelled',
            updateData.cancellationReason || 'Cancelled by admin'
          );

          if (refundResult.success) {
            console.log('Refund processed successfully:', refundResult.refund);
          } else {
            console.error('Failed to process refund:', refundResult.error);
          }
        }
      } catch (error) {
        console.error('Error processing refund:', error);
        // Don't fail the appointment cancellation if refund fails
      }
    }

    // Send appropriate email based on status change
    if (updateData.status === "confirmed" && appointment.status !== "confirmed") {
      try {
        // Transform appointment data to include addons in the format expected by email template
        const appointmentWithAddons = {
          ...appointment,
          addons: appointment.appointmentAddons?.map(appointmentAddon => ({
            id: appointmentAddon.addon.id,
            name: appointmentAddon.addon.name,
            price: appointmentAddon.addon.price,
            duration: appointmentAddon.addon.duration,
          })) || [],
        };
        
        await sendAppointmentConfirmation(appointmentWithAddons, appointment.client);
      } catch (error) {
        console.error("Failed to send confirmation email:", error);
        // Don't fail the update if email fails
      }
    } else if (updateData.status === "cancelled" && appointment.status !== "cancelled") {
      try {
        await sendAppointmentCancellation(appointment, appointment.client);
      } catch (error) {
        console.error("Failed to send cancellation email:", error);
        // Don't fail the update if email fails
      }
    }

    // Update customer risk assessment
    try {
      await updateCustomerRiskOnAppointmentChange(id);
    } catch (error) {
      console.error("Failed to update customer risk assessment:", error);
      // Don't fail the update if risk assessment update fails
    }

    return NextResponse.json(updatedAppointment);
  } catch (error: any) {
    console.error("Failed to update appointment:", error);
    if (error.message === "Service not found" || error.message === "Client not found" || error.message === "Employee not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "Employee not assigned to this service" || error.message === "Time slot unavailable") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === "P2025") { // Prisma record not found error
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Await the params since it's now a Promise
    const { id } = await context.params;
    
    // Get appointment details before deleting for email notifications
    const appointment = await prismaInstance.appointment.findUnique({
      where: { id },
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true, email: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await deleteAppointment(id); // Use the new delete function

    // Send cancellation email
    try {
      await sendAppointmentCancellation(appointment, appointment.client);
    } catch (error) {
      console.error("Failed to send cancellation email:", error);
      // Don't fail the deletion if email fails
    }

    // Update customer risk assessment
    try {
      await updateCustomerRiskOnAppointmentChange(id);
    } catch (error) {
      console.error("Failed to update customer risk assessment:", error);
      // Don't fail the deletion if risk assessment update fails
    }

    return NextResponse.json({ message: "Appointment deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete appointment:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Failed to delete appointment" }, { status: 500 });
  }
}