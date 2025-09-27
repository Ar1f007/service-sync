import { NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/email";

export async function POST() {
  try {
    await processEmailQueue();
    return NextResponse.json({ success: true, message: "Email queue processed" });
  } catch (error) {
    console.error("Failed to process email queue:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process email queue" },
      { status: 500 }
    );
  }
}
