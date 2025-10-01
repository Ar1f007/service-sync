'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { formatPrice } from "@/lib/utils";
import CancelAppointmentDialog from "@/components/CancelAppointmentDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null };
  employee: { id: string; user: { id: string; name: string } };
  dateTime: string;
  status: string;
  totalPrice?: number;
  addons?: { id: string; name: string; price: number; duration: number }[];
}

interface ClientAppointmentsClientProps {
  initialAppointments: Appointment[];
  timezone: string;
}

export default function ClientAppointmentsClient({ 
  initialAppointments, 
  timezone 
}: ClientAppointmentsClientProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStart = startOfDay(fromZonedTime(new Date(), timezone));
  const todayEnd = endOfDay(fromZonedTime(new Date(), timezone));

  const todayAppointments = appointments.filter((appt) => {
    const apptDate = toZonedTime(new Date(appt.dateTime), timezone);
    return apptDate >= todayStart && apptDate <= todayEnd;
  });

  const canCancelAppointment = (appointment: Appointment) => {
    const now = new Date();
    const appointmentTime = new Date(appointment.dateTime);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Can cancel if:
    // 1. Status is pending, confirmed, or waitlist-waiting
    // 2. Appointment is in the future
    // 3. At least 2 hours notice (configurable)
    return (appointment.status === 'pending' || 
            appointment.status === 'confirmed' || 
            appointment.status === 'waitlist-waiting') && 
           appointmentTime > now && 
           hoursUntilAppointment >= 2;
  };

  const handleCancelAppointment = async (appointmentId: string, reason: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if this is a waitlist entry
      const isWaitlistEntry = appointmentId.startsWith('waitlist-');
      const actualId = isWaitlistEntry ? appointmentId.replace('waitlist-', '') : appointmentId;

      let response: Response;
      if (isWaitlistEntry) {
        // Cancel waitlist entry
        response = await fetch(`/api/waitlist/${actualId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        });
      } else {
        // Cancel regular appointment
        response = await fetch(`/api/appointments/${actualId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ reason }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }

      // Update the appointment in the local state
      setAppointments(prev => 
        prev.map(appt => 
          appt.id === appointmentId 
            ? { ...appt, status: 'cancelled' }
            : appt
        )
      );

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/appointments?client=true', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh appointments');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Appointments</h1>
          <Button
            onClick={refreshAppointments}
            disabled={isLoading}
            variant="outline"
            className="bg-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>
              Your appointments scheduled for today, {format(todayStart, "PPP")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayAppointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{appt.service.title}</div>
                          {appt.addons && appt.addons.length > 0 && (
                            <div className="text-sm text-slate-500 mt-1">
                              {appt.addons.map(addon => (
                                <div key={addon.id}>+ {addon.name}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {appt.employee.user.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {format(toZonedTime(new Date(appt.dateTime), timezone), "p")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            appt.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : appt.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : appt.status === "waitlist-waiting"
                              ? "bg-blue-100 text-blue-800"
                              : appt.status === "waitlist-notified"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }
                          style={{ textTransform: "uppercase" }}
                        >
                          {appt.status.startsWith('waitlist-') 
                            ? `Waitlist (${appt.status.replace('waitlist-', '')})`
                            : appt.status
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(appt.totalPrice || appt.service.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        {canCancelAppointment(appt) && (
                          <CancelAppointmentDialog
                            onCancel={(reason) => handleCancelAppointment(appt.id, reason)}
                            disabled={isLoading}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-slate-600 text-center py-4">No appointments scheduled for today.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Appointments</CardTitle>
            <CardDescription>Your scheduled appointments.</CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{appt.service.title}</div>
                          {appt.addons && appt.addons.length > 0 && (
                            <div className="text-sm text-slate-500 mt-1">
                              {appt.addons.map(addon => (
                                <div key={addon.id}>+ {addon.name}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {appt.employee.user.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(toZonedTime(new Date(appt.dateTime), timezone), "PPP")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {format(toZonedTime(new Date(appt.dateTime), timezone), "p")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            appt.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : appt.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : appt.status === "waitlist-waiting"
                              ? "bg-blue-100 text-blue-800"
                              : appt.status === "waitlist-notified"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                          }
                          style={{ textTransform: "uppercase" }}
                        >
                          {appt.status.startsWith('waitlist-') 
                            ? `Waitlist (${appt.status.replace('waitlist-', '')})`
                            : appt.status
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(appt.totalPrice || appt.service.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        {canCancelAppointment(appt) && (
                          <CancelAppointmentDialog
                            onCancel={(reason) => handleCancelAppointment(appt.id, reason)}
                            disabled={isLoading}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-slate-600 text-center py-4">No appointments scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
