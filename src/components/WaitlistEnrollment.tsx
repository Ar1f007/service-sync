'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { addToWaitlist } from '@/lib/actions/waitlist';
import { authClient } from '@/lib/auth-client';

interface WaitlistEnrollmentProps {
  serviceId: string;
  employeeId: string;
  requestedDateTime: Date;
  duration: number;
  selectedAddonIds: string[];
  totalPrice: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function WaitlistEnrollment({
  serviceId,
  employeeId,
  requestedDateTime,
  duration,
  selectedAddonIds,
  totalPrice,
  onSuccess,
  onError,
}: WaitlistEnrollmentProps) {
  const { data: session } = authClient.useSession();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    if (!session?.user?.id) {
      setError('You must be logged in to join the waitlist');
      return;
    }

    setIsEnrolling(true);
    setError(null);

    try {
      const result = await addToWaitlist(
        session.user.id,
        serviceId,
        employeeId,
        requestedDateTime,
        duration,
        selectedAddonIds,
        totalPrice
      );

      if (result.success) {
        setIsEnrolled(true);
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to join waitlist');
        onError?.(result.error || 'Failed to join waitlist');
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isEnrolled) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Added to Waitlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 mb-4">
            You've been successfully added to the waitlist for this time slot. 
            We'll notify you immediately if a slot becomes available.
          </p>
          <div className="bg-green-100 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-green-700 mt-2 space-y-1">
              <li>• You'll receive an email notification if a slot opens up</li>
              <li>• You'll have 15 minutes to confirm your booking</li>
              <li>• If you don't confirm, the slot goes to the next person</li>
              <li>• You can cancel your waitlist entry anytime</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Clock className="h-5 w-5" />
          Time Slot Unavailable
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This time slot is currently booked. Would you like to join the waitlist? 
            You'll be notified immediately if it becomes available.
          </AlertDescription>
        </Alert>

        <div className="bg-orange-100 p-4 rounded-lg">
          <h4 className="font-semibold text-orange-800 mb-2">Waitlist Benefits:</h4>
          <ul className="text-sm text-orange-700 space-y-1">
            <li>• <strong>Priority Access:</strong> First in line when slots open up</li>
            <li>• <strong>Instant Notifications:</strong> Email alerts for available slots</li>
            <li>• <strong>Quick Confirmation:</strong> 15-minute window to secure your spot</li>
            <li>• <strong>No Commitment:</strong> Cancel anytime if plans change</li>
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {isEnrolling ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Joining Waitlist...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Join Waitlist
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-orange-600 text-center">
          By joining the waitlist, you agree to be notified about available slots. 
          You can cancel your waitlist entry at any time.
        </p>
      </CardContent>
    </Card>
  );
}
