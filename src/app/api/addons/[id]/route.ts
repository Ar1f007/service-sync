import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";

const updateAddonSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	description: z.string().optional(),
	price: z.number().min(0, "Price must be non-negative").optional(),
	duration: z.number().min(0, "Duration must be non-negative").optional(),
	isActive: z.boolean().optional(),
});

// GET /api/addons/[id] - Get a specific add-on
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const addon = await db.serviceAddon.findUnique({
			where: { id },
			include: {
				service: {
					select: {
						id: true,
						title: true,
					},
				},
			},
		});

		if (!addon) {
			return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
		}

		return NextResponse.json(addon);
	} catch (error) {
		console.error("Error fetching add-on:", error);
		return NextResponse.json(
			{ error: "Failed to fetch add-on" },
			{ status: 500 },
		);
	}
}

// PUT /api/addons/[id] - Update an add-on
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const validatedData = updateAddonSchema.parse(body);

		// Check if add-on exists
		const existingAddon = await db.serviceAddon.findUnique({
			where: { id },
		});

		if (!existingAddon) {
			return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
		}

		const updatedAddon = await db.serviceAddon.update({
			where: { id },
			data: validatedData,
		});

		return NextResponse.json(updatedAddon);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation error", details: error.issues },
				{ status: 400 },
			);
		}

		console.error("Error updating add-on:", error);
		return NextResponse.json(
			{ error: "Failed to update add-on" },
			{ status: 500 },
		);
	}
}

// DELETE /api/addons/[id] - Delete an add-on
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		// Check if add-on exists
		const existingAddon = await db.serviceAddon.findUnique({
			where: { id },
		});

		if (!existingAddon) {
			return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
		}

		// Check if add-on is used in any appointments
		const appointmentAddons = await db.appointmentAddon.findMany({
			where: { addonId: id },
		});

		if (appointmentAddons.length > 0) {
			// Soft delete by setting isActive to false
			await db.serviceAddon.update({
				where: { id },
				data: { isActive: false },
			});

			return NextResponse.json({
				message: "Add-on deactivated (used in appointments)",
			});
		}

		// Hard delete if not used
		await db.serviceAddon.delete({
			where: { id },
		});

		return NextResponse.json({ message: "Add-on deleted successfully" });
	} catch (error) {
		console.error("Error deleting add-on:", error);
		return NextResponse.json(
			{ error: "Failed to delete add-on" },
			{ status: 500 },
		);
	}
}
