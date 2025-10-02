"use client";

import { format, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Briefcase, Calendar, ClockIcon, Eye, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { formatPrice } from "@/lib/utils";
import AppointmentManagementDialog from "./AppointmentManagementDialog";

interface Appointment {
	id: string;
	service: { id: string; title: string; price: number; duration: number };
	client: { id: string; name: string | null; email: string; role: string };
	employee: { id: string; user: { id: string; name: string | null } };
	dateTime: string;
	status: string;
	totalPrice: number;
	addons: { id: string; name: string; price: number; duration: number }[];
	cancelledBy?: string;
	cancelledByRole?: string;
	cancellationReason?: string;
	appointmentAddons?: {
		addon: { id: string; name: string; price: number; duration: number };
	}[];
}

interface AllAppointmentsClientProps {
	initialAppointments: Appointment[];
	initialTotal: number;
	initialTotalPages: number;
	initialPage: number;
	initialLimit: number;
	userRole: string;
}

export default function AllAppointmentsClient({
	initialAppointments,
	initialTotal,
	initialTotalPages,
	initialPage,
	initialLimit,
}: AllAppointmentsClientProps) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [appointments, setAppointments] =
		useState<Appointment[]>(initialAppointments);
	const [total, setTotal] = useState(initialTotal);
	const [totalPages, setTotalPages] = useState(initialTotalPages);
	const [currentPage, setCurrentPage] = useState(initialPage);
	const [limit, setLimit] = useState(initialLimit);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedAppointment, setSelectedAppointment] =
		useState<Appointment | null>(null);
	const [isManagementDialogOpen, setIsManagementDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const timezone =
		Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

	useEffect(() => {
		if (isPending) return;
		if (!session || session.user.role !== "admin") {
			router.push("/sign-in");
		}
	}, [session, isPending, router]);

	const fetchAppointments = async (page: number, pageLimit: number) => {
		try {
			setIsLoading(true);
			const response = await fetch(
				`/api/admin/appointments?page=${page}&limit=${pageLimit}`,
				{
					credentials: "include",
				}
			);

			if (!response.ok) {
				throw new Error("Failed to fetch appointments");
			}

			const data = await response.json();
			setAppointments(data.appointments);
			setTotal(data.total);
			setTotalPages(data.totalPages);
			setCurrentPage(page);
			setLimit(pageLimit);
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to fetch appointments",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handlePageChange = (newPage: number) => {
		if (newPage >= 1 && newPage <= totalPages) {
			fetchAppointments(newPage, limit);
		}
	};

	const handleLimitChange = (newLimit: number) => {
		fetchAppointments(1, newLimit);
	};

	const handleStatusChange = async (
		appointmentId: string,
		newStatus: string,
	) => {
		try {
			const response = await fetch(
				`/api/appointments/${appointmentId}?timezone=${encodeURIComponent(timezone)}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ status: newStatus }),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error || "Failed to update appointment status",
				);
			}

			const updatedAppointment = await response.json();
			setAppointments(
				appointments.map((appt) =>
					appt.id === appointmentId
						? { ...appt, status: updatedAppointment.status }
						: appt,
				),
			);
			setError(null);
			
			// Refresh the page to update risk assessments
			window.location.reload();
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to update appointment status",
			);
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
						<h1 className="text-4xl font-bold text-slate-900 tracking-tight">
							All Appointments
						</h1>
						<div className="flex gap-4 items-center">
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={`${
											selectedDate
												? "bg-teal-700 text-white hover:bg-teal-800"
												: "bg-white text-teal-700 border-teal-300"
										} transition-colors shadow-sm`}
									>
										<Calendar className="w-5 h-5 mr-2" />
										{selectedDate
											? format(selectedDate, "PPP")
											: "Filter by Date"}
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
								{selectedDate
									? `Appointments for ${format(selectedDate, "PPP")}`
									: "All Appointments"}
							</CardTitle>
							<CardDescription className="text-slate-600">
								{selectedDate
									? `Appointments scheduled for ${format(selectedDate, "PPP")}.`
									: "View and manage all scheduled appointments."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{error && (
								<p className="text-red-500 text-sm font-medium mb-4">{error}</p>
							)}
							{filteredAppointments.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-slate-50">
											<TableHead className="text-slate-900 font-semibold">
												Service
											</TableHead>
											<TableHead className="text-slate-900 font-semibold">
												Client
											</TableHead>
											<TableHead className="text-slate-900 font-semibold">
												Employee
											</TableHead>
											<TableHead className="text-slate-900 font-semibold">
												Date
											</TableHead>
											<TableHead className="text-slate-900 font-semibold">
												Time
											</TableHead>
											<TableHead className="text-slate-900 font-semibold">
												Status
											</TableHead>
											<TableHead className="text-right text-slate-900 font-semibold">
												Total Price
											</TableHead>
											<TableHead className="text-center text-slate-900 font-semibold">
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredAppointments.map((appt) => (
											<TableRow
												key={appt.id}
												className="hover:bg-slate-50 transition-colors"
											>
												<TableCell className="font-medium text-slate-800">
													<div>
														<div className="font-semibold">
															{appt.service.title}
														</div>
														{appt.addons.length > 0 && (
															<div className="text-sm text-slate-500 mt-1">
																<div className="font-medium text-slate-600 mb-1">
																	Add-ons:
																</div>
																{appt.addons.map((addon) => (
																	<div
																		key={addon.id}
																		className="flex justify-between items-center"
																	>
																		<span>+ {addon.name}</span>
																		<span className="text-slate-600">
																			+{formatPrice(addon.price)}
																		</span>
																	</div>
																))}
															</div>
														)}
													</div>
												</TableCell>
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
														{format(
															toZonedTime(new Date(appt.dateTime), timezone),
															"PPP",
														)}
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center">
														<ClockIcon className="w-4 h-4 mr-2 text-teal-600" />
														{format(
															toZonedTime(new Date(appt.dateTime), timezone),
															"p",
														)}
													</div>
												</TableCell>
												<TableCell>
													<TooltipProvider>
														<Tooltip>
															<TooltipTrigger asChild>
																<Select
																	value={appt.status}
																	onValueChange={(value) =>
																		handleStatusChange(appt.id, value)
																	}
																	disabled={appt.status === 'cancelled'}
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
																		<SelectItem value="pending">
																			Pending
																		</SelectItem>
																		<SelectItem value="confirmed">
																			Confirmed
																		</SelectItem>
																		<SelectItem value="cancelled">
																			Cancelled
																		</SelectItem>
																	</SelectContent>
																</Select>
															</TooltipTrigger>
															<TooltipContent>
																<p>
																	{appt.status === 'cancelled' 
																		? 'Cannot change cancelled appointment status' 
																		: 'Update appointment status'
																	}
																</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												</TableCell>
												<TableCell className="text-right font-semibold text-slate-800">
													<div className="text-right">
														<div className="text-lg font-bold">
															{formatPrice(appt.totalPrice)}
														</div>
														{appt.addons.length > 0 && (
															<div className="text-sm text-slate-500">
																Base: {formatPrice(appt.service.price)}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell className="text-center">
													<div className="flex items-center justify-center gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																setSelectedAppointment(appt);
																setIsManagementDialogOpen(true);
															}}
															className="bg-blue-50 hover:bg-blue-100 border-blue-200"
														>
															<Eye className="w-4 h-4 mr-1" />
															Manage
														</Button>
														{/* Risk Indicator */}
														{appt.client.role === "client" && (
															<div className="flex items-center">
																<TooltipProvider>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<div className="w-2 h-2 rounded-full bg-gray-300 cursor-help" />
																		</TooltipTrigger>
																		<TooltipContent>
																			<p>
																				Click Manage to view customer risk
																				assessment
																			</p>
																		</TooltipContent>
																	</Tooltip>
																</TooltipProvider>
															</div>
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<p className="text-center text-slate-600 py-8 text-lg">
									{selectedDate
										? "No appointments scheduled for this date."
										: "No appointments found."}
								</p>
							)}
						</CardContent>
					</Card>

					{/* Pagination Controls */}
					{!selectedDate && (
						<div className="flex items-center justify-between mt-6">
							<div className="flex items-center space-x-2">
								<p className="text-sm text-gray-700">
									Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} appointments
								</p>
								<Select value={limit.toString()} onValueChange={(value) => handleLimitChange(parseInt(value))}>
									<SelectTrigger className="w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="10">10</SelectItem>
										<SelectItem value="20">20</SelectItem>
										<SelectItem value="50">50</SelectItem>
										<SelectItem value="100">100</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-sm text-gray-700">per page</p>
							</div>

							<div className="flex items-center space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage <= 1 || isLoading}
								>
									Previous
								</Button>
								
								<div className="flex items-center space-x-1">
									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNum: number;
										if (totalPages <= 5) {
											pageNum = i + 1;
										} else if (currentPage <= 3) {
											pageNum = i + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNum = totalPages - 4 + i;
										} else {
											pageNum = currentPage - 2 + i;
										}
										
										return (
											<Button
												key={pageNum}
												variant={currentPage === pageNum ? "default" : "outline"}
												size="sm"
												onClick={() => handlePageChange(pageNum)}
												disabled={isLoading}
												className="w-8 h-8 p-0"
											>
												{pageNum}
											</Button>
										);
									})}
								</div>

								<Button
									variant="outline"
									size="sm"
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage >= totalPages || isLoading}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Appointment Management Dialog */}
			<AppointmentManagementDialog
				appointment={selectedAppointment}
				isOpen={isManagementDialogOpen}
				onClose={() => {
					setIsManagementDialogOpen(false);
					setSelectedAppointment(null);
				}}
				timezone={timezone}
			/>
		</TooltipProvider>
	);
}
