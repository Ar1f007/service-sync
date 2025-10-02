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
  role: string;
}

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null; email: string; role: string };
  employee: { id: string; user: { id: string; name: string | null } };
  dateTime: string;
  status: string;
  totalPrice: number;
  addons: { id: string; name: string; price: number; duration: number }[];
  cancelledBy?: string;
  cancelledByRole?: string;
  cancellationReason?: string;
  appointmentAddons?: { addon: { id: string; name: string; price: number; duration: number } }[];
}

export async function getAppointments(
  userId: string, 
  role: string, 
  page: number = 1, 
  limit: number = 20
): Promise<{ appointments: Appointment[]; total: number; totalPages: number }> {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: noneed
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
        return { appointments: [], total: 0, totalPages: 0 };
      }
    } else {
      // For other roles (e.g., client), no appointments
      return { appointments: [], total: 0, totalPages: 0 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await prismaInstance.appointment.count({
      where: {
        ...where,
      },
    });

    const appointments = await prismaInstance.appointment.findMany({
      where: {
        ...where,
      },
      include: {
        service: { select: { id: true, title: true, price: true, duration: true } },
        client: { select: { id: true, name: true, email: true, role: true } },
        employee: { include: { user: { select: { id: true, name: true } } } },
        appointmentAddons: {
          include: {
            addon: { select: { id: true, name: true, price: true, duration: true } },
          },
        },
      },
      orderBy: {
        dateTime: 'desc', // Latest appointments first
      },
      skip,
      take: limit,
    });

    // All appointments are valid since clientId is required in schema
    const validAppointments = appointments;

    const processedAppointments = validAppointments.map((appt) => ({
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
      totalPrice: appt.totalPrice || 0,
      addons: appt.appointmentAddons.map(aa => aa.addon),
      cancelledBy: appt.cancelledBy || undefined,
      cancelledByRole: appt.cancelledByRole || undefined,
      cancellationReason: appt.cancellationReason || undefined,
      appointmentAddons: appt.appointmentAddons,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      appointments: processedAppointments,
      total,
      totalPages,
    };
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return { appointments: [], total: 0, totalPages: 0 };
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
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}