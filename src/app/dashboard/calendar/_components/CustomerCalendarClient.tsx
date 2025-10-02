'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CalendarEvent } from '@/components/calendar/AppointmentCalendar';
import AppointmentCalendar from '@/components/calendar/AppointmentCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  service: { title: string; price: number; duration: number };
  employee: { user: { name: string | null } };
  dateTime: string;
  status: string;
  totalPrice?: number;
  addons?: Array<{ name: string; price: number }>;
  appointmentAddons?: Array<{ addon: { name: string; price: number } }>;
}

interface CustomerCalendarClientProps {
  userId: string;
}

export default function CustomerCalendarClient(_props: CustomerCalendarClientProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day'>('month');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  const fetchAppointments = useCallback(async () => {
    try {
      // For clients, we need to fetch all their appointments without employeeId/date filters
      // We'll use a different approach - fetch appointments for the current user
      const response = await fetch('/api/appointments');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        console.error('Failed to fetch appointments:', response.statusText);
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const convertToCalendarEvents = (appointments: Appointment[]): CalendarEvent[] => {
    return appointments.map(appointment => {
      const startDate = new Date(appointment.dateTime);
      const endDate = new Date(startDate.getTime() + appointment.service.duration * 60000);
      
      // Handle both data structures - API returns 'addons' but some components expect 'appointmentAddons'
      const addons = appointment.addons || 
        (appointment.appointmentAddons ? appointment.appointmentAddons.map(aa => ({
          name: aa.addon.name,
          price: aa.addon.price
        })) : []);
      
      return {
        id: appointment.id,
        title: appointment.service.title,
        start: startDate,
        end: endDate,
        resource: {
          appointmentId: appointment.id,
          status: appointment.status,
          clientName: 'You', // Customer's own appointments
          serviceName: appointment.service.title,
          employeeName: appointment.employee.user.name || 'Unknown',
          totalPrice: appointment.totalPrice || appointment.service.price,
          addons: addons
        }
      };
    });
  };

  const handleEditAppointment = (appointmentId: string) => {
    // For customers, editing usually means rescheduling
    router.push(`/book?reschedule=${appointmentId}`);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setCancelDialogOpen(true);
  };

  const handleRescheduleAppointment = (appointmentId: string) => {
    router.push(`/book?reschedule=${appointmentId}`);
  };

  const handleGenerateInvoice = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/invoices/${appointmentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${appointmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    }
  };

  const handleConfirmCancellation = async () => {
    if (!selectedAppointmentId || !cancellationReason.trim()) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/appointments/${selectedAppointmentId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancellationReason,
          cancelledBy: 'client'
        }),
      });

      if (response.ok) {
        await fetchAppointments(); // Refresh the list
        setCancelDialogOpen(false);
        setSelectedAppointmentId(null);
        setCancellationReason('');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  const calendarEvents = convertToCalendarEvents(appointments);

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.dateTime) > new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      no_show: { color: 'bg-red-100 text-red-800', label: 'No Show' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Calendar</h1>
          <p className="text-gray-600 mt-2">View and manage your appointments</p>
        </div>
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Calendar</h1>
        <p className="text-gray-600 mt-2">View and manage your appointments</p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentCalendar
                events={calendarEvents}
                onEditAppointment={handleEditAppointment}
                onCancelAppointment={handleCancelAppointment}
                onRescheduleAppointment={handleRescheduleAppointment}
                onGenerateInvoice={handleGenerateInvoice}
                userRole="client"
                view={selectedView}
                onViewChange={setSelectedView}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No upcoming appointments
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{appointment.service.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(appointment.dateTime), 'EEEE, MMMM do, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(appointment.dateTime), 'h:mm a')}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {appointment.employee.user.name || 'Unknown'}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              £{(appointment.totalPrice || appointment.service.price).toFixed(2)}
                            </div>
                          </div>
                          {((appointment.addons && appointment.addons.length > 0) || 
                            (appointment.appointmentAddons && appointment.appointmentAddons.length > 0)) && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Add-ons: </span>
                              {appointment.addons 
                                ? appointment.addons.map(a => a.name).join(', ')
                                : appointment.appointmentAddons?.map(aa => aa.addon.name).join(', ')
                              }
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(appointment.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateInvoice(appointment.id)}
                          >
                            Invoice
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancellation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this appointment. This will help us improve our service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Cancellation Reason</Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you need to cancel..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Appointment
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancellation}
              disabled={!cancellationReason.trim() || cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
