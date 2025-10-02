import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClientAppointments } from "@/lib/data/my-appointments";
import ClientAppointmentsClient from "@/app/dashboard/appointments/_components/ClientAppointmentsClient";

export default async function MyAppointmentsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  // Redirect admins to admin appointments
  if (session.user.role === "admin") {
    redirect("/admin/all-appointments");
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  const appointments = await getClientAppointments(session.user.id, timezone);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="mt-2 text-gray-600">
            View and manage your upcoming and past appointments
          </p>
        </div>
        <ClientAppointmentsClient 
          initialAppointments={appointments}
          timezone={timezone}
        />
      </div>
    </div>
  );
}
