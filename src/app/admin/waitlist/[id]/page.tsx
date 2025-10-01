import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getWaitlistEntryById } from '@/lib/actions/waitlist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ArrowLeft, Clock, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { notifyNextInWaitlist, cancelWaitlistEntry } from '@/lib/actions/waitlist';

interface WaitlistDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function WaitlistDetailContent({ waitlistId }: { waitlistId: string }) {
  const session = await getSession();
  
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const result = await getWaitlistEntryById(waitlistId);
  
  if (!result.success) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading waitlist entry: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const entry = result.waitlistEntry;

  if (!entry) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Waitlist entry not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      waiting: 'secondary',
      notified: 'default',
      confirmed: 'default',
      expired: 'destructive',
      cancelled: 'outline',
    } as const;

    const colors = {
      waiting: 'bg-blue-100 text-blue-800',
      notified: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    } as const;

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return `£${amount.toFixed(2)}`;
  };

  const handleNotifyNext = async () => {
    'use server';
    try {
      await notifyNextInWaitlist(entry.serviceId, entry.employeeId, entry.requestedDateTime);
    } catch (error) {
      console.error('Failed to notify next in waitlist:', error);
    }
  };

  const handleCancel = async () => {
    'use server';
    try {
      await cancelWaitlistEntry(entry.id);
    } catch (error) {
      console.error('Failed to cancel waitlist entry:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/waitlist">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Waitlist
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Waitlist Entry Details</h1>
          <p className="text-gray-600">Entry ID: {entry.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Name</div>
              <div className="mt-1 font-medium">{entry.client.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Email</div>
              <div className="mt-1">{entry.client.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Status</div>
              <div className="mt-1">
                {getStatusBadge(entry.status)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Position in Queue</div>
              <div className="mt-1">
                <Badge variant="outline">#{entry.position}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Service Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Service</div>
              <div className="mt-1 font-medium">{entry.service.title}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Employee</div>
              <div className="mt-1">{entry.employee.user.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Requested Date & Time</div>
              <div className="mt-1">
                <div className="font-medium">
                  {format(new Date(entry.requestedDateTime), 'EEEE, MMMM do, yyyy')}
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(entry.requestedDateTime), 'h:mm a')}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Duration</div>
              <div className="mt-1">{entry.duration} minutes</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Total Price</div>
              <div className="mt-1 font-semibold text-lg">
                {formatAmount(entry.totalPrice)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Created</div>
              <div className="mt-1 text-sm">
                {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Expires</div>
              <div className="mt-1 text-sm">
                {format(new Date(entry.expiresAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
            {entry.notificationSentAt && (
              <div>
                <div className="text-sm font-medium text-gray-500">Notification Sent</div>
                <div className="mt-1 text-sm">
                  {format(new Date(entry.notificationSentAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            )}
            {entry.notificationExpiresAt && (
              <div>
                <div className="text-sm font-medium text-gray-500">Notification Expires</div>
                <div className="mt-1 text-sm">
                  {format(new Date(entry.notificationExpiresAt), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {entry.status === 'waiting' && (
              <form action={handleNotifyNext}>
                <Button type="submit" variant="default">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Notify Customer
                </Button>
              </form>
            )}
            {entry.status !== 'cancelled' && entry.status !== 'confirmed' && (
              <form action={handleCancel}>
                <Button type="submit" variant="destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Cancel Entry
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function WaitlistDetailPage({ params }: WaitlistDetailPageProps) {
  const { id } = await params;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <WaitlistDetailContent waitlistId={id} />
    </Suspense>
  );
}
