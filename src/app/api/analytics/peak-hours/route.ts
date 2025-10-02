import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculatePeakHours, formatOffPeakSlots } from "@/lib/analytics/peak-hours";
import { subDays, startOfDay, endOfDay } from "date-fns";

const DEFAULT_TIMEZONE = "Europe/London";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const employeeId = searchParams.get("employeeId");
    const timezone = searchParams.get("timezone") || DEFAULT_TIMEZONE;
    
    // Default to last 30 days if no date range provided
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    
    let from: Date;
    let to: Date;
    
    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
    } else {
      // Default to last 30 days
      to = endOfDay(new Date());
      from = startOfDay(subDays(to, 30));
    }

    // Validate date range
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (from >= to) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Calculate peak hours data
    const peakHoursData = await calculatePeakHours({
      serviceId: serviceId || undefined,
      employeeId: employeeId || undefined,
      from,
      to,
      timezone,
    });

    // Format suggested off-peak slots
    const suggestedSlots = formatOffPeakSlots(peakHoursData.suggestedOffPeak);

    return NextResponse.json({
      ...peakHoursData,
      suggestedSlots,
      dateRange: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      filters: {
        serviceId: serviceId || null,
        employeeId: employeeId || null,
        timezone,
      },
    });

  } catch (error: unknown) {
    console.error("Error calculating peak hours:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate peak hours" },
      { status: 500 }
    );
  }
}
