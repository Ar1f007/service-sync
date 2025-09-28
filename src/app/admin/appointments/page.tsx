import prismaInstance from "@/lib/db";
import { getSession } from "@/lib/session";
import AppointmentsClient from "./_components/AppointmentsClient";

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

interface Appointment {
	id: string;
	service: { id: string; title: string; price: number; duration: number };
	client: { id: string; name: string | null };
	employee: { id: string; user: { id: string; name: string | null } };
	dateTime: string;
	status: string;
}

async function fetchAppointments(
	userId: string,
	role: string,
): Promise<Appointment[]> {
	try {
    // biome-ignore lint/suspicious/noExplicitAny: <noneed>
		const where: any = {};
		if (role !== "staff") {
			const employee = await prismaInstance.employee.findFirst({
				where: { userId },
				select: { id: true },
			});
			if (employee) where.employeeId = employee.id;
			else return [];
		}

		const appointments = await prismaInstance.appointment.findMany({
			where,
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
			employee: appt.employee,
			dateTime: appt.dateTime.toISOString(),
			status: appt.status,
		}));
	} catch (error) {
		console.error("Failed to fetch appointments:", error);
		return [];
	} finally {
		// await prismaInstance.$disconnect();
	}
}

async function fetchServices(): Promise<Service[]> {
	try {
		return await prismaInstance.service.findMany({
			select: { id: true, title: true, price: true, duration: true },
		});
	} catch (error) {
		console.error("Failed to fetch services:", error);
		return [];
	} finally {
		// await prismaInstance.$disconnect();
	}
}

async function fetchClients(): Promise<User[]> {
	try {
		return await prismaInstance.user.findMany({
			where: { role: "client" },
			select: { id: true, name: true, email: true },
		});
	} catch (error) {
		console.error("Failed to fetch clients:", error);
		return [];
	} finally {
		// await prismaInstance.$disconnect();
	}
}

export default async function AdminAppointmentsPage() {
	const session = await getSession();
	if (
		!session ||
		(session.user.role !== "admin" && session.user.role !== "staff")
	) {
		return {
			redirect: {
				destination: "/sign-in",
				permanent: false,
			},
		};
	}

	const employeeId =
		session.user.role === "staff"
			? (
					await prismaInstance.employee.findFirst({
						where: { userId: session.user.id },
						select: { id: true },
					})
				)?.id || null
			: null;

	const [appointments, services, clients] = await Promise.all([
		fetchAppointments(session.user.id, session.user.role),
		fetchServices(),
		fetchClients(),
	]);

	return (
		<AppointmentsClient
			initialAppointments={appointments}
			services={services}
			clients={clients}
			userRole={session.user.role}
			employeeId={employeeId}
		/>
	);
}
