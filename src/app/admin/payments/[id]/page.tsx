import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getPaymentById } from '@/lib/actions/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowLeft, CreditCard, User, } from 'lucide-react';
import Link from 'next/link';
import RefundDialog from './_components/RefundDialog';
import { getSession } from '@/lib/session';

interface PaymentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function PaymentDetailContent({ paymentId }: { paymentId: string }) {
  const session = await getSession();
  
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

  const canRefund = payment?.status === 'succeeded' && 
    payment && (payment.amount - payment.refundedAmount) > 0;

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
          <p className="text-gray-600">Payment ID: {payment?.stripePaymentId}</p>
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
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div className="mt-1">
                  {getStatusBadge(payment?.status || 'unknown')}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Amount</div>
                <div className="mt-1 text-lg font-semibold">
                  {payment?.amount ? formatAmount(payment.amount) : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Currency</div>
                <div className="mt-1">{payment?.currency?.toUpperCase() || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Payment Method</div>
                <div className="mt-1">{payment?.paymentMethod || 'N/A'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Created</div>
                <div className="mt-1 text-sm">
                  {payment?.createdAt ? format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Paid At</div>
                <div className="mt-1 text-sm">
                  {payment?.paidAt ? format(new Date(payment.paidAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </div>
              </div>
            </div>

            {payment && payment.refundedAmount > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-red-600 mb-2">Refund Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Refunded Amount</div>
                    <div className="mt-1 text-red-600 font-semibold">
                      {payment?.refundedAmount ? formatAmount(payment.refundedAmount) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Refunded At</div>
                    <div className="mt-1 text-sm">
                      {payment?.refundedAt ? format(new Date(payment.refundedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </div>
                  </div>
                </div>
                {payment.refundReason && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-gray-500">Reason</div>
                    <div className="mt-1 text-sm">{payment?.refundReason || 'N/A'}</div>
                  </div>
                )}
              </div>
            )}

            {canRefund && (
              <div className="border-t pt-4">
                <RefundDialog
                  paymentId={payment?.id || ''}
                  maxRefundAmount={payment ? payment.amount - payment.refundedAmount : 0}
                  currentAmount={payment?.amount || 0}
                  refundedAmount={payment?.refundedAmount || 0}
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
              <div className="text-sm font-medium text-gray-500">Customer</div>
              <div className="mt-1">
                <div className="font-medium">{payment?.customerName || 'N/A'}</div>
                <div className="text-sm text-gray-500">{payment?.customerEmail || 'N/A'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Service</div>
              <div className="mt-1">
                <div className="font-medium">{payment?.appointment?.service?.title || 'N/A'}</div>
                <div className="text-sm text-gray-500">{payment?.appointment?.service?.description || 'N/A'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Employee</div>
              <div className="mt-1">{payment?.appointment?.employee?.user?.name || 'N/A'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Appointment Date</div>
              <div className="mt-1">
                {payment?.appointment?.dateTime ? format(new Date(payment.appointment.dateTime), 'EEEE, MMMM do, yyyy') : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                {payment?.appointment?.dateTime ? format(new Date(payment.appointment.dateTime), 'h:mm a') : 'N/A'}
              </div>
            </div>

            {payment?.appointment?.appointmentAddons && payment.appointment.appointmentAddons.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-500">Add-ons</div>
                <div className="mt-1 space-y-1">
                  {payment?.appointment?.appointmentAddons?.map((addon) => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span>{addon.addon?.name || 'N/A'}</span>
                      <span>£{addon.addon?.price?.toFixed(2) || '0.00'}</span>
                    </div>
                  )) || []}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount</span>
                <span className="font-semibold text-lg">
                  {payment?.amount ? formatAmount(payment.amount) : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const { id } = await params;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentDetailContent paymentId={id} />
    </Suspense>
  );
}
