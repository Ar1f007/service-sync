import { PrismaClient } from "@/generated/prisma";
import EmployeesClient from "./_components/EmployeeClient";
import { getSession } from "@/lib/session";

interface Service {
  id: string;
  title: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
}

interface Employee {
  id: string;
  user: { name: string | null; email: string };
  serviceEmployees: { service: { id: string; title: string } }[];
  appointmentsToday: number;
}

async function fetchEmployees(): Promise<Employee[]> {
  const prisma = new PrismaClient();
  try {
    const today = new Date("2025-08-05T00:00:00+06:00");
    const tomorrow = new Date("2025-08-06T00:00:00+06:00");
    const employees = await prisma.employee.findMany({
      include: {
        user: { select: { name: true, email: true } },
        serviceEmployees: { include: { service: { select: { id: true, title: true } } } },
        appointments: {
          where: {
            dateTime: {
              gte: today,
              lt: tomorrow,
            },
          },
        },
      },
    });
    return employees.map((emp) => ({
      id: emp.id,
      user: emp.user,
      serviceEmployees: emp.serviceEmployees,
      appointmentsToday: emp.appointments.length,
    }));
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchAvailableUsers(): Promise<User[]> {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: {
        employeeInfo: { none: {} }, // Users without Employee relation
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    return users;
  } catch (error) {
    console.error("Failed to fetch available users:", error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchServices(): Promise<Service[]> {
  const prisma = new PrismaClient();
  try {
    const services = await prisma.service.findMany({
      select: { id: true, title: true },
    });
    return services;
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

export default async function AdminEmployeesPage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return {
      redirect: {
        destination: "/sign-in",
        permanent: false,
      },
    };
  }

  const [employees, availableUsers, services] = await Promise.all([
    fetchEmployees(),
    fetchAvailableUsers(),
    fetchServices(),
  ]);

  return (
    <EmployeesClient
      initialEmployees={employees}
      availableUsers={availableUsers}
      availableServices={services}
    />
  );
}