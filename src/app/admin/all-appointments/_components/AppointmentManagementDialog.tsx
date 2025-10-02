"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	Loader2,
	Shield,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	deleteAppointment,
	updateAppointmentStatus,
} from "@/lib/actions/appointments";
// Removed direct import of risk-updater to avoid browser PrismaClient error
import { formatPrice } from "@/lib/utils";

interface Appointment {
	id: string;
	service: { id: string; title: string; price: number; duration: number };
	client: { id: string; name: string | null; email: string; role: string };
	employee: { id: string; user: { id: string; name: string | null } };
	dateTime: string;
	status: string;
	totalPrice?: number;
	cancelledBy?: string;
	cancelledByRole?: string;
	cancellationReason?: string;
	appointmentAddons?: {
		addon: { id: string; name: string; price: number; duration: number };
	}[];
}

interface CustomerRisk {
	id: string;
	riskLevel: "low" | "medium" | "high" | "very_high";
	riskScore: number;
	totalBookings: number;
	completedBookings: number;
	cancelledBookings: number;
	noShowBookings: number;
	cancellationRate: number;
	noShowRate: number;
	requiresApproval: boolean;
	depositRequired: boolean;
	maxAdvanceBookingDays: number | null;
	adminNotes: string | null;
	lastCalculatedAt: string;
}

interface Employee {
	id: string;
	user: {
		name: string | null;
		email: string;
	};
}

interface AppointmentManagementDialogProps {
	appointment: Appointment | null;
	isOpen: boolean;
	onClose: () => void;
	timezone: string;
}

