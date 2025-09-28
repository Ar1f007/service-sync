import { redirect } from "next/navigation";
import { getClientAppointments } from "@/lib/data/my-appointments";
import { getSession } from "@/lib/session";
import ClientAppointmentsClient from "./_components/ClientAppointmentsClient";

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

export default async function ClientAppointmentsPage() {
	const session = await getSession();
	if (!session) {
		redirect("/sign-in");
	}

	const timezone =
		Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
	const appointments: Appointment[] = await getClientAppointments(
		session.user.id,
		timezone,
	);
	return (
		<ClientAppointmentsClient
			initialAppointments={appointments}
			timezone={timezone}
		/>
	);
}
