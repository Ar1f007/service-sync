import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CustomerCalendarClient from "./_components/CustomerCalendarClient";

export default async function CustomerCalendarPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  return <CustomerCalendarClient userId={session.user.id} />;
}
