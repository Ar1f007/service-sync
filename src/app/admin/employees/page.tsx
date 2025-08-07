import prismaInstance from "@/lib/db";
import EmployeesClient from "./_components/EmployeeClient";
import { getSession } from "@/lib/session";
import { addDays, startOfToday } from "date-fns";

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

  try {
    const today = startOfToday();
    const tomorrow = addDays(today, 1);
    const employees = await prismaInstance.employee.findMany({
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
  }
}

async function fetchAvailableUsers(): Promise<User[]> {
  try {
    const users = await prismaInstance.user.findMany({
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
  }
}

async function fetchServices(): Promise<Service[]> {
  try {
    const services = await prismaInstance.service.findMany({
      select: { id: true, title: true },
    });
    return services;
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  } finally {
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