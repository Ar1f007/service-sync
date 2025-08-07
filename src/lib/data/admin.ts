import prismaInstance from "../db";

interface Service {
  id: string;
  title: string;
  price: number;
  duration: number;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null };
  employee: { id: string; user: { id: string; name: string | null } };
  dateTime: string;
  status: string;
}

export async function getAppointments(userId: string, role: string): Promise<Appointment[]> {
  try {
    const where: any = {};

    // For admins, fetch all appointments
    if (role === "admin") {
      // No filtering by userId or employeeId
    } else if (role === "staff") {
      // For staff, fetch only their appointments
      const employee = await prismaInstance.employee.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (employee) {
        where.employeeId = employee.id;
      } else {
        return [];
      }
    } else {
      // For other roles (e.g., client), no appointments
      return [];
    }

    const appointments = await prismaInstance.appointment.findMany({
      where,
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return appointments.map((appt) => ({
      id: appt.id,
      service: appt.service,
      client: appt.client,
      employee: {
        ...appt.employee,
        user: {
          ...appt.employee.user,
          name: appt.employee.user.name || "Unnamed",
        },
      },
      dateTime: appt.dateTime.toISOString(),
      status: appt.status,
    }));
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return [];
  }
}

export async function getServices(): Promise<Service[]> {
  try {
    return await prismaInstance.service.findMany({
      select: { id: true, title: true, price: true, duration: true },
    });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  }
}

export async function getClients(): Promise<User[]> {
  try {
    return await prismaInstance.user.findMany({
      where: { role: "client" },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}