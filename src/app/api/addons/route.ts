import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";

const addonSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	price: z.number().min(0, "Price must be non-negative"),
	duration: z.number().min(0, "Duration must be non-negative").default(0),
	serviceId: z.string().min(1, "Service ID is required"),
	isActive: z.boolean().default(true),
});

// GET /api/addons - Get all add-ons (optionally filtered by service)
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const serviceId = searchParams.get("serviceId");

		const whereClause = serviceId
			? { serviceId, isActive: true }
			: { isActive: true };

		const addons = await db.serviceAddon.findMany({
			where: whereClause,
			include: {
				service: {
					select: {
						id: true,
						title: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return NextResponse.json(addons);
	} catch (error) {
		console.error("Error fetching add-ons:", error);
		return NextResponse.json(
			{ error: "Failed to fetch add-ons" },
			{ status: 500 },
		);
	}
}

// POST /api/addons - Create a new add-on
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = addonSchema.parse(body);

		// Verify the service exists
		const service = await db.service.findUnique({
			where: { id: validatedData.serviceId },
		});

		if (!service) {
			return NextResponse.json({ error: "Service not found" }, { status: 404 });
		}

		const addon = await db.serviceAddon.create({
			data: validatedData,
		});

		return NextResponse.json(addon, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation error", details: error.issues },
				{ status: 400 },
			);
		}

		console.error("Error creating add-on:", error);
		return NextResponse.json(
			{ error: "Failed to create add-on" },
			{ status: 500 },
		);
	}
}
