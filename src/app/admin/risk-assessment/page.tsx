import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import RiskAssessmentClient from "./_components/RiskAssessmentClient";

export default async function RiskAssessmentPage() {
	const session = await getSession();

	if (!session?.user || session.user.role !== "admin") {
		redirect("/sign-in");
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">
					Customer Risk Assessment
				</h1>
				<p className="text-gray-600 mt-2">
					Monitor and manage customer risk levels to prevent no-shows and
					cancellations.
				</p>
			</div>

			<Suspense fallback={<div>Loading risk assessment data...</div>}>
				<RiskAssessmentClient />
			</Suspense>
		</div>
	);
}
