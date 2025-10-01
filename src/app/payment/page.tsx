import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import db from '@/lib/db';
import PaymentForm from '@/components/PaymentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Clock, User, CreditCard } from 'lucide-react';
import { getSession } from '@/lib/session';

interface PaymentPageProps {
  searchParams: Promise<{
    appointmentId?: string;
  }>;
}

async function PaymentContent({ appointmentId }: { appointmentId: string }) {
  const session = await getSession();
  
  if (!session?.user) {
    redirect('/sign-in');
  }

  // Fetch appointment details
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      service: true,
      employee: {
        include: {
          user: true,
        },
      },
      appointmentAddons: {
        include: {
          addon: true,
        },
      },
    },
  });

  if (!appointment) {
    redirect('/dashboard/appointments');
  }

  if (appointment.clientId !== session.user.id) {
    redirect('/dashboard/appointments');
  }

  if (appointment.status !== 'pending') {
    redirect('/dashboard/appointments');
  }

  if (!appointment.totalPrice || appointment.totalPrice <= 0) {
    redirect('/dashboard/appointments');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appointment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Appointment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{appointment.service.title}</h3>
                <p className="text-gray-600">{appointment.service.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {format(new Date(appointment.dateTime), 'EEEE, MMMM do, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {format(new Date(appointment.dateTime), 'h:mm a')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {appointment.employee.user.name}
                  </span>
                </div>
              </div>

              {/* Service Add-ons */}
              {appointment.appointmentAddons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Add-ons:</h4>
                  <div className="space-y-1">
                    {appointment.appointmentAddons.map((addon) => (
                      <div key={addon.id} className="flex justify-between text-sm">
                        <span>{addon.addon.name}</span>
                        <span>£{addon.addon.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>£{appointment.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Payment Method:</strong> Secure payment powered by Stripe
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Your payment information is encrypted and secure.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <div>
            <PaymentForm
              appointmentId={appointment.id}
              amount={appointment.totalPrice}
              customerEmail={appointment.client.email}
              customerName={appointment.client.name || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const resolvedSearchParams = await searchParams;
  const appointmentId = resolvedSearchParams.appointmentId;

  if (!appointmentId) {
    redirect('/dashboard/appointments');
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentContent appointmentId={appointmentId} />
    </Suspense>
  );
}
