import { fromZonedTime, toZonedTime } from "date-fns-tz";
import prismaInstance from "@/lib/db";

const DEFAULT_TIMEZONE = "Europe/London";

export interface PeakHoursData {
	hour: number;
	dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
	bookingCount: number;
	normalizedScore: number; // 0-1 scale
	status: "low" | "moderate" | "high" | "peak";
}

export interface PeakHoursMatrix {
	data: PeakHoursData[];
	maxCount: number;
	minCount: number;
	averageCount: number;
	suggestedOffPeak: PeakHoursData[];
	summary: {
		totalBookings: number;
		peakHours: PeakHoursData[];
		quietHours: PeakHoursData[];
		busiestDay: number;
		busiestHour: number;
	};
}

export interface PeakHoursOptions {
	serviceId?: string;
	employeeId?: string;
	from: Date;
	to: Date;
	timezone?: string;
}

/**
 * Calculate peak hours data for a given date range
 */
export async function calculatePeakHours(
	options: PeakHoursOptions,
): Promise<PeakHoursMatrix> {
	const {
		serviceId,
		employeeId,
		from,
		to,
		timezone = DEFAULT_TIMEZONE,
	} = options;

	// Convert date range to timezone
	const startDate = fromZonedTime(from, timezone);
	const endDate = fromZonedTime(to, timezone);

	// Build where clause
	const where: Record<string, unknown> = {
		dateTime: {
			gte: startDate,
			lte: endDate,
		},
		status: {
			in: ["confirmed", "pending", "waitlist"], // Include active appointments
		},
	};

	if (serviceId) {
		where.serviceId = serviceId;
	}

	if (employeeId) {
		where.employeeId = employeeId;
	}

	// Get all appointments in the date range
	const appointments = await prismaInstance.appointment.findMany({
		where,
		select: {
			dateTime: true,
			serviceId: true,
			employeeId: true,
		},
	});

	// Initialize matrix (7 days × 24 hours)
	const matrix: { [key: string]: number } = {};

	// Initialize all slots to 0
	for (let day = 0; day < 7; day++) {
		for (let hour = 0; hour < 24; hour++) {
			const key = `${day}-${hour}`;
			matrix[key] = 0;
		}
	}

	// Count appointments by day of week and hour
	appointments.forEach((appointment) => {
		const appointmentDate = toZonedTime(appointment.dateTime, timezone);
		const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday
		const hour = appointmentDate.getHours();

		const key = `${dayOfWeek}-${hour}`;
		matrix[key] = (matrix[key] || 0) + 1;
	});

	// Convert matrix to PeakHoursData array
	const data: PeakHoursData[] = [];
	const counts: number[] = [];

	for (let day = 0; day < 7; day++) {
		for (let hour = 0; hour < 24; hour++) {
			const key = `${day}-${hour}`;
			const count = matrix[key] || 0;
			counts.push(count);

			data.push({
				hour,
				dayOfWeek: day,
				bookingCount: count,
				normalizedScore: 0, // Will calculate after we know max
				status: "low", // Will determine after normalization
			});
		}
	}

	// Calculate statistics
	const maxCount = Math.max(...counts);
	const minCount = Math.min(...counts);
	const averageCount =
		counts.reduce((sum, count) => sum + count, 0) / counts.length;
	const totalBookings = counts.reduce((sum, count) => sum + count, 0);

	// Normalize scores and determine status
	data.forEach((item) => {
		if (maxCount > 0) {
			item.normalizedScore = item.bookingCount / maxCount;
		}

		// Determine status based on normalized score
		if (item.normalizedScore >= 0.8) {
			item.status = "peak";
		} else if (item.normalizedScore >= 0.6) {
			item.status = "high";
		} else if (item.normalizedScore >= 0.3) {
			item.status = "moderate";
		} else {
			item.status = "low";
		}
	});

	// Find peak and quiet hours
	const peakHours = data
		.filter((item) => item.status === "peak")
		.sort((a, b) => b.bookingCount - a.bookingCount)
		.slice(0, 10); // Top 10 peak hours

	const quietHours = data
		.filter((item) => item.status === "low" && item.bookingCount > 0)
		.sort((a, b) => a.bookingCount - b.bookingCount)
		.slice(0, 10); // Top 10 quiet hours

	// Find busiest day and hour
	const dayTotals: { [day: number]: number } = {};
	const hourTotals: { [hour: number]: number } = {};

	data.forEach((item) => {
		dayTotals[item.dayOfWeek] =
			(dayTotals[item.dayOfWeek] || 0) + item.bookingCount;
		hourTotals[item.hour] = (hourTotals[item.hour] || 0) + item.bookingCount;
	});

	const busiestDay = Object.entries(dayTotals).sort(
		([, a], [, b]) => b - a,
	)[0]?.[0]
		? parseInt(Object.entries(dayTotals).sort(([, a], [, b]) => b - a)[0][0])
		: 0;

	const busiestHour = Object.entries(hourTotals).sort(
		([, a], [, b]) => b - a,
	)[0]?.[0]
		? parseInt(Object.entries(hourTotals).sort(([, a], [, b]) => b - a)[0][0])
		: 0;

	// Get suggested off-peak slots (lowest booking counts)
	const suggestedOffPeak = data
		.filter((item) => item.bookingCount === 0 || item.status === "low")
		.sort((a, b) => a.bookingCount - b.bookingCount)
		.slice(0, 20); // Top 20 off-peak slots

	return {
		data,
		maxCount,
		minCount,
		averageCount,
		suggestedOffPeak,
		summary: {
			totalBookings,
			peakHours,
			quietHours,
			busiestDay,
			busiestHour,
		},
	};
}

/**
 * Get day name from day of week number
 */
export function getDayName(dayOfWeek: number): string {
	const days = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];
	return days[dayOfWeek];
}

/**
 * Get hour label for display
 */
export function getHourLabel(hour: number): string {
	if (hour === 0) return "12 AM";
	if (hour < 12) return `${hour} AM`;
	if (hour === 12) return "12 PM";
	return `${hour - 12} PM`;
}

/**
 * Get status color for visualization
 */
export function getStatusColor(
	status: "low" | "moderate" | "high" | "peak",
): string {
	switch (status) {
		case "low":
			return "#10B981"; // green
		case "moderate":
			return "#F59E0B"; // yellow
		case "high":
			return "#EF4444"; // red
		case "peak":
			return "#7C3AED"; // purple
		default:
			return "#6B7280"; // gray
	}
}

/**
 * Get status label for display
 */
export function getStatusLabel(
	status: "low" | "moderate" | "high" | "peak",
): string {
	switch (status) {
		case "low":
			return "Quiet";
		case "moderate":
			return "Moderate";
		case "high":
			return "Busy";
		case "peak":
			return "Peak";
		default:
			return "Unknown";
	}
}

/**
 * Format suggested off-peak slots for display
 */
export function formatOffPeakSlots(slots: PeakHoursData[]): Array<{
	day: string;
	time: string;
	bookings: number;
	status: string;
}> {
	return slots.map((slot) => ({
		day: getDayName(slot.dayOfWeek),
		time: getHourLabel(slot.hour),
		bookings: slot.bookingCount,
		status: getStatusLabel(slot.status),
	}));
}
