import { NextResponse } from "next/server";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { isValid } from "date-fns";
import prismaInstance from "@/lib/db";

const DEFAULT_TIMEZONE = "Europe/London";

export interface SlotAvailability {
  slot: string;
  available: boolean;
  conflictCount: number;
  status: 'available' | 'waitlist' | 'full';
  recommendedEmployee?: {
    id: string;
    name: string;
    workloadScore: number;
  };
}

export interface AvailabilityResponse {
  slots: SlotAvailability[];
  suggestedSlots?: SlotAvailability[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const date = searchParams.get("date");
    const timezone = searchParams.get("timezone") || DEFAULT_TIMEZONE;
    const includeSuggestions = searchParams.get("includeSuggestions") === "true";

    if (!serviceId || !date) {
      return NextResponse.json(
        { error: "serviceId and date are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Get service details
    const service = await prismaInstance.service.findUnique({
      where: { id: serviceId },
      select: { id: true, title: true, duration: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Get all employees qualified for this service
    const serviceEmployees = await prismaInstance.serviceEmployee.findMany({
      where: { serviceId },
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (serviceEmployees.length === 0) {
      return NextResponse.json({
        slots: [],
        suggestedSlots: [],
      });
    }

    const employeeIds = serviceEmployees.map(se => se.employeeId);

    // Generate time slots (9:00 AM to 5:30 PM, 30-min intervals)
    const startHour = 9;
    const endHour = 17.5; // 5:30 PM
    const interval = 30; // minutes
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour += interval / 60) {
      const hours = Math.floor(hour);
      const minutes = (hour % 1) * 60;
      const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      slots.push(time);
    }

    // Get all appointments for all qualified employees on this date
    const zonedDate = fromZonedTime(new Date(`${date}T00:00:00`), timezone);
    const dayStart = zonedDate;
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await prismaInstance.appointment.findMany({
      where: {
        employeeId: { in: employeeIds },
        dateTime: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: { in: ['confirmed', 'pending'] }, // Only count active appointments
      },
      include: {
        service: { select: { duration: true } },
        appointmentAddons: {
          include: {
            addon: { select: { duration: true } },
          },
        },
        employee: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    // Calculate slot availability
    const slotsWithAvailability: SlotAvailability[] = [];

    for (const slot of slots) {
      const slotDateTimeStr = `${date}T${slot}:00`;
      const slotDate = new Date(slotDateTimeStr);
      
      if (!isValid(slotDate)) {
        slotsWithAvailability.push({
          slot,
          available: false,
          conflictCount: 0,
          status: 'full',
        });
        continue;
      }

      const slotStart = toZonedTime(slotDate, timezone);
      const slotEnd = new Date(slotStart.getTime() + service.duration * 60 * 1000);

      if (!isValid(slotStart) || !isValid(slotEnd)) {
        slotsWithAvailability.push({
          slot,
          available: false,
          conflictCount: 0,
          status: 'full',
        });
        continue;
      }

      // Count conflicts with existing appointments
      const conflicts = appointments.filter((appt) => {
        const apptDate = new Date(appt.dateTime);
        if (!isValid(apptDate)) return false;

        const apptStart = toZonedTime(apptDate, timezone);
        const apptDuration = appt.service.duration + 
          appt.appointmentAddons.reduce((sum, addon) => sum + addon.addon.duration, 0);
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60 * 1000);

        if (!isValid(apptStart) || !isValid(apptEnd)) return false;

        // Check for overlap
        return (
          (slotStart >= apptStart && slotStart < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (slotStart <= apptStart && slotEnd >= apptEnd)
        );
      });

      const conflictCount = conflicts.length;
      let status: 'available' | 'waitlist' | 'full';
      let available = false;

      if (conflictCount === 0) {
        status = 'available';
        available = true;
      } else if (conflictCount === 1) {
        status = 'waitlist';
        available = true; // Still bookable, goes to waitlist
      } else {
        status = 'full';
        available = false;
      }

      // Employee recommendation removed for performance - will be assigned during booking
      slotsWithAvailability.push({
        slot,
        available,
        conflictCount,
        status,
      });
    }

    // Get suggested alternative slots if requested
    let suggestedSlots: SlotAvailability[] = [];
    if (includeSuggestions) {
      // Find slots that are available (not full)
      const availableSlots = slotsWithAvailability.filter(s => s.status !== 'full');
      
      // Sort by soonest time and take first 5
      suggestedSlots = availableSlots
        .sort((a, b) => a.slot.localeCompare(b.slot))
        .slice(0, 5);
    }

    return NextResponse.json({
      slots: slotsWithAvailability,
      suggestedSlots: includeSuggestions ? suggestedSlots : undefined,
    });

  } catch (error: unknown) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
