import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from 'lucide-react';
import { format, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { formatPrice } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getClientAppointments } from "@/lib/data/my-appointments";

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null };
  employee: { id: string; user: { id: string; name: string } };
  dateTime: string;
  status: string;
}

export default async function ClientAppointmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

  const appointments: Appointment[] = await getClientAppointments(session.user.id, timezone);

  const todayStart = startOfDay(fromZonedTime(new Date(), timezone));
  const todayEnd = endOfDay(fromZonedTime(new Date(), timezone));

  const todayAppointments = appointments.filter((appt) => {
    const apptDate = toZonedTime(new Date(appt.dateTime), timezone);
    return apptDate >= todayStart && apptDate <= todayEnd;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">My Appointments</h1>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Today’s Appointments</CardTitle>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">{appt.service.title}</TableCell>
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
                              : "bg-red-100 text-red-800"
                          }
                          style={{ textTransform : "uppercase" }}
                        >
                          {appt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatPrice(appt.service.price)}</TableCell>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">{appt.service.title}</TableCell>
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
                              : "bg-red-100 text-red-800"
                          }
                           style={{ textTransform : "uppercase" }}
                        >
                          {appt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatPrice(appt.service.price)}</TableCell>
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
