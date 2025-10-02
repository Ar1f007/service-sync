"use client";

import { format } from "date-fns";
import { Calendar, Clock, DollarSign, Filter, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppointmentCalendar, {
	type CalendarEvent,
} from "@/components/calendar/AppointmentCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Appointment {
	id: string;
	service: { title: string; price: number; duration: number };
	client: { name: string | null; email: string };
	employee: { user: { name: string | null } };
	dateTime: string;
	status: string;
	totalPrice?: number;
	appointmentAddons: Array<{ addon: { name: string; price: number } }>;
}

export default function AdminCalendarClient() {
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedView, setSelectedView] = useState<"month" | "week" | "day">(
		"month",
	);
	const [statusDialogOpen, setStatusDialogOpen] = useState(false);
	const [selectedAppointmentId, setSelectedAppointmentId] = useState<
		string | null
	>(null);
	const [newStatus, setNewStatus] = useState("");
	const [adminNotes, setAdminNotes] = useState("");
	const [updating, setUpdating] = useState(false);
	const [statusFilter, setStatusFilter] = useState("all");
	const [employeeFilter, setEmployeeFilter] = useState("all");
	const router = useRouter();

	// biome-ignore lint/correctness/useExhaustiveDependencies: <noneed>
	useEffect(() => {
		fetchAppointments();
	}, []);

	const fetchAppointments = async () => {
		try {
			const response = await fetch("/api/appointments");
			if (response.ok) {
				const data = await response.json();
				setAppointments(data.appointments || []);
			}
		} catch (error) {
			console.error("Error fetching appointments:", error);
		} finally {
			setLoading(false);
		}
	};

	const convertToCalendarEvents = (
		appointments: Appointment[],
	): CalendarEvent[] => {
		return appointments.map((appointment) => {
			const startDate = new Date(appointment.dateTime);
			const endDate = new Date(
				startDate.getTime() + appointment.service.duration * 60000,
			);

			return {
				id: appointment.id,
				title: `${appointment.service.title} - ${appointment.client.name || "Unknown"}`,
				start: startDate,
				end: endDate,
				resource: {
					appointmentId: appointment.id,
					status: appointment.status,
					clientName: appointment.client.name || "Unknown",
					serviceName: appointment.service.title,
					employeeName: appointment.employee.user.name || "Unknown",
					totalPrice: appointment.totalPrice || appointment.service.price,
					addons: appointment.appointmentAddons?.map((aa) => ({
						name: aa.addon.name,
						price: aa.addon.price,
					})) || [],
				},
			};
		});
	};

	const handleEditAppointment = (appointmentId: string) => {
		router.push(`/admin/appointments/${appointmentId}/edit`);
	};

	const handleCancelAppointment = (appointmentId: string) => {
		setSelectedAppointmentId(appointmentId);
		setNewStatus("cancelled");
		setStatusDialogOpen(true);
	};

	const handleRescheduleAppointment = (appointmentId: string) => {
		router.push(`/admin/appointments/${appointmentId}/reschedule`);
	};

	const handleGenerateInvoice = async (appointmentId: string) => {
		try {
			const response = await fetch(`/api/invoices/${appointmentId}`);
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `invoice-${appointmentId}.pdf`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			} else {
				alert("Failed to generate invoice");
			}
		} catch (error) {
			console.error("Error generating invoice:", error);
			alert("Failed to generate invoice");
		}
	};

	const handleStatusChange = async () => {
		if (!selectedAppointmentId || !newStatus) return;

		setUpdating(true);
		try {
			const response = await fetch(
				`/api/appointments/${selectedAppointmentId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						status: newStatus,
						adminNotes: adminNotes.trim() || undefined,
						cancelledBy: newStatus === "cancelled" ? "admin" : undefined,
						cancellationReason:
							newStatus === "cancelled"
								? adminNotes.trim() || "Cancelled by admin"
								: undefined,
					}),
				},
			);

			if (response.ok) {
				await fetchAppointments(); // Refresh the list
				setStatusDialogOpen(false);
				setSelectedAppointmentId(null);
				setNewStatus("");
				setAdminNotes("");
			} else {
				const error = await response.json();
				alert(error.message || "Failed to update appointment");
			}
		} catch (error) {
			console.error("Error updating appointment:", error);
			alert("Failed to update appointment");
		} finally {
			setUpdating(false);
		}
	};

	const filteredAppointments = appointments.filter((appointment) => {
		if (statusFilter !== "all" && appointment.status !== statusFilter)
			return false;
		if (
			employeeFilter !== "all" &&
			appointment.employee.user.name !== employeeFilter
		)
			return false;
		return true;
	});

	const calendarEvents = convertToCalendarEvents(filteredAppointments);

	const todayAppointments = appointments
		.filter((apt) => {
			const aptDate = new Date(apt.dateTime);
			const today = new Date();
			return aptDate.toDateString() === today.toDateString();
		})
		.sort(
			(a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
		);

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			confirmed: { color: "bg-green-100 text-green-800", label: "Confirmed" },
			pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
			cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
			completed: { color: "bg-gray-100 text-gray-800", label: "Completed" },
			no_show: { color: "bg-red-100 text-red-800", label: "No Show" },
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
		return <Badge className={config.color}>{config.label}</Badge>;
	};

	const uniqueEmployees = Array.from(
		new Set(appointments.map((apt) => apt.employee.user.name).filter(Boolean)),
	);

	if (loading) {
		return (
			<div className="container mx-auto py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">Admin Calendar</h1>
					<p className="text-gray-600 mt-2">
						Manage all appointments and staff schedules
					</p>
				</div>
				<div className="text-center">Loading...</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Admin Calendar</h1>
				<p className="text-gray-600 mt-2">
					Manage all appointments and staff schedules
				</p>
			</div>

			{/* Filters */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<div className="flex-1">
							<Label htmlFor="status-filter">Status</Label>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger>
									<SelectValue placeholder="All statuses" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="confirmed">Confirmed</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="cancelled">Cancelled</SelectItem>
									<SelectItem value="no_show">No Show</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1">
							<Label htmlFor="employee-filter">Employee</Label>
							<Select value={employeeFilter} onValueChange={setEmployeeFilter}>
								<SelectTrigger>
									<SelectValue placeholder="All employees" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Employees</SelectItem>
									{uniqueEmployees.map((employee) => (
										<SelectItem key={employee} value={employee || ""}>
											{employee}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			<Tabs defaultValue="calendar" className="space-y-6">
				<TabsList>
					<TabsTrigger value="calendar">Calendar View</TabsTrigger>
					<TabsTrigger value="today">Today's Appointments</TabsTrigger>
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
								userRole="admin"
								view={selectedView}
								onViewChange={setSelectedView}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="today">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Today's Appointments ({todayAppointments.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							{todayAppointments.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									No appointments scheduled for today
								</div>
							) : (
								<div className="space-y-4">
									{todayAppointments.map((appointment) => (
										<div key={appointment.id} className="border rounded-lg p-4">
											<div className="flex justify-between items-start">
												<div className="space-y-2">
													<h3 className="font-semibold text-lg">
														{appointment.service.title}
													</h3>
													<div className="flex items-center gap-4 text-sm text-gray-600">
														<div className="flex items-center gap-1">
															<User className="h-4 w-4" />
															{appointment.client.name || "Unknown"}
														</div>
														<div className="flex items-center gap-1">
															<Clock className="h-4 w-4" />
															{format(new Date(appointment.dateTime), "h:mm a")}
														</div>
														<div className="flex items-center gap-1">
															<User className="h-4 w-4" />
															{appointment.employee.user.name || "Unknown"}
														</div>
														<div className="flex items-center gap-1">
															<DollarSign className="h-4 w-4" />£
															{(
																appointment.totalPrice ||
																appointment.service.price
															).toFixed(2)}
														</div>
													</div>
													{appointment.appointmentAddons?.length > 0 && (
														<div className="text-sm text-gray-600">
															<span className="font-medium">Add-ons: </span>
															{appointment.appointmentAddons
																.map((aa) => aa.addon.name)
																.join(", ")}
														</div>
													)}
												</div>
												<div className="flex items-center gap-2">
													{getStatusBadge(appointment.status)}
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															handleGenerateInvoice(appointment.id)
														}
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

			{/* Status Change Dialog */}
			<Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update Appointment Status</DialogTitle>
						<DialogDescription>
							Change the status of this appointment and add any admin notes.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="status">New Status</Label>
							<Select value={newStatus} onValueChange={setNewStatus}>
								<SelectTrigger>
									<SelectValue placeholder="Select status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="confirmed">Confirmed</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
									<SelectItem value="cancelled">Cancelled</SelectItem>
									<SelectItem value="no_show">No Show</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="notes">Admin Notes</Label>
							<Textarea
								id="notes"
								placeholder="Add any notes about this appointment..."
								value={adminNotes}
								onChange={(e) => setAdminNotes(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setStatusDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleStatusChange}
							disabled={!newStatus || updating}
						>
							{updating ? "Updating..." : "Update Status"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
