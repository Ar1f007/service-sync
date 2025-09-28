import { type NextRequest, NextResponse } from "next/server";
import { RiskAssessmentService } from "@/lib/risk-assessment";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const { userId } = await params;

		const risk = await RiskAssessmentService.getCustomerRisk(userId);

		if (!risk) {
			return NextResponse.json(
				{ error: "Customer risk assessment not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(risk);
	} catch (error) {
		console.error("Error fetching customer risk:", error);
		return NextResponse.json(
			{ error: "Failed to fetch customer risk" },
			{ status: 500 },
		);
	}
}

export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const { userId } = await params;

		const updatedRisk = await RiskAssessmentService.updateCustomerRisk(userId);

		return NextResponse.json(updatedRisk);
	} catch (error) {
		console.error("Error updating customer risk:", error);
		return NextResponse.json(
			{ error: "Failed to update customer risk" },
			{ status: 500 },
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const { userId } = await params;
		const { notes } = await request.json();

		if (!notes) {
			return NextResponse.json(
				{ error: "Admin notes are required" },
				{ status: 400 },
			);
		}

		const updatedRisk = await RiskAssessmentService.updateAdminNotes(
			userId,
			notes,
		);

		return NextResponse.json(updatedRisk);
	} catch (error) {
		console.error("Error updating admin notes:", error);
		return NextResponse.json(
			{ error: "Failed to update admin notes" },
			{ status: 500 },
		);
	}
}
