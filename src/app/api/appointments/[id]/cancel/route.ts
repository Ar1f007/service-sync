import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismaInstance from "@/lib/db";
import { sendAppointmentCancellation } from "@/lib/email";
import { processRefund } from "@/lib/actions/refunds";
import { updateCustomerRiskOnAppointmentChange } from "@/lib/risk-updater";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const { cancellationReason, adminNotes } = await request.json();

    // Get appointment details
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

    // Check if user can cancel this appointment
    if (session.user.role === 'client' && appointment.clientId !== session.user.id) {
      return NextResponse.json({ error: "You can only cancel your own appointments" }, { status: 403 });
    }

    if (appointment.status === 'cancelled') {
      return NextResponse.json({ error: "Appointment is already cancelled" }, { status: 400 });
    }

    // Update appointment status
    const updatedAppointment = await prismaInstance.appointment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledBy: session.user.id,
        cancelledByRole: session.user.role,
        cancellationReason: cancellationReason || 'Cancelled by customer',
      },
    });

    // Process refund if there's a successful payment
    let refundResult = null;
    try {
      const payment = await prismaInstance.payment.findFirst({
        where: {
          appointmentId: id,
          status: 'succeeded'
        }
      });

      if (payment) {
        refundResult = await processRefund(
          payment.id,
          'client_cancelled',
          adminNotes || cancellationReason || 'Cancelled by customer'
        );

        if (refundResult.success) {
          console.log('Refund processed successfully:', refundResult.refund);
        } else {
          console.error('Failed to process refund:', refundResult.error);
        }
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      // Don't fail the cancellation if refund fails
    }

    // Send cancellation email
    try {
      await sendAppointmentCancellation(appointment, appointment.client);
    } catch (error) {
      console.error("Failed to send cancellation email:", error);
      // Don't fail the cancellation if email fails
    }

    // Update customer risk assessment
    try {
      await updateCustomerRiskOnAppointmentChange(id);
    } catch (error) {
      console.error("Failed to update customer risk assessment:", error);
      // Don't fail the cancellation if risk assessment update fails
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      refund: refundResult?.success ? refundResult.refund : null,
      message: refundResult?.success && refundResult.refund
        ? `Appointment cancelled and refund processed. Refund amount: £${(refundResult.refund.amount / 100).toFixed(2)}`
        : 'Appointment cancelled successfully'
    });

  } catch (error: unknown) {
    console.error("Failed to cancel appointment:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to cancel appointment" 
    }, { status: 500 });
  }
}