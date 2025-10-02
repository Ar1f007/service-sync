import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { generateAndSaveInvoice } from '@/lib/invoice/generator';
import { getSession } from '@/lib/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointmentId } = await params;
    
    // Check if user has access to this appointment
    const db = (await import('@/lib/db')).default;
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        employee: {
          include: {
            user: true
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = appointment.clientId === session.user.id;
    const isAdmin = session.user.role === 'admin';
    const isEmployee = appointment.employee.userId === session.user.id;

    if (!isOwner && !isAdmin && !isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { invoiceData, pdfBuffer } = await generateAndSaveInvoice(appointmentId);

    return new NextResponse(pdfBuffer as unknown as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
