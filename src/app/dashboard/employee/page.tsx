import { PrismaClient } from "@/generated/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { formatPrice } from "@/lib/utils";
import { getSession } from "@/lib/session";

interface Service {
  id: string;
  title: string;
  price: number;
  duration: number;
}

interface Client {
  id: string;
  name: string | null;
  email: string;
}

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null; email: string };
  dateTime: Date;
  status: string;
}

interface Employee {
  id: string;
  serviceEmployees: { service: Service }[];
  appointments: Appointment[];
}

export default async function EmployeeDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== "staff") {
    return {
      redirect: {
        destination: "/sign-in",
        permanent: false,
      },
    };
  }

  const prisma = new PrismaClient();
  const timezone = "Europe/London"; // Fallback, could use Intl.DateTimeFormat().resolvedOptions().timeZone

  try {
    const now = new Date();
    const todayStart = startOfDay(fromZonedTime(now, timezone));
    const todayEnd = endOfDay(fromZonedTime(now, timezone));

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      include: {
        serviceEmployees: { include: { service: { select: { id: true, title: true, price: true, duration: true } } } },
        appointments: {
          include: {
            service: { select: { id: true, title: true, price: true, duration: true } },
            client: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!employee) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Not an Employee</CardTitle>
              <CardDescription>You are not registered as an employee.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    const todayAppointments = employee.appointments.filter((appt) => {
      const apptDate = toZonedTime(appt.dateTime, timezone);
      return apptDate >= todayStart && apptDate <= todayEnd;
    });

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Employee Dashboard</h1>

          {/* Assigned Services */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Assigned Services</CardTitle>
              <CardDescription>Your assigned services and their details.</CardDescription>
            </CardHeader>
            <CardContent>
              {employee.serviceEmployees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {employee.serviceEmployees.map((se) => (
                    <Badge key={se.service.id} variant="secondary" className="text-sm">
                      {se.service.title} ({formatPrice(se.service.price)})
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600">No services assigned.</p>
              )}
            </CardContent>
          </Card>

          {/* Today's Appointments */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Today’s Appointments</CardTitle>
              <CardDescription>Appointments scheduled for today, {format(todayStart, "PPP")}.</CardDescription>
            </CardHeader>
            <CardContent>
              {todayAppointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Client</TableHead>
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
                            {appt.client.name || appt.client.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {format(toZonedTime(appt.dateTime, timezone), "p")}
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

          {/* All Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>Your scheduled appointments.</CardDescription>
            </CardHeader>
            <CardContent>
              {employee.appointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employee.appointments.map((appt) => (
                      <TableRow key={appt.id}>
                        <TableCell className="font-medium">{appt.service.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            {appt.client.name || appt.client.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {format(toZonedTime(appt.dateTime, timezone), "PPP")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {format(toZonedTime(appt.dateTime, timezone), "p")}
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
  } catch (error) {
    console.error("Failed to fetch employee data:", error);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load employee data. Please try again later.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  } finally {
    await prisma.$disconnect();
  }
}