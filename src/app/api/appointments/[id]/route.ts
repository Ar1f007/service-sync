// api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteAppointment, updateAppointment } from "@/lib/data/dashboard/appointments";

// Define the params type properly
type RouteContext = {
  params: Promise<{ id: string }>; // Note: params is now a Promise in Next.js 15
};

export async function PUT(request: NextRequest, context: RouteContext) { 
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Await the params since it's now a Promise
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") || "Europe/London";
    const updateData = await request.json(); // Get the raw JSON body

    const updatedAppointment = await updateAppointment(id, updateData, timezone);

    return NextResponse.json(updatedAppointment);
  } catch (error: any) {
    console.error("Failed to update appointment:", error);
    if (error.message === "Service not found" || error.message === "Client not found" || error.message === "Employee not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "Employee not assigned to this service" || error.message === "Time slot unavailable") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === "P2025") { // Prisma record not found error
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Await the params since it's now a Promise
    const { id } = await context.params;
    await deleteAppointment(id); // Use the new delete function
    return NextResponse.json({ message: "Appointment deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete appointment:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Failed to delete appointment" }, { status: 500 });
  }
}