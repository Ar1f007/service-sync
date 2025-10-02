import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminCalendarClient from "./_components/AdminCalendarClient";

export default async function AdminCalendarPage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    redirect("/sign-in");
  }

  return <AdminCalendarClient />;
}
