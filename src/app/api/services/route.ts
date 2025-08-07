import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismaInstance from "@/lib/db";


export async function GET() {
	try {
		const services = await prismaInstance.service.findMany({
			select: {
				id: true,
				title: true,
				description: true,
				features: true,
				duration: true,
				price: true,
			},
		});
		return NextResponse.json({ services });
	} catch (error) {
		console.error("Failed to fetch services:", error);
		return NextResponse.json(
			{ error: "Failed to fetch services" },
			{ status: 500 },
		);
	} finally {
		// await prismaInstance.$disconnect();
	}
}

export async function POST(request: Request) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session || session.user.role !== "admin") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		const body = await request.json();

		// const parsed = serviceSchema.safeParse(body);
		// if (!parsed.success) {
		//   return NextResponse.json({ error: parsed.error }, { status: 400 });
		// }

		const { title, description, features, duration, price } = body;

		if (!title || !duration || !price) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const service = await prismaInstance.service.create({
			data: {
				title,
				description,
				features: features as unknown as string[],
				duration,
				price,
				createdBy: session.user.id,
			},
		});

		return NextResponse.json({ service, message: "Service created" });
	} catch (error: any) {
		console.error("Failed to create service:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to create service" },
			{ status: 500 },
		);
	} finally {
		// await prismaInstance.$disconnect();
	}
}