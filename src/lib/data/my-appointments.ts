import { toZonedTime } from "date-fns-tz";
import prismaInstance from "../db";

interface Appointment {
	id: string;
	service: { id: string; title: string; price: number; duration: number };
	client: { id: string; name: string | null };
	employee: { id: string; user: { id: string; name: string } };
	dateTime: string;
	status: string;
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
		const appointments = await prismaInstance.appointment.findMany({
			where: { clientId },
			include: {
				service: {
					select: { id: true, title: true, price: true, duration: true },
				},
				client: { select: { id: true, name: true } },
				employee: { include: { user: { select: { id: true, name: true } } } },
			},
		});

		return appointments.map((appt) => ({
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
		}));
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
