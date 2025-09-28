'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, AlertTriangle } from 'lucide-react';

interface CancelAppointmentDialogProps {
  onCancel: (reason: string) => Promise<void>;
  disabled?: boolean;
}

const cancellationReasons = [
  'Schedule conflict',
  'Found another provider',
  'No longer needed',
  'Financial reasons',
  'Health/medical reasons',
  'Travel plans changed',
  'Other',
];

export default function CancelAppointmentDialog({
  onCancel,
  disabled = false,
}: CancelAppointmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!selectedReason) {
      setError('Please select a cancellation reason');
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const reason = selectedReason === 'Other' ? customReason : selectedReason;
      await onCancel(reason);
      
      setIsOpen(false);
      setSelectedReason('');
      setCustomReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={disabled}
          className="bg-red-600 hover:bg-red-700"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {cancellationReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Please specify</Label>
              <Textarea
                id="customReason"
                placeholder="Please provide more details..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading || !selectedReason}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
