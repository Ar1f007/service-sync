'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { processRefund } from '@/lib/actions/refunds';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RefundDialogProps {
  paymentId: string;
  maxRefundAmount: number;
  currentAmount: number;
  refundedAmount: number;
}

export default function RefundDialog({
  paymentId,
  maxRefundAmount: _maxRefundAmount,
  currentAmount: _currentAmount,
  refundedAmount: _refundedAmount,
}: RefundDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('admin_cancelled');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [refundCalculation, setRefundCalculation] = useState<{
    refundAmount: number;
    adminFee: number;
    reason: string;
  } | null>(null);

  const formatAmount = (amount: number) => {
    return `£${(amount / 100).toFixed(2)}`;
  };

  const handleRefund = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await processRefund(
        paymentId,
        cancellationReason as 'client_cancelled' | 'admin_cancelled' | 'no_show' | 'other',
        refundReason || undefined
      );

      if (result.success && result.refund) {
        setSuccess(true);
        setRefundCalculation({
          refundAmount: result.refund.amount,
          adminFee: result.refund.adminFee,
          reason: result.refund.reason
        });
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setRefundReason('');
          setRefundCalculation(null);
          window.location.reload();
        }, 3000);
      } else {
        setError(result.error || 'Refund failed');
      }
    } catch (error) {
      console.error('Refund error:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false);
      setError(null);
      setSuccess(false);
      setRefundReason('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Process Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Refund processed successfully! The page will refresh shortly.
              </AlertDescription>
            </Alert>
            {refundCalculation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Refund Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Refund Amount:</span>
                    <span className="font-medium">{formatAmount(refundCalculation.refundAmount)}</span>
                  </div>
                  {refundCalculation.adminFee > 0 && (
                    <div className="flex justify-between">
                      <span>Admin Fee:</span>
                      <span className="font-medium text-red-600">-{formatAmount(refundCalculation.adminFee)}</span>
                    </div>
                  )}
                  <div className="text-xs text-green-700 mt-2">
                    {refundCalculation.reason}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="original-amount">Original Amount</Label>
              <Input
                id="original-amount"
                value={formatAmount(_currentAmount)}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refunded-amount">Already Refunded</Label>
              <Input
                id="refunded-amount"
                value={formatAmount(_refundedAmount)}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">Cancellation Reason</Label>
              <select
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin_cancelled">Admin Cancelled (Full Refund)</option>
                <option value="client_cancelled">Client Cancelled (Admin Fee Applied)</option>
                <option value="no_show">No Show (Full Refund)</option>
                <option value="other">Other (Full Refund)</option>
              </select>
              <p className="text-xs text-gray-500">
                {cancellationReason === 'client_cancelled' 
                  ? 'Client cancellations incur a 5% admin fee (min £5, max £50)'
                  : 'Full refund will be processed'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Admin Notes (Optional)</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter additional notes for this refund..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefund}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process Refund'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
