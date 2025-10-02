import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CustomerCalendarClient from "@/app/dashboard/calendar/_components/CustomerCalendarClient";

export default async function MyCalendarPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  // Redirect admins to admin calendar
  if (session.user.role === "admin") {
    redirect("/admin/calendar");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Calendar</h1>
          <p className="mt-2 text-gray-600">
            View your appointments in calendar format
          </p>
        </div>
        <CustomerCalendarClient userId={session.user.id} />
      </div>
    </div>
  );
}
