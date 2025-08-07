import { getSession } from "@/lib/session";
import AllAppointmentsClient from "./_components/AllAppointmentsClient";
import { getAppointments } from "@/lib/data/admin";


export default async function AllAppointmentsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return {
      redirect: {
        destination: "/sign-in",
        permanent: false,
      },
    };
  }

  const appointments = await getAppointments("", "admin");

  return (
    <AllAppointmentsClient
      initialAppointments={appointments}
      userRole={session.user.role}
    />
  );
}