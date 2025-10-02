/** biome-ignore-all lint/suspicious/noArrayIndexKey: <noneed> */
"use client";

import { format, subDays } from "date-fns";
import {
	BarChart3,
	CalendarIcon,
	Clock,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface PeakHoursData {
	hour: number;
	dayOfWeek: number;
	bookingCount: number;
	normalizedScore: number;
	status: "low" | "moderate" | "high" | "peak";
}

interface SuggestedSlot {
	day: string;
	time: string;
	bookings: number;
	status: string;
}

interface PeakHoursMatrix {
	data: PeakHoursData[];
	maxCount: number;
	minCount: number;
	averageCount: number;
	suggestedSlots: SuggestedSlot[];
	summary: {
		totalBookings: number;
		peakHours: PeakHoursData[];
		quietHours: PeakHoursData[];
		busiestDay: number;
		busiestHour: number;
	};
	dateRange: {
		from: string;
		to: string;
	};
	filters: {
		serviceId: string | null;
		employeeId: string | null;
		timezone: string;
	};
}

interface Service {
	id: string;
	title: string;
}

interface Employee {
	id: string;
	user: { name: string };
}

export default function AnalyticsClient() {
	const [data, setData] = useState<PeakHoursMatrix | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [services, setServices] = useState<Service[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);

	// Filters
	const [selectedService, setSelectedService] = useState<string>("all");
	const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
	const [dateRange, setDateRange] = useState({
		from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
		to: format(new Date(), "yyyy-MM-dd"),
	});

	const loadServices = useCallback(async () => {
		try {
			const response = await fetch("/api/services", {
				credentials: "include",
			});
			if (response.ok) {
				const servicesData = await response.json();
				setServices(servicesData.services || []);
			}
		} catch (error) {
			console.error("Error loading services:", error);
		}
	}, []);

	const loadEmployees = useCallback(async () => {
		try {
			const response = await fetch("/api/employees", {
				credentials: "include",
			});
			if (response.ok) {
				const employeesData = await response.json();
				setEmployees(employeesData.employees || []);
			}
		} catch (error) {
			console.error("Error loading employees:", error);
		}
	}, []);

	const loadAnalytics = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const params = new URLSearchParams({
				from: dateRange.from,
				to: dateRange.to,
			});

			if (selectedService && selectedService !== "all") {
				params.append("serviceId", selectedService);
			}

			if (selectedEmployee && selectedEmployee !== "all") {
				params.append("employeeId", selectedEmployee);
			}

			const response = await fetch(`/api/analytics/peak-hours?${params}`, {
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to load analytics data");
			}

			const analyticsData = await response.json();
			setData(analyticsData);
		} catch (error) {
			console.error("Error loading analytics:", error);
			setError(
				error instanceof Error ? error.message : "Failed to load analytics",
			);
		} finally {
			setLoading(false);
		}
	}, [selectedService, selectedEmployee, dateRange.from, dateRange.to]);

	// Load initial data
	useEffect(() => {
		loadServices();
		loadEmployees();
		loadAnalytics();
	}, [loadServices, loadEmployees, loadAnalytics]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "low":
				return "bg-green-100 text-green-800 border-green-200";
			case "moderate":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "high":
				return "bg-red-100 text-red-800 border-red-200";
			case "peak":
				return "bg-purple-100 text-purple-800 border-purple-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getHeatmapColor = (normalizedScore: number) => {
		if (normalizedScore === 0) return "bg-gray-50";
		if (normalizedScore < 0.25) return "bg-green-200";
		if (normalizedScore < 0.5) return "bg-yellow-200";
		if (normalizedScore < 0.75) return "bg-orange-200";
		return "bg-red-200";
	};

	const getDayName = (dayOfWeek: number) => {
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		return days[dayOfWeek];
	};

	const getHourLabel = (hour: number) => {
		if (hour === 0) return "12A";
		if (hour < 12) return `${hour}A`;
		if (hour === 12) return "12P";
		return `${hour - 12}P`;
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Peak Hours Analysis</CardTitle>
						<CardDescription>Loading analytics data...</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="animate-pulse space-y-4">
							<div className="h-4 bg-gray-200 rounded w-3/4"></div>
							<div className="h-4 bg-gray-200 rounded w-1/2"></div>
							<div className="h-4 bg-gray-200 rounded w-2/3"></div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Error Loading Analytics</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-red-600">{error}</p>
					<Button onClick={loadAnalytics} className="mt-4">
						Try Again
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (!data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Data Available</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-gray-600">
						No booking data found for the selected period.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center">
						<BarChart3 className="w-5 h-5 mr-2" />
						Analytics Filters
					</CardTitle>
					<CardDescription>
						Customize your analytics view by service, employee, and date range
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="service">Service</Label>
							<Select
								value={selectedService}
								onValueChange={setSelectedService}
							>
								<SelectTrigger>
									<SelectValue placeholder="All services" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All services</SelectItem>
									{services?.map((service) => (
										<SelectItem key={service.id} value={service.id}>
											{service.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="employee">Employee</Label>
							<Select
								value={selectedEmployee}
								onValueChange={setSelectedEmployee}
							>
								<SelectTrigger>
									<SelectValue placeholder="All employees" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All employees</SelectItem>
									{employees?.map((employee) => (
										<SelectItem key={employee.id} value={employee.id}>
											{employee.user.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="from">From Date</Label>
							<Input
								id="from"
								type="date"
								value={dateRange.from}
								onChange={(e) =>
									setDateRange((prev) => ({ ...prev, from: e.target.value }))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="to">To Date</Label>
							<Input
								id="to"
								type="date"
								value={dateRange.to}
								onChange={(e) =>
									setDateRange((prev) => ({ ...prev, to: e.target.value }))
								}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Summary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center">
							<CalendarIcon className="h-8 w-8 text-blue-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">
									Total Bookings
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{data.summary.totalBookings}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center">
							<TrendingUp className="h-8 w-8 text-red-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Busiest Day</p>
								<p className="text-2xl font-bold text-gray-900">
									{getDayName(data.summary.busiestDay)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center">
							<Clock className="h-8 w-8 text-orange-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Peak Hour</p>
								<p className="text-2xl font-bold text-gray-900">
									{getHourLabel(data.summary.busiestHour)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center">
							<Users className="h-8 w-8 text-green-600" />
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">
									Average/Hour
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{Math.round(data.averageCount)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Heatmap */}
			<Card>
				<CardHeader>
					<CardTitle>Peak Hours Heatmap</CardTitle>
					<CardDescription>
						Booking density by day of week and hour. Darker colors indicate
						higher demand.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<div className="min-w-full">
							{/* Header row with hours */}
							<div className="flex">
								<div className="w-16 h-8 flex items-center justify-center text-xs font-medium text-gray-600 border-r border-b">
									Day/Hour
								</div>
								{Array.from({ length: 24 }, (_, hour) => (
									<div
										key={`header-hour-${hour}`}
										className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-600 border-r border-b"
									>
										{getHourLabel(hour)}
									</div>
								))}
							</div>

							{/* Data rows */}
							{Array.from({ length: 7 }, (_, dayOfWeek) => (
								<div key={`day-row-${dayOfWeek}`} className="flex">
									<div className="w-16 h-8 flex items-center justify-center text-xs font-medium text-gray-600 border-r border-b">
										{getDayName(dayOfWeek)}
									</div>
									{Array.from({ length: 24 }, (_, hour) => {
										const cellData = data.data.find(
											(item) =>
												item.dayOfWeek === dayOfWeek && item.hour === hour,
										);
										const count = cellData?.bookingCount || 0;
										const normalizedScore = cellData?.normalizedScore || 0;

										return (
											<div
												key={`heatmap-cell-${dayOfWeek}-${hour}`}
												className={`w-8 h-8 flex items-center justify-center text-xs border-r border-b cursor-pointer hover:bg-gray-100 ${getHeatmapColor(normalizedScore)}`}
												title={`${getDayName(dayOfWeek)} ${getHourLabel(hour)}: ${count} bookings`}
											>
												{count > 0 && (
													<span className="font-medium">{count}</span>
												)}
											</div>
										);
									})}
								</div>
							))}
						</div>
					</div>

					{/* Legend */}
					<div className="mt-4 flex items-center space-x-4">
						<span className="text-sm text-gray-600">Legend:</span>
						<div className="flex items-center space-x-2">
							<div className="w-4 h-4 bg-gray-50 border"></div>
							<span className="text-xs">No bookings</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-4 h-4 bg-green-200 border"></div>
							<span className="text-xs">Low (0-25%)</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-4 h-4 bg-yellow-200 border"></div>
							<span className="text-xs">Moderate (25-50%)</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-4 h-4 bg-orange-200 border"></div>
							<span className="text-xs">High (50-75%)</span>
						</div>
						<div className="flex items-center space-x-2">
							<div className="w-4 h-4 bg-red-200 border"></div>
							<span className="text-xs">Peak (75-100%)</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Suggested Off-Peak Times */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center">
						<TrendingDown className="w-5 h-5 mr-2" />
						Suggested Off-Peak Times
					</CardTitle>
					<CardDescription>
						Best time slots with lower demand for optimal scheduling
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{data.suggestedSlots.slice(0, 12).map((slot) => (
							<div
								key={`${slot.day}-${slot.time}`}
								className="flex items-center justify-between p-3 border rounded-lg"
							>
								<div>
									<p className="font-medium text-gray-900">{slot.day}</p>
									<p className="text-sm text-gray-600">{slot.time}</p>
								</div>
								<div className="text-right">
									<Badge className={getStatusColor(slot.status.toLowerCase())}>
										{slot.status}
									</Badge>
									<p className="text-xs text-gray-500 mt-1">
										{slot.bookings} bookings
									</p>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Peak Hours List */}
			<Card>
				<CardHeader>
					<CardTitle>Top Peak Hours</CardTitle>
					<CardDescription>
						Time slots with the highest booking demand
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{data.summary.peakHours.slice(0, 10).map((peakHour) => (
							<div
								key={`peak-${peakHour.dayOfWeek}-${peakHour.hour}`}
								className="flex items-center justify-between p-3 border rounded-lg"
							>
								<div>
									<p className="font-medium text-gray-900">
										{getDayName(peakHour.dayOfWeek)}{" "}
										{getHourLabel(peakHour.hour)}
									</p>
									<p className="text-sm text-gray-600">
										{peakHour.bookingCount} bookings
									</p>
								</div>
								<Badge className={getStatusColor(peakHour.status)}>
									{peakHour.status.toUpperCase()}
								</Badge>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
