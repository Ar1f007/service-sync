import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";

const calculatePriceSchema = z.object({
	serviceId: z.string().min(1, "Service ID is required"),
	addonIds: z.array(z.string()).default([]),
});

// POST /api/addons/calculate-price - Calculate total price with add-ons
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { serviceId, addonIds } = calculatePriceSchema.parse(body);

		// Get the base service
		const service = await db.service.findUnique({
			where: { id: serviceId },
		});

		if (!service) {
			return NextResponse.json({ error: "Service not found" }, { status: 404 });
		}

		// Get selected add-ons
		const addons = await db.serviceAddon.findMany({
			where: {
				id: { in: addonIds },
				serviceId,
				isActive: true,
			},
		});

		// Calculate total price
		const basePrice = service.price;
		const addonPrice = addons.reduce((sum, addon) => sum + addon.price, 0);
		const totalPrice = basePrice + addonPrice;

		// Calculate total duration
		const baseDuration = service.duration;
		const addonDuration = addons.reduce(
			(sum, addon) => sum + addon.duration,
			0,
		);
		const totalDuration = baseDuration + addonDuration;

		return NextResponse.json({
			basePrice,
			addonPrice,
			totalPrice,
			baseDuration,
			addonDuration,
			totalDuration,
			addons: addons.map((addon) => ({
				id: addon.id,
				name: addon.name,
				price: addon.price,
				duration: addon.duration,
			})),
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation error", details: error.issues },
				{ status: 400 },
			);
		}

		console.error("Error calculating price:", error);
		return NextResponse.json(
			{ error: "Failed to calculate price" },
			{ status: 500 },
		);
	}
}
