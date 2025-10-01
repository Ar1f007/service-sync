import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'better-auth/react';
import { auth } from '@/lib/auth';
import { getWaitlistEntries } from '@/lib/actions/waitlist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Clock, Users, RefreshCw, Eye, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import WaitlistCleanupButton from '@/components/WaitlistCleanupButton';

async function WaitlistContent() {
  const session = await getServerSession({ auth });
  
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const result = await getWaitlistEntries();
  
  if (!result.success) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading waitlist: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const waitlistEntries = result.waitlistEntries;

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waitlist Management</h1>
          <p className="text-gray-600">Manage customer waitlist entries and notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <WaitlistCleanupButton />
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitlistEntries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {waitlistEntries.filter(e => e.status === 'waiting').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notified</CardTitle>
            <CheckCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {waitlistEntries.filter(e => e.status === 'notified').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {waitlistEntries.filter(e => e.status === 'confirmed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Waitlist Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Requested Time</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitlistEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{entry.client.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{entry.client.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.service.title}</div>
                    <div className="text-sm text-gray-500">{entry.duration} min</div>
                  </TableCell>
                  <TableCell>
                    {entry.employee.user.name}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(entry.requestedDateTime), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(entry.requestedDateTime), 'h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">#{entry.position}</Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(entry.status)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(entry.totalPrice)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(entry.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/waitlist/${entry.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <WaitlistContent />
    </Suspense>
  );
}
