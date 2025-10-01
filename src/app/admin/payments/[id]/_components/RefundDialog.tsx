'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createRefund } from '@/lib/actions/payments';
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
  maxRefundAmount,
  currentAmount,
  refundedAmount,
}: RefundDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState(maxRefundAmount);
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatAmount = (amount: number) => {
    return `£${(amount / 100).toFixed(2)}`;
  };

  const handleRefund = async () => {
    if (refundAmount <= 0 || refundAmount > maxRefundAmount) {
      setError('Invalid refund amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createRefund(
        paymentId,
        refundAmount / 100, // Convert pence to pounds
        refundReason || undefined
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setRefundAmount(maxRefundAmount);
          setRefundReason('');
          window.location.reload();
        }, 2000);
      } else {
        setError(result.error || 'Refund failed');
      }
    } catch (err) {
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
      setRefundAmount(maxRefundAmount);
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
                value={formatAmount(currentAmount)}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refunded-amount">Already Refunded</Label>
              <Input
                id="refunded-amount"
                value={formatAmount(refundedAmount)}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                max={maxRefundAmount / 100}
                step="0.01"
                value={refundAmount / 100}
                onChange={(e) => setRefundAmount(Math.round(parseFloat(e.target.value) * 100))}
                placeholder={`Max: ${formatAmount(maxRefundAmount)}`}
              />
              <p className="text-xs text-gray-500">
                Maximum refundable: {formatAmount(maxRefundAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason (Optional)</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund..."
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
                disabled={isLoading || refundAmount <= 0 || refundAmount > maxRefundAmount}
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
