"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,  DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusCircle, Edit, Trash2, CheckCircle, XCircle, Clock, UserIcon, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { format, parse } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

interface Service {
  id: string;
  title: string;
  price: number;
  duration: number;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Employee {
  id: string;
  user: { name: string | null };
}

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null };
  employee: { id: string; user: { id: string; name: string | null } };
  dateTime: string;
  status: string;
}

interface AppointmentsClientProps {
  initialAppointments: Appointment[];
  services: Service[];
  clients: User[];
  userRole: string;
  employeeId: string | null;
}

export default function AppointmentsClient({
  initialAppointments,
  services,
  clients,
  userRole,
  employeeId,
}: AppointmentsClientProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(employeeId || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

  useEffect(() => {
    if (isPending) return;
    if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    // Fetch employees when service is selected (for admins only)
    const fetchEmployees = async () => {
      if (userRole !== "admin" || !selectedService) return;
      try {
        const response = await fetch(`/api/employees?serviceId=${selectedService}&timezone=${encodeURIComponent(timezone)}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch employees");
        const { employees } = await response.json();
        setEmployees(employees);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };
    fetchEmployees();
  }, [selectedService, timezone, userRole]);

  const handleAddAppointment = async () => {
    if (userRole !== "admin") return;

    try {
      if (!selectedService || !selectedClient || !selectedEmployee || !date || !time) {
        setError("Please fill in all fields.");
        return;
      }

      const dateTime = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
      if (Number.isNaN(dateTime.getTime())) {
        setError("Invalid date or time format.");
        return;
      }

      const utcDateTime = fromZonedTime(dateTime, timezone);

      const response = await fetch(`/api/appointments?timezone=${encodeURIComponent(timezone)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceId: selectedService,
          clientId: selectedClient,
          employeeId: selectedEmployee,
          dateTime: utcDateTime.toISOString(),
          status,
          timezone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add appointment");
      }

      const newAppointment = await response.json();
      setAppointments([...appointments, newAppointment]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to add appointment");
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    if (userRole !== "admin") return;

    setEditingAppointment(appointment);
    const dateTime = new Date(appointment.dateTime);
    setSelectedService(appointment.service.id);
    setSelectedClient(appointment.client.id);
    setSelectedEmployee(appointment.employee.id);
    setDate(format(dateTime, "yyyy-MM-dd"));
    setTime(format(dateTime, "HH:mm"));
    setStatus(appointment.status);
    setIsEditDialogOpen(true);
  };

  const handleUpdateAppointment = async () => {
    if (userRole !== "admin" || !editingAppointment) return;

    try {
      if (!selectedService || !selectedClient || !selectedEmployee || !date || !time) {
        setError("Please fill in all fields.");
        return;
      }

      const dateTime = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
      if (isNaN(dateTime.getTime())) {
        setError("Invalid date or time format.");
        return;
      }

      const utcDateTime = fromZonedTime(dateTime, timezone);

      const response = await fetch(`/api/appointments/${editingAppointment.id}?timezone=${encodeURIComponent(timezone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceId: selectedService,
          clientId: selectedClient,
          employeeId: selectedEmployee,
          dateTime: utcDateTime.toISOString(),
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update appointment");
      }

      const updatedAppointment = await response.json();
      setAppointments(appointments.map((appt) => (appt.id === editingAppointment.id ? updatedAppointment : appt)));
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to update appointment");
    }
  };

  const handleDeleteAppointment = async () => {
    if (userRole !== "admin" || !deletingAppointmentId) return;

    try {
      const response = await fetch(`/api/appointments/${deletingAppointmentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete appointment");
      }

      setAppointments(appointments.filter((appt) => appt.id !== deletingAppointmentId));
      setIsDeleteDialogOpen(false);
      setDeletingAppointmentId(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete appointment");
    }
  };

  const handleToggleStatus = async (appointment: Appointment) => {
    if (userRole !== "admin") return;

    const newStatus = appointment.status === "confirmed" ? "cancelled" : "confirmed";
    try {
      const response = await fetch(`/api/appointments/${appointment.id}?timezone=${encodeURIComponent(timezone)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      const updatedAppointment = await response.json();
      setAppointments(appointments.map((appt) => (appt.id === appointment.id ? updatedAppointment : appt)));
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  const resetForm = () => {
    setSelectedService("");
    setSelectedClient("");
    setSelectedEmployee(userRole === "staff" ? employeeId || "" : "");
    setDate("");
    setTime("");
    setStatus("pending");
    setError(null);
    setEditingAppointment(null);
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {userRole === "admin" ? "Manage Appointments" : "My Appointments"}
          </h1>
          {userRole === "admin" && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white">
              <PlusCircle className="w-4 h-4 mr-2" />
              Add New Appointment
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Appointment List</CardTitle>
            <CardDescription>
              {userRole === "admin" ? "View and manage all client appointments." : "View your assigned appointments."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    {userRole === "admin" && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">{appt.service.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-2" />
                          {appt.client.name || "Unnamed"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-2" />
                          {appt.employee.user.name || "Unnamed"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(new Date(appt.dateTime), "PPP")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {format(new Date(appt.dateTime), "p")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {userRole === "admin" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(appt)}
                            className={
                              appt.status === "confirmed"
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : appt.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }
                          >
                            {appt.status === "confirmed" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {appt.status === "cancelled" && <XCircle className="w-3 h-3 mr-1" />}
                            {appt.status}
                          </Button>
                        ) : (
                          <Badge
                            className={
                              appt.status === "confirmed"
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : appt.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }
                          >
                            {appt.status === "confirmed" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {appt.status === "cancelled" && <XCircle className="w-3 h-3 mr-1" />}
                            {appt.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatPrice(appt.service.price)}</TableCell>
                      {userRole === "admin" && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="mr-2"
                            onClick={() => handleEditAppointment(appt)}
                          >
                            <Edit className="w-4 h-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => {
                              setDeletingAppointmentId(appt.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-slate-600 py-8">No appointments found.</p>
            )}
          </CardContent>
        </Card>

        {userRole === "admin" && (
          <>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Appointment</DialogTitle>
                  <DialogDescription>Schedule a new appointment for a client.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div>
                    <Label>Service</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.title} ({formatPrice(service.price)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name || "Unnamed"} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedService ? "Choose an employee" : "Select a service first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.user.name || "Unnamed"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      step="900"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAppointment} className="bg-teal-700 hover:bg-teal-800">
                      Add Appointment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Appointment</DialogTitle>
                  <DialogDescription>Update the appointment details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div>
                    <Label>Service</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.title} ({formatPrice(service.price)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name || "Unnamed"} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedService ? "Choose an employee" : "Select a service first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.user.name || "Unnamed"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      step="900"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateAppointment} className="bg-teal-700 hover:bg-teal-800">
                      Update Appointment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Appointment</DialogTitle>
                  <DialogDescription>Are you sure you want to delete this appointment? This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAppointment}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}