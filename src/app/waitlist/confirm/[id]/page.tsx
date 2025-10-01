import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'better-auth/react';
import { auth } from '@/lib/auth';
import { confirmWaitlistBooking, getWaitlistEntries } from '@/lib/actions/waitlist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface WaitlistConfirmPageProps {
  params: {
    id: string;
  };
}

async function WaitlistConfirmContent({ waitlistId }: { waitlistId: string }) {
  const session = await getServerSession({ auth });
  
  if (!session?.user) {
    redirect('/sign-in');
  }

  // Get waitlist entry details
  const result = await getWaitlistEntries();
  
  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading waitlist entry: {result.error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const waitlistEntry = result.waitlistEntries.find(entry => entry.id === waitlistId);

  if (!waitlistEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Waitlist entry not found or has expired.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (waitlistEntry.clientId !== session.user.id) {
    redirect('/dashboard/appointments');
  }

  if (waitlistEntry.status !== 'notified') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This waitlist entry is no longer available for confirmation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if notification has expired
  const isExpired = waitlistEntry.notificationExpiresAt && 
    new Date() > new Date(waitlistEntry.notificationExpiresAt);

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This notification has expired. The slot has been offered to the next person in line.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleConfirm = async () => {
    'use server';
    
    const result = await confirmWaitlistBooking(waitlistId);
    
    if (result.success) {
      redirect('/payment/success?appointment_id=' + result.appointment.id);
    } else {
      redirect('/waitlist/confirm/' + waitlistId + '?error=' + encodeURIComponent(result.error || 'Confirmation failed'));
    }
  };

  const formattedDate = format(new Date(waitlistEntry.requestedDateTime), 'EEEE, MMMM do, yyyy');
  const formattedTime = format(new Date(waitlistEntry.requestedDateTime), 'h:mm a');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Your Slot is Available!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Time Sensitive:</strong> You have 15 minutes to confirm this booking. 
                After this time, the slot will be offered to the next person in line.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Appointment Details</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{waitlistEntry.service.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Staff:</span>
                  <span className="font-medium">{waitlistEntry.employee.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{formattedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Position:</span>
                  <span className="font-medium">#{waitlistEntry.position} in queue</span>
                </div>
                {waitlistEntry.totalPrice && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Price:</span>
                    <span className="font-medium">£{waitlistEntry.totalPrice.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <form action={handleConfirm}>
                <Button type="submit" className="w-full" size="lg">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Confirm Booking Now
                </Button>
              </form>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard/appointments">
                  Cancel
                </Link>
              </Button>
            </div>

            <div className="text-sm text-gray-500 text-center">
              <p>
                If you're no longer interested in this appointment, you can simply close this page 
                and the slot will be offered to the next person in line.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function WaitlistConfirmPage({ params }: WaitlistConfirmPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <WaitlistConfirmContent waitlistId={params.id} />
    </Suspense>
  );
}
