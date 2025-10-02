import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAppointments } from "@/lib/data/admin";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    }

    const result = await getAppointments("", "admin", page, limit);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Failed to fetch admin appointments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
