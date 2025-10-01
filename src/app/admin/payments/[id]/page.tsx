import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'better-auth/react';
import { auth } from '@/lib/auth';
import { getPaymentById } from '@/lib/actions/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowLeft, CreditCard, User, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createRefund } from '@/lib/actions/payments';
import RefundDialog from './_components/RefundDialog';

interface PaymentDetailPageProps {
  params: {
    id: string;
  };
}

async function PaymentDetailContent({ paymentId }: { paymentId: string }) {
  const session = await getServerSession({ auth });
  
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const result = await getPaymentById(paymentId);
  
  if (!result.success) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading payment: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payment = result.payment;

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      succeeded: 'default',
      failed: 'destructive',
      canceled: 'secondary',
      refunded: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number) => {
    return `£${(amount / 100).toFixed(2)}`;
  };

  const canRefund = payment.status === 'succeeded' && 
    (payment.amount - payment.refundedAmount) > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/payments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Payment Details</h1>
          <p className="text-gray-600">Payment ID: {payment.stripePaymentId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  {getStatusBadge(payment.status)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Amount</label>
                <div className="mt-1 text-lg font-semibold">
                  {formatAmount(payment.amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Currency</label>
                <div className="mt-1">{payment.currency.toUpperCase()}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Payment Method</label>
                <div className="mt-1">{payment.paymentMethod || 'N/A'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <div className="mt-1 text-sm">
                  {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Paid At</label>
                <div className="mt-1 text-sm">
                  {payment.paidAt ? format(new Date(payment.paidAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </div>
              </div>
            </div>

            {payment.refundedAmount > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-red-600 mb-2">Refund Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Refunded Amount</label>
                    <div className="mt-1 text-red-600 font-semibold">
                      {formatAmount(payment.refundedAmount)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Refunded At</label>
                    <div className="mt-1 text-sm">
                      {payment.refundedAt ? format(new Date(payment.refundedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </div>
                  </div>
                </div>
                {payment.refundReason && (
                  <div className="mt-2">
                    <label className="text-sm font-medium text-gray-500">Reason</label>
                    <div className="mt-1 text-sm">{payment.refundReason}</div>
                  </div>
                )}
              </div>
            )}

            {canRefund && (
              <div className="border-t pt-4">
                <RefundDialog
                  paymentId={payment.id}
                  maxRefundAmount={payment.amount - payment.refundedAmount}
                  currentAmount={payment.amount}
                  refundedAmount={payment.refundedAmount}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer & Appointment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer & Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Customer</label>
              <div className="mt-1">
                <div className="font-medium">{payment.customerName || 'N/A'}</div>
                <div className="text-sm text-gray-500">{payment.customerEmail}</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Service</label>
              <div className="mt-1">
                <div className="font-medium">{payment.appointment.service.title}</div>
                <div className="text-sm text-gray-500">{payment.appointment.service.description}</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Employee</label>
              <div className="mt-1">{payment.appointment.employee.user.name}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Appointment Date</label>
              <div className="mt-1">
                {format(new Date(payment.appointment.dateTime), 'EEEE, MMMM do, yyyy')}
              </div>
              <div className="text-sm text-gray-500">
                {format(new Date(payment.appointment.dateTime), 'h:mm a')}
              </div>
            </div>

            {payment.appointment.appointmentAddons.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Add-ons</label>
                <div className="mt-1 space-y-1">
                  {payment.appointment.appointmentAddons.map((addon) => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span>{addon.addon.name}</span>
                      <span>£{addon.addon.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount</span>
                <span className="font-semibold text-lg">
                  {formatAmount(payment.amount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentDetailContent paymentId={params.id} />
    </Suspense>
  );
}
