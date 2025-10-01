"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
	AlertCircle,
	ArrowLeft,
	CalendarIcon,
	CheckCircle,
	Clock,
	Loader2,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import RiskIndicator, { RiskWarning } from "@/components/RiskIndicator";
import WaitlistEnrollment from "@/components/WaitlistEnrollment";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
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
import { authClient } from "@/lib/auth-client";
import { cn, formatPrice } from "@/lib/utils";

interface Service {
	id: string;
	title: string;
	description: string | null;
	features: string[];
	duration: number;
	price: number;
}

interface Addon {
	id: string;
	name: string;
	description?: string;
	price: number;
	duration: number;
	isActive: boolean;
}

interface Employee {
	id: string;
	user: { name: string; email: string };
	serviceEmployees: { serviceId: string }[];
}

interface Appointment {
	id: string;
	employeeId: string;
	dateTime: string;
	duration: number;
}

export const bookingSchema = z.object({
	serviceId: z.string().min(1, "Service is required"),
	employeeId: z.string().min(1, "Employee is required"),
	date: z.string().min(1, "Date is required"),
	time: z.string().min(1, "Time is required"),
	addonIds: z.array(z.string()).default([]),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

interface BookClientProps {
	services: Service[];
}

export default function BookClient({ services }: BookClientProps) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
	const [bookingStatus, setBookingStatus] = useState<
		"idle" | "loading" | "success" | "error" | "waitlist"
	>("idle");
	const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
	const [timeSlots, setTimeSlots] = useState<string[]>([]);
	const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
	const [isCalendarOpen, setIsCalendarOpen] = useState(false); // Add state for calendar popover
	const [availableAddons, setAvailableAddons] = useState<Addon[]>([]);
	const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
	const [pricingData, setPricingData] = useState<{
		basePrice: number;
		addonPrice: number;
		totalPrice: number;
		baseDuration: number;
		addonDuration: number;
		totalDuration: number;
	} | null>(null);
	const [isLoadingPricing, setIsLoadingPricing] = useState(false);
	const [customerRisk, setCustomerRisk] = useState<{
		riskLevel: "low" | "medium" | "high" | "very_high";
		riskScore: number;
		requiresApproval: boolean;
		depositRequired: boolean;
		maxAdvanceBookingDays: number | null;
		adminNotes: string | null;
	} | null>(null);
	const [isLoadingRisk, setIsLoadingRisk] = useState(false);
	const timezone =
		Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

	const form = useForm({
		resolver: zodResolver(bookingSchema),
		defaultValues: {
			serviceId: "",
			employeeId: "",
			date: "",
			time: "",
			addonIds: [],
		},
	});

	const serviceId = form.watch("serviceId");
	const selectedDate = form.watch("date");
	const selectedTime = form.watch("time");
	const employeeId = form.watch("employeeId");

	// Get service from URL params
	const serviceIdFromUrl = searchParams.get("service");

	// biome-ignore lint/correctness/useExhaustiveDependencies: <noneed>
	useEffect(() => {
		if (isPending) return;
		if (!session) {
			const currentUrl = window.location.pathname + window.location.search;
			localStorage.setItem("redirectAfterAuth", currentUrl);
			router.push("/sign-in");
		} else {
			// Fetch customer risk assessment when user is logged in
			fetchCustomerRisk();
		}
	}, [session, isPending, router]);

	// Fetch customer risk assessment
	const fetchCustomerRisk = useCallback(async () => {
		if (!session?.user?.id) return;

		try {
			setIsLoadingRisk(true);
			const response = await fetch(
				`/api/risk-assessment/check-approval?userId=${session.user.id}`,
			);
			if (response.ok) {
				const data = await response.json();
				setCustomerRisk(data.mitigation);
			}
		} catch (error) {
			console.error("Error fetching customer risk:", error);
		} finally {
			setIsLoadingRisk(false);
		}
	}, [session?.user?.id]);

	useEffect(() => {
		if (serviceIdFromUrl) {
			form.setValue("serviceId", serviceIdFromUrl);
			setIsBookingDialogOpen(true);
		}
	}, [serviceIdFromUrl, form]);

	// Fetch employees for selected service
	useEffect(() => {
		if (!serviceId) return;
		async function fetchEmployees() {
			try {
				const response = await fetch(
					`/api/employees?serviceId=${serviceId}&timezone=${encodeURIComponent(timezone)}`,
					{
						method: "GET",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
					},
				);
				if (!response.ok) throw new Error("Failed to fetch employees");
				const data = await response.json();
				setAvailableEmployees(data.employees || []);
				if (data.employees?.length === 1) {
					form.setValue("employeeId", data.employees[0].id);
				} else {
					form.setValue("employeeId", "");
				}
			} catch (error) {
				console.error("Error fetching employees:", error);
				setAvailableEmployees([]);
			}
		}
		fetchEmployees();
	}, [serviceId, form, timezone]);

	// Fetch add-ons for selected service
	useEffect(() => {
		if (!serviceId) {
			setAvailableAddons([]);
			setSelectedAddons([]);
			setPricingData(null);
			return;
		}

		async function fetchAddons() {
			try {
				const response = await fetch(`/api/addons?serviceId=${serviceId}`, {
					method: "GET",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
				});
				if (!response.ok) throw new Error("Failed to fetch add-ons");
				const data = await response.json();
				setAvailableAddons(data || []);
				setSelectedAddons([]);
				form.setValue("addonIds", []);
			} catch (error) {
				console.error("Error fetching add-ons:", error);
				setAvailableAddons([]);
			}
		}
		fetchAddons();
	}, [serviceId, form]);

	// Calculate pricing when add-ons change
	useEffect(() => {
		if (!serviceId || selectedAddons.length === 0) {
			setPricingData(null);
			return;
		}

		async function calculatePricing() {
			setIsLoadingPricing(true);
			try {
				const response = await fetch("/api/addons/calculate-price", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						serviceId,
						addonIds: selectedAddons,
					}),
				});
				if (!response.ok) throw new Error("Failed to calculate pricing");
				const data = await response.json();
				setPricingData(data);
			} catch (error) {
				console.error("Error calculating pricing:", error);
				setPricingData(null);
			} finally {
				setIsLoadingPricing(false);
			}
		}

		calculatePricing();
	}, [serviceId, selectedAddons]);

	// Generate and filter time slots based on employee availability
	useEffect(() => {
		if (!serviceId || !selectedDate || !employeeId) {
			setTimeSlots([]);
			return;
		}

		async function fetchTimeSlots() {
			setIsLoadingTimeSlots(true);
			try {
				const selectedService = services.find((s) => s.id === serviceId);
				if (!selectedService) throw new Error("Service not found");

				// Validate selectedDate format (YYYY-MM-DD)
				const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
				if (!dateRegex.test(selectedDate)) {
					console.error(`Invalid selectedDate format: ${selectedDate}`);
					setTimeSlots([]);
					return;
				}

				// Generate time slots (9:00 AM to 5:30 PM, 30-min intervals)
				const startHour = 9;
				const endHour = 17.5; // 5:30 PM
				const interval = 30; // minutes
				const slots: string[] = [];
				for (let hour = startHour; hour <= endHour; hour += interval / 60) {
					const hours = Math.floor(hour);
					const minutes = (hour % 1) * 60;
					const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
					slots.push(time);
				}

				// Fetch existing appointments for conflict checking
				const response = await fetch(
					`/api/appointments?employeeId=${employeeId}&date=${selectedDate}&timezone=${encodeURIComponent(timezone)}`,
					{
						method: "GET",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
					},
				);

				if (!response.ok) throw new Error("Failed to fetch appointments");
				const { appointments }: { appointments: Appointment[] } =
					await response.json();

				// Filter out conflicting time slots
				const duration = pricingData?.totalDuration || selectedService.duration;
				const availableSlots = slots.filter((slot) => {
					// Create slot start time in Asia/Dhaka timezone
					const slotDateTimeStr = `${selectedDate}T${slot}:00`;
					const slotDate = new Date(slotDateTimeStr);
					if (!isValid(slotDate)) {
						console.error(`Invalid slot date: ${slotDateTimeStr}`);
						return false;
					}
					const slotStart = toZonedTime(slotDate, timezone);
					const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

					// Validate slotStart and slotEnd
					if (!isValid(slotStart) || !isValid(slotEnd)) {
						console.error(
							`Invalid slot times: start=${slotStart}, end=${slotEnd}`,
						);
						return false;
					}

					console.log(
						`Checking slot: ${slotDateTimeStr} (${slotStart.toISOString()} to ${slotEnd.toISOString()})`,
					);

					// Check for conflicts with existing appointments
					return !appointments.some((appt) => {
						// Validate appt.dateTime
						const apptDate = new Date(appt.dateTime);
						if (!isValid(apptDate)) {
							console.error(`Invalid appointment dateTime: ${appt.dateTime}`);
							return false;
						}
						const apptStart = toZonedTime(apptDate, timezone);
						const apptEnd = new Date(
							apptStart.getTime() + (appt.duration || 30) * 60 * 1000,
						);

						if (!isValid(apptStart) || !isValid(apptEnd)) {
							console.error(
								`Invalid appointment times: start=${apptStart}, end=${apptEnd}`,
							);
							return false;
						}

						console.log(
							`  Against appt ${appt.id}: ${appt.dateTime} (${apptStart.toISOString()} to ${apptEnd.toISOString()})`,
						);

						// Check for overlap
						const hasOverlap =
							(slotStart >= apptStart && slotStart < apptEnd) ||
							(slotEnd > apptStart && slotEnd <= apptEnd) ||
							(slotStart <= apptStart && slotEnd >= apptEnd);

						if (hasOverlap) {
							console.log(`  Conflict found with appt ${appt.id}`);
						}
						return hasOverlap;
					});
				});

				console.log(`Available slots for ${selectedDate}:`, availableSlots);
				setTimeSlots(availableSlots);
			} catch (error) {
				console.error("Error fetching time slots:", error);
				setTimeSlots([]);
			} finally {
				setIsLoadingTimeSlots(false);
			}
		}
		fetchTimeSlots();
	}, [serviceId, selectedDate, employeeId, services, timezone, pricingData]);

	const selectedServiceData = services.find((s) => s.id === serviceId);
	const selectedEmployeeData = availableEmployees.find(
		(e) => e.id === employeeId,
	);

	const onSubmit = async (data: BookingFormData) => {
		setBookingStatus("loading");
		form.clearErrors("root");
		try {
			const selectedService = services.find((s) => s.id === data.serviceId);
			if (!selectedService) throw new Error("Service not found");

			// Check if customer requires approval
			if (customerRisk?.requiresApproval) {
				throw new Error(
					"This booking requires manual approval. Please contact us to complete your booking.",
				);
			}

			// Check advance booking limits
			if (customerRisk?.maxAdvanceBookingDays) {
				const bookingDate = new Date(data.date);
				const today = new Date();
				const daysDifference = Math.ceil(
					(bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
				);

				if (daysDifference > customerRisk.maxAdvanceBookingDays) {
					throw new Error(
						`You can only book up to ${customerRisk.maxAdvanceBookingDays} days in advance. Please select an earlier date.`,
					);
				}
			}

			const dateTime = toZonedTime(
				new Date(`${data.date}T${data.time}:00`),
				timezone,
			).toISOString();

			// Calculate total price including add-ons
			let totalPrice = selectedService.price;
			if (data.addonIds && data.addonIds.length > 0) {
				const selectedAddons = addons.filter(addon => data.addonIds.includes(addon.id));
				totalPrice += selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
			}

			// Create appointment first (without payment)
			const response = await fetch(
				`/api/appointments?timezone=${encodeURIComponent(timezone)}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						serviceId: data.serviceId,
						employeeId: data.employeeId,
						clientId: session?.user?.id,
						dateTime,
						status: customerRisk?.requiresApproval
							? "pending_approval"
							: "pending",
						timezone,
						addonIds: data.addonIds,
						totalPrice,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				
				// If it's a time slot conflict, show waitlist option instead of error
				if (errorData.error === "Time slot unavailable") {
					setBookingStatus("waitlist");
					return;
				}
				
				throw new Error(errorData.error || "Failed to book appointment");
			}

			const appointmentData = await response.json();
			
			// If payment is required and customer doesn't require approval, redirect to payment
			if (totalPrice > 0 && !customerRisk?.requiresApproval) {
				setBookingStatus("success");
				form.reset();
				setTimeout(() => {
					setIsBookingDialogOpen(false);
					setBookingStatus("idle");
					router.push(`/payment?appointmentId=${appointmentData.appointment.id}`);
				}, 1000);
			} else {
				// No payment required or requires approval
				setBookingStatus("success");
				form.reset();
				setTimeout(() => {
					setIsBookingDialogOpen(false);
					setBookingStatus("idle");
					router.push("/dashboard/appointments");
				}, 2000);
			}
		// biome-ignore lint/suspicious/noExplicitAny: <noneed>
		} catch (error: any) {
			setBookingStatus("error");
			form.setError("root", {
				message: error.message || "Failed to book appointment",
			});
			setTimeout(() => setBookingStatus("idle"), 3000);
		}
	};

	if (isPending) {
		return (
			<div className="min-h-screen bg-slate-50">
				<div className="flex items-center justify-center min-h-[60vh]">
					<div className="text-center">
						<Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-teal-600" />
						<p className="text-slate-600">Loading...</p>
					</div>
				</div>
			</div>
		);
	}

	if (!session) {
		return null; // Will redirect to sign-in by useEffect
	}

	if (services.length === 0) {
		return (
			<div className="min-h-screen bg-slate-50">
				<div className="flex items-center justify-center min-h-[60vh]">
					<p className="text-red-500 text-lg">
						No services available. Please try again later.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				{/* Back Button */}
				<div className="mb-6">
					<Button
						variant="ghost"
						asChild
						className="text-slate-600 hover:text-slate-900"
					>
						<Link href="/services">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Services
						</Link>
					</Button>
				</div>

				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-slate-900 mb-4">
						Book Your Appointment
					</h1>
					<p className="text-xl text-slate-600">
						Choose your service and preferred time to get started.
					</p>
				</div>

				{/* Service Selection */}
				<Card className="mb-8">
					<CardHeader>
						<CardTitle className="flex items-center">
							<CalendarIcon className="w-5 h-5 mr-2 text-teal-700" />
							Select Service
						</CardTitle>
						<CardDescription>
							Choose the service you'd like to book
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{services.map((service) => (
								<Card
									key={service.id}
									className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
										serviceId === service.id
											? "ring-2 ring-teal-500 bg-teal-50"
											: "hover:border-teal-200"
									}`}
									onClick={() => {
										form.setValue("serviceId", service.id);
										setIsBookingDialogOpen(true);
									}}
								>
									<CardHeader className="pb-3">
										<CardTitle className="text-lg">{service.title}</CardTitle>
										<CardDescription className="text-sm">
											{service.description || "No description available"}
										</CardDescription>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="flex items-center justify-between text-sm">
											<span className="flex items-center text-slate-600">
												<Clock className="w-4 h-4 mr-1" />
												{service.duration} min
											</span>
											<span className="font-semibold text-slate-900">
												{formatPrice(service.price)}
											</span>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Booking Dialog */}
				<Dialog
					open={isBookingDialogOpen}
					onOpenChange={setIsBookingDialogOpen}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center">
								<CalendarIcon className="w-5 h-5 mr-2 text-teal-700" />
								Complete Your Booking
							</DialogTitle>
							<DialogDescription>
								Fill in the details to confirm your appointment
							</DialogDescription>
						</DialogHeader>

						{bookingStatus === "success" ? (
							<div className="text-center py-6">
								<CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
								<h3 className="text-lg font-semibold text-slate-900 mb-2">
									Booking Confirmed!
								</h3>
								<p className="text-slate-600">
									Your appointment has been successfully booked. Redirecting...
								</p>
							</div>
						) : bookingStatus === "waitlist" ? (
							<div className="py-6">
								<WaitlistEnrollment
									serviceId={form.getValues("serviceId")}
									employeeId={form.getValues("employeeId")}
									requestedDateTime={new Date(`${form.getValues("date")}T${form.getValues("time")}:00`)}
									duration={selectedServiceData ? selectedServiceData.duration + (form.getValues("addonIds") || []).reduce((sum, addonId) => {
										const addon = availableAddons.find(a => a.id === addonId);
										return sum + (addon?.duration || 0);
									}, 0) : 0}
									selectedAddonIds={form.getValues("addonIds") || []}
									totalPrice={totalPrice}
									onSuccess={() => {
										setBookingStatus("success");
										setTimeout(() => {
											setIsBookingDialogOpen(false);
											setBookingStatus("idle");
											router.push("/dashboard/appointments");
										}, 2000);
									}}
									onError={(error) => {
										form.setError("root", { message: error });
										setBookingStatus("error");
									}}
								/>
								<div className="flex justify-center mt-4">
									<Button
										variant="outline"
										onClick={() => {
											setIsBookingDialogOpen(false);
											setBookingStatus("idle");
										}}
									>
										Close
									</Button>
								</div>
							</div>
						) : (
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className="space-y-4"
								>
									{/* Display root error message */}
									{form.formState.errors.root?.message && (
										<Alert className="mb-4 border-red-200 bg-red-50">
											<AlertCircle className="h-4 w-4 text-red-600" />
											<AlertDescription className="text-red-800">
												{form.formState.errors.root.message}
											</AlertDescription>
										</Alert>
									)}

									{/* Service Display */}
									{selectedServiceData && (
										<div className="bg-slate-50 p-3 rounded-lg">
											<h4 className="font-medium text-slate-900">
												{selectedServiceData.title}
											</h4>
											<p className="text-sm text-slate-600">
												{selectedServiceData.duration} min •{" "}
												{formatPrice(selectedServiceData.price)}
											</p>
										</div>
									)}

									{/* Service Selection (hidden if pre-selected from URL) */}
									<FormField
										control={form.control}
										name="serviceId"
										render={({ field }) => (
											<FormItem className={serviceIdFromUrl ? "hidden" : ""}>
												<FormLabel>Service</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select a service" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{services.map((s) => (
															<SelectItem key={s.id} value={s.id}>
																{s.title} - {formatPrice(s.price)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Staff Selection (hidden if only one employee) */}
									{availableEmployees.length > 1 && (
										<FormField
											control={form.control}
											name="employeeId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Select Staff Member</FormLabel>
													<Select
														onValueChange={field.onChange}
														value={field.value}
														disabled={!serviceId}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder="Choose your preferred staff member" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{availableEmployees.map((employee) => (
																<SelectItem
																	key={employee.id}
																	value={employee.id}
																>
																	<div className="flex items-center">
																		<User className="w-4 h-4 mr-2" />
																		{employee.user.name}
																	</div>
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}

									{/* Add-on Selection */}
									{availableAddons.length > 0 && (
										<div className="space-y-3">
											<h4 className="font-medium text-slate-900">
												Add-ons (Optional)
											</h4>
											<div className="space-y-2">
												{availableAddons.map((addon) => (
													<label
														key={addon.id}
														className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
															selectedAddons.includes(addon.id)
																? "border-teal-500 bg-teal-50"
																: "border-slate-200 hover:border-teal-200"
														}`}
													>
														<div className="flex items-center space-x-3">
															<input
																type="checkbox"
																checked={selectedAddons.includes(addon.id)}
																onChange={() => {
																	const newSelectedAddons =
																		selectedAddons.includes(addon.id)
																			? selectedAddons.filter(
																					(id) => id !== addon.id,
																				)
																			: [...selectedAddons, addon.id];
																	setSelectedAddons(newSelectedAddons);
																	form.setValue("addonIds", newSelectedAddons);
																}}
																className="h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
															/>
															<div>
																<p className="font-medium text-slate-900">
																	{addon.name}
																</p>
																{addon.description && (
																	<p className="text-sm text-slate-600">
																		{addon.description}
																	</p>
																)}
															</div>
														</div>
														<div className="text-right">
															<p className="font-medium text-slate-900">
																+{formatPrice(addon.price)}
															</p>
															{addon.duration > 0 && (
																<p className="text-xs text-slate-600">
																	+{addon.duration}min
																</p>
															)}
														</div>
													</label>
												))}
											</div>
										</div>
									)}

									{/* Date Selection with Shadcn Calendar - FIXED VERSION */}
									<FormField
										control={form.control}
										name="date"
										render={({ field }) => (
											<FormItem className="flex flex-col">
												<FormLabel>Select Date</FormLabel>
												<Popover
													open={isCalendarOpen}
													onOpenChange={setIsCalendarOpen}
												>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																variant={"outline"}
																className={cn(
																	"w-full justify-start text-left font-normal",
																	!field.value && "text-muted-foreground",
																)}
															>
																<CalendarIcon className="mr-2 h-4 w-4" />
																{field.value ? (
																	format(new Date(field.value), "PPP")
																) : (
																	<span>Pick a date</span>
																)}
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent className="w-auto p-0">
														<Calendar
															mode="single"
															selected={
																field.value ? new Date(field.value) : undefined
															}
															onSelect={(date) => {
																if (date) {
																	field.onChange(format(date, "yyyy-MM-dd"));
																	form.setValue("time", ""); // Reset time selection when date changes
																	setIsCalendarOpen(false); // Close the calendar popover
																} else {
																	field.onChange("");
																}
															}}
															initialFocus
															disabled={(date) => date < new Date()}
														/>
													</PopoverContent>
												</Popover>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Time Selection */}
									<FormField
										control={form.control}
										name="time"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Select Time</FormLabel>
												<FormControl>
													<div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
														{isLoadingTimeSlots ? (
															<div className="col-span-3 text-center py-4">
																<Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
																<p className="text-sm text-slate-600">
																	Fetching available times...
																</p>
															</div>
														) : timeSlots.length > 0 ? (
															timeSlots.map((time) => (
																<Button
																	key={time}
																	variant={
																		field.value === time ? "default" : "outline"
																	}
																	size="sm"
																	onClick={() => field.onChange(time)}
																	className={
																		field.value === time
																			? "bg-teal-700 hover:bg-teal-800"
																			: ""
																	}
																	type="button"
																>
																	{time}
																</Button>
															))
														) : (
															<p className="text-sm text-slate-600 col-span-3">
																No available time slots. Please select a
																different date or employee.
															</p>
														)}
													</div>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Booking Summary */}
									{selectedServiceData &&
										selectedEmployeeData &&
										selectedDate &&
										selectedTime && (
											<div className="bg-slate-50 p-4 rounded-lg">
												<h4 className="font-medium text-slate-900 mb-2">
													Booking Summary
												</h4>
												<div className="space-y-1 text-sm text-slate-600">
													<p>
														<strong>Service:</strong>{" "}
														{selectedServiceData.title}
													</p>
													<p>
														<strong>Staff:</strong>{" "}
														{selectedEmployeeData.user.name}
													</p>
													<p>
														<strong>Date:</strong>{" "}
														{new Date(selectedDate).toLocaleDateString()}
													</p>
													<p>
														<strong>Time:</strong> {selectedTime}
													</p>
													<p>
														<strong>Duration:</strong>{" "}
														{pricingData?.totalDuration ||
															selectedServiceData.duration}{" "}
														minutes
													</p>

													{/* Pricing Breakdown */}
													<div className="border-t pt-2 mt-2">
														<div className="flex justify-between">
															<span>Base Service:</span>
															<span>
																{formatPrice(selectedServiceData.price)}
															</span>
														</div>
														{selectedAddons.length > 0 && (
															<>
																{selectedAddons.map((addonId) => {
																	const addon = availableAddons.find(
																		(a) => a.id === addonId,
																	);
																	return addon ? (
																		<div
																			key={addonId}
																			className="flex justify-between text-xs text-slate-500"
																		>
																			<span>+ {addon.name}:</span>
																			<span>+{formatPrice(addon.price)}</span>
																		</div>
																	) : null;
																})}
																<div className="flex justify-between font-medium text-slate-900 border-t pt-1 mt-1">
																	<span>Total:</span>
																	<span>
																		{isLoadingPricing ? (
																			<Loader2 className="w-3 h-3 animate-spin inline" />
																		) : pricingData ? (
																			formatPrice(pricingData.totalPrice)
																		) : (
																			formatPrice(selectedServiceData.price)
																		)}
																	</span>
																</div>
															</>
														)}
														{selectedAddons.length === 0 && (
															<div className="flex justify-between font-medium text-slate-900 border-t pt-1 mt-1">
																<span>Total:</span>
																<span>
																	{formatPrice(selectedServiceData.price)}
																</span>
															</div>
														)}
													</div>
												</div>
											</div>
										)}

									{/* Risk Assessment Warning */}
									{customerRisk &&
										(customerRisk.requiresApproval ||
											customerRisk.depositRequired ||
											customerRisk.maxAdvanceBookingDays ||
											customerRisk.adminNotes) && (
											<RiskWarning
												requiresApproval={customerRisk.requiresApproval}
												depositRequired={customerRisk.depositRequired}
												maxAdvanceBookingDays={
													customerRisk.maxAdvanceBookingDays
												}
												adminNotes={customerRisk.adminNotes}
											/>
										)}

									{/* Risk Level Indicator */}
									{customerRisk && customerRisk.riskLevel !== "low" && (
										<div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
											<div className="flex items-center space-x-2">
												<span className="text-sm text-slate-600">
													Your booking status:
												</span>
												<RiskIndicator
													riskLevel={customerRisk.riskLevel}
													riskScore={customerRisk.riskScore}
												/>
											</div>
											{isLoadingRisk && (
												<Loader2 className="w-4 h-4 animate-spin text-slate-400" />
											)}
										</div>
									)}

									<div className="flex space-x-2 pt-4">
										<Button
											variant="outline"
											onClick={() => setIsBookingDialogOpen(false)}
											className="flex-1"
											disabled={bookingStatus === "loading"}
											type="button"
										>
											Cancel
										</Button>
										<Button
											type="submit"
											disabled={
												bookingStatus === "loading" || !timeSlots.length
											}
											className="flex-1 bg-teal-700 hover:bg-teal-800 text-white"
										>
											{bookingStatus === "loading" ? (
												<>
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													Booking...
												</>
											) : (
												"Confirm Booking"
											)}
										</Button>
									</div>
								</form>
							</Form>
						)}
					</DialogContent>
				</Dialog>

				{/* Info Section */}
				<Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
					<CardContent className="p-6">
						<div className="flex items-start space-x-4">
							<div className="flex-shrink-0">
								<AlertCircle className="w-6 h-6 text-teal-700" />
							</div>
							<div>
								<h3 className="font-semibold text-slate-900 mb-2">
									Booking Information
								</h3>
								<ul className="text-sm text-slate-600 space-y-1">
									<li>
										• Appointments can be cancelled up to 24 hours in advance
									</li>
									<li>• Please arrive 10 minutes early for your appointment</li>
									<li>• A confirmation email will be sent to you shortly</li>
									<li>• For questions, contact us at (555) 123-4567</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
