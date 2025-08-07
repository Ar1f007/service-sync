import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ServicesClient from "./_components/ServicesClient";
import prismaInstance from "@/lib/db";

export default async function ServicesPage() {
	const session = await getSession();    

	if (!session || session.user.role !== "admin") {
		return redirect("/sign-in")
	}

	const services = await prismaInstance.service.findMany();

	return <ServicesClient services={services} userId={session.user.id} />;
}
