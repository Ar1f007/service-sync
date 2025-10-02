import { Suspense } from "react";
import { redirect } from "next/navigation";
import AnalyticsClient from "./_components/AnalyticsClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";

export default async function AnalyticsPage() {
  const session = await getSession();
  
  if (!session || session.user.role !== "admin") {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Analyze booking patterns and optimize staff scheduling
          </p>
        </div>

        {/* Loading State */}
        <Suspense fallback={
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours Analysis</CardTitle>
                <CardDescription>Loading analytics data...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          </div>
        }>
          <AnalyticsClient />
        </Suspense>
      </div>
    </div>
  );
}
