import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {  fromZonedTime } from "date-fns-tz";
import { startOfDay, endOfDay } from "date-fns";
import prismaInstance from "@/lib/db";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const timezone = searchParams.get("timezone") || "Europe/London";

  try {
    // Calculate today’s date range in the specified timezone
    const now = new Date();
    const today = startOfDay(fromZonedTime(now, timezone));
    const tomorrow = endOfDay(fromZonedTime(now, timezone));

    const employees = await prismaInstance.employee.findMany({
      where: serviceId ? { serviceEmployees: { some: { serviceId } } } : {},
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

    return NextResponse.json({
      employees: employees.map((emp) => ({
        id: emp.id,
        user: emp.user,
        serviceEmployees: emp.serviceEmployees,
        appointmentsToday: emp.appointments.length,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  } finally {
    // await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { userId, serviceIds, timezone = "Europe/London" } = await request.json();

    if (!userId || !serviceIds || !Array.isArray(serviceIds)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    const user = await prismaInstance.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user role to "staff"
    await prismaInstance.user.update({
      where: { id: userId },
      data: { role: "staff" },
    });

    // Create Employee
    const employee = await prismaInstance.employee.create({
      data: { userId },
    });

    // Create ServiceEmployee records
    if (serviceIds.length > 0) {
      await prismaInstance.serviceEmployee.createMany({
        data: serviceIds.map((serviceId: string) => ({
          employeeId: employee.id,
          serviceId,
        })),
      });
    }

    // Calculate today’s date range in the specified timezone
    const now = new Date();
    const today = startOfDay(fromZonedTime(now, timezone));
    const tomorrow = endOfDay(fromZonedTime(now, timezone));

    // Fetch the created employee with relations
    const newEmployee = await prismaInstance.employee.findUnique({
      where: { id: employee.id },
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

    return NextResponse.json(
      {
        id: newEmployee?.id,
        user: newEmployee?.user,
        serviceEmployees: newEmployee?.serviceEmployees,
        appointmentsToday: newEmployee?.appointments.length || 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create employee:", error);
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 500 });
  } finally {
    // await prismaInstance.$disconnect();
  }
}