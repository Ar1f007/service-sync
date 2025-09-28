import { getSession } from "@/lib/session";
import AllAppointmentsClient from "./_components/AllAppointmentsClient";
import { getAppointments } from "@/lib/data/admin";
import { redirect } from "next/navigation";

export default async function AllAppointmentsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    redirect("/sign-in");
  }

  const appointments = await getAppointments("", "admin");

  return (
    <AllAppointmentsClient
      initialAppointments={appointments}
      userRole={session.user.role}
    />
  );
}