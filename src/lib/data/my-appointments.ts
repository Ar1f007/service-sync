import { toZonedTime } from "date-fns-tz";
import prismaInstance from "../db";

interface Appointment {
	id: string;
	service: { id: string; title: string; price: number; duration: number };
	client: { id: string; name: string | null };
	employee: { id: string; user: { id: string; name: string } };
	dateTime: string;
	status: string;
	totalPrice?: number;
	addons?: { id: string; name: string; price: number; duration: number }[];
}

/**
 * Fetches appointments for a given client ID and formats the dateTime to the specified timezone.
 * This function is designed to be called directly from Server Components or API Route Handlers.
 */
export async function getClientAppointments(
	clientId: string,
	timezone: string = "Europe/London",
): Promise<Appointment[]> {
	if (!clientId) {
		console.error("getClientAppointments: clientId is missing");
		return [];
	}

	try {
		// Get regular appointments
		const appointments = await prismaInstance.appointment.findMany({
			where: { clientId },
			include: {
				service: {
					select: { id: true, title: true, price: true, duration: true },
				},
				client: { select: { id: true, name: true } },
				employee: { include: { user: { select: { id: true, name: true } } } },
				appointmentAddons: {
					include: {
						addon: { select: { id: true, name: true, price: true, duration: true } }
					}
				},
			},
		});

		// Get waitlist entries
		const waitlistEntries = await prismaInstance.waitlist.findMany({
			where: { 
				clientId,
				status: { in: ['waiting', 'notified'] } // Only show active waitlist entries
			},
			include: {
				service: {
					select: { id: true, title: true, price: true, duration: true },
				},
				employee: { include: { user: { select: { id: true, name: true } } } },
			},
		});

		// Process regular appointments
		const processedAppointments = appointments.map((appt) => {
			// Calculate total price including add-ons
			const addonPrice = appt.appointmentAddons.reduce((sum, aa) => sum + aa.addon.price, 0);
			const totalPrice = appt.service.price + addonPrice;

			// Map add-ons
			const addons = appt.appointmentAddons.map(aa => ({
				id: aa.addon.id,
				name: aa.addon.name,
				price: aa.addon.price,
				duration: aa.addon.duration,
			}));

			return {
				id: appt.id,
				service: appt.service,
				client: appt.client,
				employee: {
					...appt.employee,
					user: {
						...appt.employee.user,
						name: appt.employee.user.name || ""
					}
				},
				dateTime: toZonedTime(appt.dateTime, timezone).toISOString(),
				status: appt.status,
				totalPrice,
				addons: addons.length > 0 ? addons : undefined,
			};
		});

		// Process waitlist entries
		const processedWaitlistEntries = waitlistEntries.map((entry) => ({
			id: `waitlist-${entry.id}`, // Prefix to distinguish from appointments
			service: entry.service,
			client: { id: clientId, name: null }, // We don't have client info in waitlist
			employee: {
				id: entry.employeeId,
				user: {
					id: entry.employee.user.id,
					name: entry.employee.user.name || ""
				}
			},
			dateTime: toZonedTime(entry.requestedDateTime, timezone).toISOString(),
			status: `waitlist-${entry.status}`, // Prefix to distinguish status
			totalPrice: entry.totalPrice || 0,
			addons: [], // Waitlist entries don't have addons in this context
		}));

		// Combine and sort by date
		const allEntries = [...processedAppointments, ...processedWaitlistEntries];
		return allEntries.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
	} catch (error) {
		console.error("Failed to fetch client appointments:", error);
		// In a real application, you might want to throw a more specific error
		// or handle it differently based on your error handling strategy.
		return [];
	} finally {
		// Disconnect Prisma client if it's not managed globally
		// If you have a global Prisma client instance, you might not need this.
		// await prisma.$disconnect();
	}
}
