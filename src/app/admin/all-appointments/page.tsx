import { getSession } from "@/lib/session";
import AllAppointmentsClient from "./_components/AllAppointmentsClient";
import { getAppointments } from "@/lib/data/admin";
import { redirect } from "next/navigation";

interface AllAppointmentsPageProps {
  searchParams: {
    page?: string;
    limit?: string;
  };
}

export default async function AllAppointmentsPage({ searchParams }: AllAppointmentsPageProps) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    redirect("/sign-in");
  }

  const page = parseInt(searchParams.page || "1", 10);
  const limit = parseInt(searchParams.limit || "20", 10);
  
  const { appointments, total, totalPages } = await getAppointments("", "admin", page, limit);

  return (
    <AllAppointmentsClient
      initialAppointments={appointments}
      initialTotal={total}
      initialTotalPages={totalPages}
      initialPage={page}
      initialLimit={limit}
      userRole={session.user.role}
    />
  );
}