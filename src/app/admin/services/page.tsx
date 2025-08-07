import { PrismaClient } from "@/generated/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ServicesClient from "./_components/ServicesClient";

export default async function ServicesPage() {
	const session = await getSession();    

	if (!session || session.user.role !== "admin") {
		return redirect("/sign-in")
	}

	const prisma = new PrismaClient();
	const services = await prisma.service.findMany();

	return <ServicesClient services={services} userId={session.user.id} />;
}
