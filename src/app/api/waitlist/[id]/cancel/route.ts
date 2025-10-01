import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelWaitlistEntry } from "@/lib/actions/waitlist";
import prismaInstance from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await request.json(); // We don't use the reason for now

    // Get waitlist entry to check ownership
    const waitlistEntry = await prismaInstance.waitlist.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!waitlistEntry) {
      return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
    }

    // Check if user can cancel this waitlist entry
    if (session.user.role === 'client' && waitlistEntry.clientId !== session.user.id) {
      return NextResponse.json({ error: "You can only cancel your own waitlist entries" }, { status: 403 });
    }

    const result = await cancelWaitlistEntry(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Waitlist entry cancelled successfully'
    });

  } catch (error: unknown) {
    console.error("Failed to cancel waitlist entry:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to cancel waitlist entry" 
    }, { status: 500 });
  }
}
