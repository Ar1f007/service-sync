import prismaInstance from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";


// Define the params type properly
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Await the params since it's now a Promise
    const { id } = await context.params;
    const body = await request.json();
    const { title, description, features, duration, price } = body;

    if (!title || !duration || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = await prismaInstance.service.update({
      where: { id },
      data: {
        title,
        description: description || null,
        features: features || [],
        duration: parseInt(duration),
        price: parseFloat(price),
      },
    });

    return NextResponse.json(service);
  } catch (error: any) {
    console.error("Failed to update service:", error);
    return NextResponse.json({ error: error.message || "Failed to update service" }, { status: 500 });
  } finally {
    // await prismaInstance.$disconnect();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Await the params since it's now a Promise
    const { id } = await context.params;

    await prismaInstance.$transaction([
      prismaInstance.serviceEmployee.deleteMany({
        where: { serviceId: id },
      }),
      prismaInstance.appointment.deleteMany({
        where: { serviceId: id },
      }),
      prismaInstance.service.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: "Service deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete service:", error);
    return NextResponse.json({ error: error.message || "Failed to delete service" }, { status: 500 });
  } finally {
    // await prismaInstance.$disconnect();
  }
}