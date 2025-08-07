import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { endOfDay, startOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();

// Define the params type properly
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Await the params since it's now a Promise
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") || "Europe/London";
    const { serviceIds } = await request.json();

    // Delete existing ServiceEmployee records
    await prisma.serviceEmployee.deleteMany({
      where: { employeeId: id },
    });

    // Create new ServiceEmployee records
    if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
      await prisma.serviceEmployee.createMany({
        data: serviceIds.map((serviceId: string) => ({
          employeeId: id,
          serviceId,
        })),
      });
    }

    // Calculate today's date range in the specified timezone
    const now = new Date();
    const today = startOfDay(fromZonedTime(now, timezone));
    const tomorrow = endOfDay(fromZonedTime(now, timezone));

    // Fetch updated employee
    const updatedEmployee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        serviceEmployees: { include: { service: { select: { id: true, title: true } } } },
        appointments: {
          where: {
            dateTime: {
              gte: today,
              lte: tomorrow,
            },
          },
        },
      },
    });

    if (!updatedEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedEmployee.id,
      user: updatedEmployee.user,
      serviceEmployees: updatedEmployee.serviceEmployees,
      appointmentsToday: updatedEmployee.appointments.length || 0,
    });
  } catch (error: any) {
    console.error("Failed to update employee:", error);
    return NextResponse.json({ error: error.message || "Failed to update employee" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Await the params since it's now a Promise
    const { id } = await context.params;

    // Delete related ServiceEmployee records
    await prisma.serviceEmployee.deleteMany({
      where: { employeeId: id },
    });

    // Delete related Appointment records
    await prisma.appointment.deleteMany({
      where: { employeeId: id },
    });

    // Delete the Employee
    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Employee deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to delete employee:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Failed to delete employee" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}