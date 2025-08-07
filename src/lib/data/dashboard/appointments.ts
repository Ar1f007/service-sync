import prismaInstance from "@/lib/db";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

interface AppointmentUpdateData {
  serviceId?: string;
  clientId?: string;
  employeeId?: string;
  dateTime?: string; // ISO string from client
  status?: string;
}

interface Appointment {
  id: string;
  service: { id: string; title: string; price: number; duration: number };
  client: { id: string; name: string | null };
  employee: { id: string; user: { id: string; name: string } };
  dateTime: string; // ISO string
  status: string;
}

/**
 * Updates an existing appointment.
 * Performs validation checks for relations and time conflicts.
 */
export async function updateAppointment(
  id: string,
  data: AppointmentUpdateData,
  timezone: string = "Europe/London"
): Promise<Appointment> {
  const { serviceId, clientId, employeeId, dateTime, status } = data;

  // Validate relations if provided
  if (serviceId || clientId || employeeId) {
    const [service, client, employee, serviceEmployee] = await Promise.all([
      serviceId ? prismaInstance.service.findUnique({ where: { id: serviceId }, select: { id: true, title: true, price: true, duration: true } }) : null,
      clientId ? prismaInstance.user.findUnique({ where: { id: clientId }, select: { id: true, name: true } }) : null,
      employeeId ? prismaInstance.employee.findUnique({ where: { id: employeeId }, include: { user: { select: { id: true, name: true } } } }) : null,
      serviceId && employeeId ? prismaInstance.serviceEmployee.findFirst({ where: { serviceId, employeeId } }) : null,
    ]);

    if (serviceId && !service) throw new Error("Service not found");
    if (clientId && !client) throw new Error("Client not found");
    if (employeeId && !employee) throw new Error("Employee not found");
    if (serviceId && employeeId && !serviceEmployee) {
      throw new Error("Employee not assigned to this service");
    }

    // Conflict check if dateTime and employeeId are provided
    if (dateTime && employeeId && service) {
      const start = fromZonedTime(new Date(dateTime), timezone);
      const end = new Date(start.getTime() + service.duration * 60 * 1000);

      const conflicting = await prismaInstance.appointment.findFirst({
        where: {
          employeeId,
          dateTime: {
            gte: start,
            lt: end,
          },
          NOT: { id }, // Exclude the current appointment
        },
      });

      if (conflicting) {
        throw new Error("Time slot unavailable");
      }
    }
  }

  const updateData: any = {};
  if (serviceId) updateData.serviceId = serviceId;
  if (clientId) updateData.clientId = clientId;
  if (employeeId) updateData.employeeId = employeeId;
  if (dateTime) updateData.dateTime = fromZonedTime(new Date(dateTime), timezone);
  if (status) updateData.status = status;

  const updatedAppointment = await prismaInstance.appointment.update({
    where: { id },
    data: updateData,
    include: {
      service: { select: { id: true, title: true, price: true, duration: true } },
      client: { select: { id: true, name: true } },
      employee: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return {
    id: updatedAppointment.id,
    service: updatedAppointment.service,
    client: updatedAppointment.client,
    employee: {
        ...updatedAppointment.employee,
        user: {
            ...updatedAppointment.employee.user,
            name: updatedAppointment.employee.user.name || ""
        }
    },
    dateTime: toZonedTime(updatedAppointment.dateTime, timezone).toISOString(),
    status: updatedAppointment.status,
  };
}

/**
 * Deletes an appointment by ID.
 */
export async function deleteAppointment(id: string): Promise<void> {
  await prismaInstance.appointment.delete({
    where: { id },
  });
}