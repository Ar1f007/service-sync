import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prismaInstance from '@/lib/db';
import { sendAppointmentCancellation } from '@/lib/email';
import { updateCustomerRiskOnAppointmentChange } from '@/lib/risk-updater';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { reason } = await request.json();

    if (!reason) {
      return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 });
    }

    // Get appointment details
    const appointment = await prismaInstance.appointment.findUnique({
      where: { id },
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true, email: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check if user is the client who made the appointment
    if (appointment.clientId !== session.user.id) {
      return NextResponse.json({ error: 'You can only cancel your own appointments' }, { status: 403 });
    }

    // Check if appointment can be cancelled (not already cancelled or completed)
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 });
    }

    if (appointment.status === 'confirmed' && appointment.dateTime < new Date()) {
      return NextResponse.json({ error: 'Cannot cancel past appointments' }, { status: 400 });
    }

    // Update appointment with cancellation details
    const updatedAppointment = await prismaInstance.appointment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledBy: session.user.id,
        cancelledByRole: 'client',
        cancellationReason: reason,
        updatedAt: new Date(),
      },
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true, email: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    // Send cancellation email
    try {
      await sendAppointmentCancellation(updatedAppointment, updatedAppointment.client);
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
      // Don't fail the cancellation if email fails
    }

    // Update customer risk assessment
    try {
      await updateCustomerRiskOnAppointmentChange(id);
    } catch (error) {
      console.error('Failed to update customer risk assessment:', error);
      // Don't fail the cancellation if risk assessment update fails
    }

    return NextResponse.json({
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment,
    });
  } catch (error: unknown) {
    console.error('Failed to cancel appointment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}
