"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { toZonedTime,  } from "date-fns-tz";
import { Calendar, Clock, UserIcon, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import { formatPrice } from "@/lib/utils";

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null };
  employee: { id: string; user: { id: string; name: string | null } };
  dateTime: string;
  status: string;
}

interface AllAppointmentsClientProps {
  initialAppointments: Appointment[];
  userRole: string;
}

export default function AllAppointmentsClient({
  initialAppointments,
}: AllAppointmentsClientProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

  useEffect(() => {
    if (isPending) return;
    if (!session || session.user.role !== "admin") {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}?timezone=${encodeURIComponent(timezone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update appointment status");
      }

      const updatedAppointment = await response.json();
      setAppointments(
        appointments.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: updatedAppointment.status } : appt
        )
      );
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to update appointment status");
    }
  };

  const filteredAppointments = selectedDate
    ? appointments.filter((appt) => {
        const apptDate = toZonedTime(new Date(appt.dateTime), timezone);
        return isSameDay(apptDate, selectedDate);
      })
    : appointments;

  const clearFilter = () => {
    setSelectedDate(null);
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 text-lg font-medium">Loading...</p>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null; // Redirect handled by useEffect
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">All Appointments</h1>
            <div className="flex gap-4 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`${
                      selectedDate ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-white text-teal-700 border-teal-300"
                    } transition-colors shadow-sm`}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    {selectedDate ? format(selectedDate, "PPP") : "Filter by Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white rounded-xl shadow-lg">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={(date) => setSelectedDate(date || null)}
                    className="rounded-md border-none"
                  />
                </PopoverContent>
              </Popover>
              {selectedDate && (
                <Button
                  onClick={clearFilter}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors shadow-sm"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </div>

          <Card className="bg-white rounded-xl shadow-md border-none">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-slate-900">
                {selectedDate ? `Appointments for ${format(selectedDate, "PPP")}` : "All Appointments"}
              </CardTitle>
              <CardDescription className="text-slate-600">
                {selectedDate
                  ? `Appointments scheduled for ${format(selectedDate, "PPP")}.`
                  : "View and manage all scheduled appointments."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="text-red-500 text-sm font-medium mb-4">{error}</p>}
              {filteredAppointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-slate-50">
                      <TableHead className="text-slate-900 font-semibold">Service</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Client</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Employee</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Date</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Time</TableHead>
                      <TableHead className="text-slate-900 font-semibold">Status</TableHead>
                      <TableHead className="text-right text-slate-900 font-semibold">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appt) => (
                      <TableRow key={appt.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-800">{appt.service.title}</TableCell>
                        <TableCell className="text-slate-600">
                          <div className="flex items-center">
                            <UserIcon className="w-4 h-4 mr-2 text-teal-600" />
                            {appt.client.name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          <div className="flex items-center">
                            <Briefcase className="w-4 h-4 mr-2 text-teal-600" />
                            {appt.employee.user.name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-teal-600" />
                            {format(toZonedTime(new Date(appt.dateTime), timezone), "PPP")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-teal-600" />
                            {format(toZonedTime(new Date(appt.dateTime), timezone), "p")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Select
                                  value={appt.status}
                                  onValueChange={(value) => handleStatusChange(appt.id, value)}
                                >
                                  <SelectTrigger className="w-[120px] uppercase bg-white border-slate-300">
                                    <SelectValue>
                                      <Badge
                                        className={
                                          appt.status === "confirmed"
                                            ? "bg-green-100 text-green-800"
                                            : appt.status === "pending"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                        }
                                      >
                                        {appt.status}
                                      </Badge>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Update appointment status</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">
                          {formatPrice(appt.service.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-slate-600 py-8 text-lg">
                  {selectedDate ? "No appointments scheduled for this date." : "No appointments found."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}