export default function AppointmentManagementDialog({
	appointment,
	isOpen,
	onClose,
	timezone,
}: AppointmentManagementDialogProps) {
	const [customerRisk, setCustomerRisk] = useState<CustomerRisk | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [cancellationReason, setCancellationReason] = useState("");
	const [showCancellationForm, setShowCancellationForm] = useState(false);
	const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

	const fetchCustomerRisk = useCallback(async () => {
		if (!appointment) return;

		try {
			setIsLoading(true);
			const response = await fetch(
				`/api/risk-assessment/${appointment.client.id}`,
			);
			if (response.ok) {
				const data = await response.json();
				setCustomerRisk(data);
			}
		} catch (error) {
			console.error("Failed to fetch customer risk:", error);
		} finally {
			setIsLoading(false);
		}
	}, [appointment]);

	const fetchAvailableEmployees = useCallback(async () => {
		if (!appointment) return;

		try {
			const response = await fetch(
				`/api/employees?serviceId=${appointment.service.id}`,
			);
			if (response.ok) {
				const data = await response.json();
				setAvailableEmployees(data.employees || []);
				// Set current employee as default selection
				setSelectedEmployeeId(appointment.employee.id);
			}
		} catch (error) {
			console.error("Failed to fetch available employees:", error);
		}
	}, [appointment]);

	// Fetch customer risk data and available employees when appointment changes
	useEffect(() => {
		if (appointment && isOpen) {
			fetchCustomerRisk();
			fetchAvailableEmployees();
		}
	}, [appointment, isOpen, fetchCustomerRisk, fetchAvailableEmployees]);

	const handleStatusUpdate = async (newStatus: string) => {
		if (!appointment) return;

		try {
			setIsUpdating(true);
			setError(null);

			if (newStatus === "cancelled") {
				setShowCancellationForm(true);
				return;
			}

			await updateAppointmentStatus(appointment.id, newStatus);
			
			// Refresh risk data in dialog
			await fetchCustomerRisk();
			
			onClose();
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "Failed to update appointment",
			);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleCancellation = async () => {
		if (!appointment || !cancellationReason.trim()) return;

		try {
			setIsUpdating(true);
			setError(null);

			await updateAppointmentStatus(
				appointment.id,
				"cancelled",
				cancellationReason,
			);
			
			// Refresh risk data in dialog
			await fetchCustomerRisk();
			
			setShowCancellationForm(false);
			setCancellationReason("");
			onClose();
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "Failed to cancel appointment",
			);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDelete = async () => {
		if (!appointment) return;

		if (
			!confirm("Are you sure you want to permanently delete this appointment?")
		) {
			return;
		}

		try {
			setIsUpdating(true);
			setError(null);

			await deleteAppointment(appointment.id);
			onClose();
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "Failed to delete appointment",
			);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleEmployeeChange = async (newEmployeeId: string) => {
		if (!appointment || newEmployeeId === appointment.employee.id) return;

		try {
			setIsUpdating(true);
			setError(null);

			const response = await fetch(`/api/appointments/${appointment.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ employeeId: newEmployeeId }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update employee assignment");
			}

			setSelectedEmployeeId(newEmployeeId);
			// Refresh the page to update the appointment data
			window.location.reload();
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err.message : "Failed to update employee assignment",
			);
		} finally {
			setIsUpdating(false);
		}
	};

	const getRiskLevelColor = (level: string) => {
		switch (level) {
			case "low":
				return "bg-green-100 text-green-800";
			case "medium":
				return "bg-yellow-100 text-yellow-800";
			case "high":
				return "bg-orange-100 text-orange-800";
			case "very_high":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getRiskLevelIcon = (level: string) => {
		switch (level) {
			case "low":
				return <CheckCircle className="h-4 w-4" />;
			case "medium":
				return <Clock className="h-4 w-4" />;
			case "high":
				return <AlertTriangle className="h-4 w-4" />;
			case "very_high":
				return <XCircle className="h-4 w-4" />;
			default:
				return <Shield className="h-4 w-4" />;
		}
	};

	if (!appointment) return null;

	const appointmentTime = toZonedTime(new Date(appointment.dateTime), timezone);
	const totalPrice = appointment.totalPrice || appointment.service.price;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="md:max-w-5xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="w-5 h-5" />
						Appointment Management
					</DialogTitle>
					<DialogDescription>
						Manage appointment status and view customer risk information
					</DialogDescription>
				</DialogHeader>

				{error && (
					<Alert className="border-red-200 bg-red-50">
						<AlertTriangle className="h-4 w-4 text-red-600" />
						<AlertDescription className="text-red-800">
							{error}
						</AlertDescription>
					</Alert>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Appointment Details */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Appointment Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<Label className="text-gray-500">Service</Label>
									<p className="font-medium">{appointment.service.title}</p>
								</div>
								<div>
									<Label className="text-gray-500">Duration</Label>
									<p className="font-medium">
										{appointment.service.duration} min
									</p>
								</div>
								<div>
									<Label className="text-gray-500">Staff</Label>
									<Select
										value={selectedEmployeeId}
										onValueChange={handleEmployeeChange}
										disabled={isUpdating}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select technician" />
										</SelectTrigger>
										<SelectContent>
											{availableEmployees.map((employee) => (
												<SelectItem key={employee.id} value={employee.id}>
													{employee.user.name || "Unknown"}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-gray-500">Date & Time</Label>
									<p className="font-medium">
										{format(appointmentTime, "PPP 'at' p")}
									</p>
								</div>
								<div>
									<Label className="text-gray-500">Status</Label>
									<Badge
										className={
											appointment.status === "confirmed"
												? "bg-green-100 text-green-800"
												: appointment.status === "pending"
													? "bg-yellow-100 text-yellow-800"
													: "bg-red-100 text-red-800"
										}
									>
										{appointment.status.toUpperCase()}
									</Badge>
								</div>
								<div>
									<Label className="text-gray-500">Total Price</Label>
									<p className="font-medium">{formatPrice(totalPrice)}</p>
								</div>
							</div>

							{/* Add-ons */}
							{appointment.appointmentAddons &&
								appointment.appointmentAddons.length > 0 && (
									<div>
										<Label className="text-gray-500">Add-ons</Label>
										<div className="mt-1 space-y-1">
											{appointment.appointmentAddons.map((aa) => (
												<div
													key={aa.addon.id}
													className="flex justify-between text-sm"
												>
													<span>+ {aa.addon.name}</span>
													<span>{formatPrice(aa.addon.price)}</span>
												</div>
											))}
											<div className="flex justify-between text-sm font-medium border-t pt-1">
												<span>Total</span>
												<span>{formatPrice(totalPrice)}</span>
											</div>
										</div>
									</div>
								)}

							{/* Cancellation Info */}
							{appointment.status === "cancelled" && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
									<Label className="text-red-800 font-medium">
										Cancellation Details
									</Label>
									<div className="text-sm text-red-700 mt-1">
										<p>
											<strong>Cancelled by:</strong>{" "}
											{appointment.cancelledByRole}
										</p>
										{appointment.cancellationReason && (
											<p>
												<strong>Reason:</strong>{" "}
												{appointment.cancellationReason}
											</p>
										)}
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Customer Risk Assessment */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								<Shield className="w-5 h-5" />
								Customer Risk Assessment
								{isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="w-6 h-6 animate-spin" />
									<span className="ml-2">Loading risk data...</span>
								</div>
							) : customerRisk ? (
								<div className="space-y-4">
									{/* Risk Level */}
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-500">Risk Level</span>
										<div className="flex items-center gap-2">
											<Badge
												className={getRiskLevelColor(customerRisk.riskLevel)}
											>
												{getRiskLevelIcon(customerRisk.riskLevel)}
												<span className="ml-1 capitalize">
													{customerRisk.riskLevel.replace("_", " ")}
												</span>
											</Badge>
											<span className="text-sm font-medium">
												({customerRisk.riskScore}/100)
											</span>
										</div>
									</div>

									{/* Risk Metrics */}
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<Label className="text-gray-500">Total Bookings</Label>
											<p className="font-medium">
												{customerRisk.totalBookings}
											</p>
										</div>
										<div>
											<Label className="text-gray-500">Completed</Label>
											<p className="font-medium text-green-600">
												{customerRisk.completedBookings}
											</p>
										</div>
										<div>
											<Label className="text-gray-500">Cancelled</Label>
											<p className="font-medium text-red-600">
												{customerRisk.cancelledBookings}
											</p>
										</div>
										<div>
											<Label className="text-gray-500">No Shows</Label>
											<p className="font-medium text-red-600">
												{customerRisk.noShowBookings}
											</p>
										</div>
										<div>
											<Label className="text-gray-500">Cancellation Rate</Label>
											<p className="font-medium">
												{(customerRisk.cancellationRate * 100).toFixed(1)}%
											</p>
										</div>
										<div>
											<Label className="text-gray-500">No-Show Rate</Label>
											<p className="font-medium">
												{(customerRisk.noShowRate * 100).toFixed(1)}%
											</p>
										</div>
									</div>

									{/* Risk Mitigation */}
									{(customerRisk.requiresApproval ||
										customerRisk.depositRequired ||
										customerRisk.maxAdvanceBookingDays) && (
										<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
											<Label className="text-yellow-800 font-medium">
												Active Restrictions
											</Label>
											<div className="flex flex-wrap gap-2 mt-1">
												{customerRisk.requiresApproval && (
													<Badge
														variant="outline"
														className="text-yellow-700 border-yellow-300"
													>
														Requires Approval
													</Badge>
												)}
												{customerRisk.depositRequired && (
													<Badge
														variant="outline"
														className="text-yellow-700 border-yellow-300"
													>
														Deposit Required
													</Badge>
												)}
												{customerRisk.maxAdvanceBookingDays && (
													<Badge
														variant="outline"
														className="text-yellow-700 border-yellow-300"
													>
														Max {customerRisk.maxAdvanceBookingDays} days
														advance
													</Badge>
												)}
											</div>
										</div>
									)}

									{/* Admin Notes */}
									{customerRisk.adminNotes && (
										<div>
											<Label className="text-gray-500">Admin Notes</Label>
											<p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">
												{customerRisk.adminNotes}
											</p>
										</div>
									)}
								</div>
							) : (
								<p className="text-gray-500 text-center py-4">
									No risk data available
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Action Buttons */}
				<div className="flex justify-between pt-6 border-t">
					<div className="flex gap-2">
						{appointment.status === "pending" && (
							<Button
								onClick={() => handleStatusUpdate("confirmed")}
								disabled={isUpdating}
								className="bg-green-600 hover:bg-green-700"
							>
								<CheckCircle className="w-4 h-4 mr-2" />
								Approve
							</Button>
						)}
						{appointment.status !== "cancelled" && (
							<Button
								onClick={() => handleStatusUpdate("cancelled")}
								disabled={isUpdating}
								variant="destructive"
							>
								<XCircle className="w-4 h-4 mr-2" />
								Cancel
							</Button>
						)}
						<Button
							onClick={handleDelete}
							disabled={isUpdating}
							variant="outline"
							className="text-red-600 border-red-300 hover:bg-red-50"
						>
							<XCircle className="w-4 h-4 mr-2" />
							Delete
						</Button>
					</div>
					<Button onClick={onClose} variant="outline" disabled={isUpdating}>
						Close
					</Button>
				</div>

				{/* Cancellation Form */}
				{showCancellationForm && (
					<div className="mt-6 p-4 border border-red-200 rounded-lg bg-red-50">
						<Label className="text-red-800 font-medium">
							Cancellation Reason
						</Label>
						<Textarea
							value={cancellationReason}
							onChange={(e) => setCancellationReason(e.target.value)}
							placeholder="Enter reason for cancellation..."
							className="mt-2"
							rows={3}
						/>
						<div className="flex gap-2 mt-3">
							<Button
								onClick={handleCancellation}
								disabled={isUpdating || !cancellationReason.trim()}
								className="bg-red-600 hover:bg-red-700"
							>
								{isUpdating ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<XCircle className="w-4 h-4 mr-2" />
								)}
								Confirm Cancellation
							</Button>
							<Button
								onClick={() => setShowCancellationForm(false)}
								variant="outline"
								disabled={isUpdating}
							>
								Cancel
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
