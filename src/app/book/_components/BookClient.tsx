"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
	AlertCircle,
	ArrowLeft,
	CalendarIcon,
	CheckCircle,
	Clock,
	Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { VoiceSearchModal } from "@/components/voice/VoiceSearchModal";

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



export const bookingSchema = z.object({
	serviceId: z.string().min(1, "Service is required"),
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
	const [timeSlots, setTimeSlots] = useState<string[]>([]);
	const [slotAvailability, setSlotAvailability] = useState<Record<string, { available: boolean; conflictCount: number; status: string }>>({});
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
	const [voiceSearchOpen, setVoiceSearchOpen] = useState(false);
	const timezone =
		Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

	const form = useForm({
		resolver: zodResolver(bookingSchema),
		defaultValues: {
			serviceId: "",
			date: "",
			time: "",
			addonIds: [],
		},
	});

	const serviceId = form.watch("serviceId");
	const selectedDate = form.watch("date");
	const selectedTime = form.watch("time");

	// Get service from URL params
	const serviceIdFromUrl = searchParams.get("service");

	useEffect(() => {
		if (isPending) return;
		if (!session) {
			const currentUrl = window.location.pathname + window.location.search;
			if (typeof window !== "undefined") {
				localStorage.setItem("redirectAfterAuth", currentUrl);
			}
			router.push("/sign-in");
		}
	}, [session, isPending, router]);


	useEffect(() => {
		if (serviceIdFromUrl) {
			form.setValue("serviceId", serviceIdFromUrl);
			setIsBookingDialogOpen(true);
		}
	}, [serviceIdFromUrl, form]);

	// No need to fetch employees anymore - they're auto-assigned

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

	// Generate and filter time slots based on service-wide availability
	useEffect(() => {
		if (!serviceId || !selectedDate) {
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

				// Fetch availability from the new API
				const response = await fetch(
					`/api/availability?serviceId=${serviceId}&date=${selectedDate}&timezone=${encodeURIComponent(timezone)}&includeSuggestions=true`,
					{
						method: "GET",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
					},
				);

				if (!response.ok) throw new Error("Failed to fetch availability");
				const data = await response.json();

				console.log(`Availability for ${selectedDate}:`, data);
				
				// Store slot availability data
				const availabilityMap: Record<string, { available: boolean; conflictCount: number; status: string }> = {};
				data.slots.forEach((slotData: { slot: string; available: boolean; conflictCount: number; status: string }) => {
					availabilityMap[slotData.slot] = {
						available: slotData.available,
						conflictCount: slotData.conflictCount,
						status: slotData.status || 'available'
					};
				});
				setSlotAvailability(availabilityMap);
				setTimeSlots(data.slots.map((s: { slot: string }) => s.slot));
			} catch (error) {
				console.error("Error fetching time slots:", error);
				setTimeSlots([]);
			} finally {
				setIsLoadingTimeSlots(false);
			}
		}
		fetchTimeSlots();
	}, [serviceId, selectedDate, services, timezone]);

	const selectedServiceData = services.find((s) => s.id === serviceId);

	const handleVoiceBooking = (serviceId: string, date: string, time: string) => {
		console.log('Voice booking data:', { serviceId, date, time });
		// Pre-fill the booking form with voice search results
		form.setValue('serviceId', serviceId);
		form.setValue('date', date);
		form.setValue('time', time);
		// Open the booking dialog
		setIsBookingDialogOpen(true);
	};

	const onSubmit = async (data: BookingFormData) => {
		setBookingStatus("loading");
		form.clearErrors("root");
		try {
			const selectedService = services.find((s) => s.id === data.serviceId);
			if (!selectedService) throw new Error("Service not found");


			const dateTime = toZonedTime(
				new Date(`${data.date}T${data.time}:00`),
				timezone,
			).toISOString();

			// Calculate total price including add-ons
			let totalPrice = selectedService.price;
			if (data.addonIds && data.addonIds.length > 0) {
				const selectedAddons = availableAddons.filter(addon => data.addonIds.includes(addon.id));
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
						clientId: session?.user?.id,
						dateTime,
						status: "pending",
						timezone,
						addonIds: data.addonIds,
						totalPrice,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to book appointment");
			}

			const appointmentData = await response.json();
			
			// Check if appointment was put on waitlist
			if (appointmentData.waitlist) {
				setBookingStatus("waitlist");
				return;
			}
			
			// If payment is required, redirect to payment
			if (totalPrice > 0) {
				setBookingStatus("success");
				form.reset();
				setTimeout(() => {
					setIsBookingDialogOpen(false);
					setBookingStatus("idle");
					router.push(`/payment?appointmentId=${appointmentData.appointment.id}`);
				}, 1000);
			} else {
				// No payment required
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
					<p className="text-xl text-slate-600 mb-6">
						Choose your service and preferred time to get started.
					</p>
					
					{/* Voice Search Button */}
					<div className="flex justify-center">
						<Button
							onClick={() => setVoiceSearchOpen(true)}
							variant="outline"
							size="lg"
							className="gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:from-teal-600 hover:to-blue-600 border-0 shadow-lg"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
							</svg>
							Voice Search
						</Button>
					</div>
					<p className="text-sm text-slate-500 mt-2">
						Try: "Book a haircut for tomorrow" or "Show me massage appointments this weekend"
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
					<DialogContent className="sm:max-w-md max-h-[90svh] overflow-y-auto">
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
								<div className="text-center mb-4">
									<AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
									<h3 className="text-lg font-semibold text-slate-900 mb-2">
										Time Slot Full
									</h3>
									<p className="text-slate-600 mb-4">
										This time slot is already booked. You have been automatically added to the waitlist.
									</p>
									<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
										<p className="text-sm text-yellow-800">
											<strong>What happens next?</strong><br />
											• You'll be notified if a slot becomes available<br />
											• You have 15 minutes to confirm when notified<br />
											• You can cancel anytime from your dashboard
										</p>
									</div>
								</div>
								<div className="flex justify-center space-x-2">
									<Button
										variant="outline"
										onClick={() => {
											setIsBookingDialogOpen(false);
											setBookingStatus("idle");
										}}
									>
										Close
									</Button>
									<Button
										onClick={() => {
											setBookingStatus("success");
											setTimeout(() => {
												setIsBookingDialogOpen(false);
												setBookingStatus("idle");
												router.push("/dashboard/appointments");
											}, 1000);
										}}
									>
										View My Appointments
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

									{/* Staff selection removed - auto-assigned */}

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
															timeSlots.map((time) => {
																const availability = slotAvailability[time];
																const isSelected = field.value === time;
																
																const getButtonVariant = () => {
																	if (isSelected) return "default";
																	if (availability?.status === 'available') return "outline";
																	if (availability?.status === 'waitlist') return "outline";
																	return "outline";
																};
																
																const getButtonClassName = () => {
																	if (isSelected) return "bg-teal-700 hover:bg-teal-800";
																	if (availability?.status === 'available') return "border-green-500 text-green-700 hover:bg-green-50";
																	if (availability?.status === 'waitlist') return "border-yellow-500 text-yellow-700 hover:bg-yellow-50";
																	return "border-red-500 text-red-700 hover:bg-red-50 opacity-60";
																};
																
																const getButtonText = () => {
																	if (availability?.status === 'available') return time;
																	if (availability?.status === 'waitlist') return `${time} (Waitlist)`;
																	return `${time} (Full)`;
																};
																
																return (
																	<Button
																		key={time}
																		variant={getButtonVariant()}
																		size="sm"
																		onClick={() => field.onChange(time)}
																		className={getButtonClassName()}
																		type="button"
																		disabled={availability?.status === 'full'}
																	>
																		{getButtonText()}
																	</Button>
																);
															})
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
														<strong>Staff:</strong> Best available technician
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

				{/* Waitlist Information */}
				<Card className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
					<CardContent className="p-6">
						<div className="flex items-start space-x-4">
							<div className="flex-shrink-0">
								<Clock className="w-6 h-6 text-yellow-700" />
							</div>
							<div>
								<h3 className="font-semibold text-slate-900 mb-2">
									Time Slot Availability
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 bg-green-500 rounded-full"></div>
										<span><strong>Available:</strong> Ready to book</span>
									</div>
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
										<span><strong>Waitlist:</strong> Join the queue</span>
									</div>
									<div className="flex items-center space-x-2">
										<div className="w-3 h-3 bg-red-500 rounded-full"></div>
										<span><strong>Full:</strong> No more spots</span>
									</div>
								</div>
								<div className="mt-3 p-3 bg-yellow-100 rounded-lg">
									<p className="text-sm text-yellow-800">
										<strong>Waitlist Policy:</strong> If a time slot shows "Waitlist", you can still book and will be automatically added to our queue. If someone cancels, you'll be notified and have 15 minutes to confirm your spot.
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Voice Search Modal */}
				<VoiceSearchModal
					open={voiceSearchOpen}
					onOpenChange={setVoiceSearchOpen}
					onBookingConfirmed={handleVoiceBooking}
				/>
			</div>
		</div>
	);
}
