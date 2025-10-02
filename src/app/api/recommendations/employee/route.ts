import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recommendEmployee, getRecommendations } from "@/lib/recommendation/workload";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { 
      serviceId, 
      dateTime, 
      duration, 
      timezone = "Europe/London",
      limit = 5 
    } = await request.json();

    if (!serviceId || !dateTime || !duration) {
      return NextResponse.json(
        { error: "serviceId, dateTime, and duration are required" },
        { status: 400 }
      );
    }

    // Get single recommendation
    const recommendation = await recommendEmployee({
      serviceId,
      dateTime: new Date(dateTime),
      duration,
      timezone,
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: "No qualified staff available for this service" },
        { status: 404 }
      );
    }

    // Get multiple recommendations for comparison
    const allRecommendations = await getRecommendations({
      serviceId,
      dateTime: new Date(dateTime),
      duration,
      timezone,
    }, limit);

    return NextResponse.json({
      recommended: recommendation,
      alternatives: allRecommendations.slice(1), // Exclude the top recommendation
      allRecommendations,
    });

  } catch (error: unknown) {
    console.error("Error getting employee recommendations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
