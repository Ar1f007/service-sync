import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session || session.user.role !== "admin") {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Welcome back, {session.user.name || "Admin"}. Manage your business from here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Manage your service offerings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Add, edit, and organize your services and add-ons.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
            <CardDescription>View and manage all appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Track appointments, manage schedules, and handle cancellations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff</CardTitle>
            <CardDescription>Manage your team members</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Add staff members, assign roles, and manage permissions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Business insights and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              View performance metrics and business analytics.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Financial management</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Track payments, invoices, and financial reports.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>System configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Configure system settings and preferences.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
