import prismaInstance from "@/lib/db";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

// Configuration constants
const WORKLOAD_WINDOW_DAYS = 7;
const MAX_WEEKLY_MINUTES = 2400; // 40 hours * 60 minutes
const DEFAULT_TIMEZONE = "Europe/London";

export interface WorkloadRecommendation {
  employeeId: string;
  employeeName: string;
  workloadScore: number;
  bookedMinutes: number;
  maxMinutes: number;
  isConflictFree: boolean;
  lastAssignedAt?: Date;
}

export interface RecommendationOptions {
  serviceId: string;
  dateTime: Date;
  duration: number; // in minutes
  timezone?: string;
}

/**
 * Calculate workload score for an employee
 * WorkloadScore = total booked minutes in next 7 days / max allowed minutes
 */
export async function calculateWorkloadScore(
  employeeId: string,
  timezone: string = DEFAULT_TIMEZONE
): Promise<{
  workloadScore: number;
  bookedMinutes: number;
  maxMinutes: number;
}> {
  const now = new Date();
  const windowStart = toZonedTime(now, timezone);
  const windowEnd = new Date(windowStart.getTime() + WORKLOAD_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Get all appointments for this employee in the next 7 days
  const appointments = await prismaInstance.appointment.findMany({
    where: {
      employeeId,
      dateTime: {
        gte: windowStart,
        lt: windowEnd,
      },
      status: {
        in: ['confirmed', 'pending', 'waitlist'], // Count active appointments
      },
    },
    include: {
      service: { select: { duration: true } },
      appointmentAddons: {
        include: {
          addon: { select: { duration: true } },
        },
      },
    },
  });

  // Calculate total booked minutes
  const bookedMinutes = appointments.reduce((total, appointment) => {
    const serviceDuration = appointment.service.duration;
    const addonDuration = appointment.appointmentAddons.reduce(
      (sum, addon) => sum + addon.addon.duration,
      0
    );
    return total + serviceDuration + addonDuration;
  }, 0);

  const maxMinutes = MAX_WEEKLY_MINUTES;
  const workloadScore = bookedMinutes / maxMinutes;

  return {
    workloadScore,
    bookedMinutes,
    maxMinutes,
  };
}

/**
 * Check if an employee has conflicts at the requested time slot
 */
export async function checkTimeConflict(
  employeeId: string,
  dateTime: Date,
  duration: number,
  timezone: string = DEFAULT_TIMEZONE
): Promise<boolean> {
  const start = fromZonedTime(dateTime, timezone);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const conflictingAppointments = await prismaInstance.appointment.findMany({
    where: {
      employeeId,
      dateTime: {
        gte: start,
        lt: end,
      },
      status: {
        in: ['confirmed', 'pending'], // Only count active appointments (not waitlist)
      },
    },
  });

  return conflictingAppointments.length > 0;
}

/**
 * Get the last assigned appointment for an employee (for tie-breaking)
 */
export async function getLastAssignedAt(employeeId: string): Promise<Date | undefined> {
  const lastAppointment = await prismaInstance.appointment.findFirst({
    where: {
      employeeId,
    },
    orderBy: {
      dateTime: 'desc',
    },
    select: {
      dateTime: true,
    },
  });

  return lastAppointment?.dateTime;
}

/**
 * Recommend the best employee for a service at a specific time
 * Returns the employee with the lowest workload score who is conflict-free
 * If no conflict-free employee, returns the least loaded employee anyway
 */
export async function recommendEmployee(
  options: RecommendationOptions
): Promise<WorkloadRecommendation | null> {
  const { serviceId, dateTime, duration, timezone = DEFAULT_TIMEZONE } = options;

  // Get all employees qualified for this service
  const serviceEmployees = await prismaInstance.serviceEmployee.findMany({
    where: {
      serviceId,
    },
    include: {
      employee: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (serviceEmployees.length === 0) {
    return null;
  }

  // Calculate workload scores and check conflicts for all eligible employees
  const recommendations: WorkloadRecommendation[] = [];

  for (const serviceEmployee of serviceEmployees) {
    const employeeId = serviceEmployee.employeeId;
    const employeeName = serviceEmployee.employee.user.name || 'Unknown Employee';

    const { workloadScore, bookedMinutes, maxMinutes } = await calculateWorkloadScore(
      employeeId,
      timezone
    );

    const isConflictFree = !(await checkTimeConflict(employeeId, dateTime, duration, timezone));
    const lastAssignedAt = await getLastAssignedAt(employeeId);

    recommendations.push({
      employeeId,
      employeeName,
      workloadScore,
      bookedMinutes,
      maxMinutes,
      isConflictFree,
      lastAssignedAt,
    });
  }

  // Sort by workload score (ascending), then by conflict-free status, then by last assigned (ascending)
  recommendations.sort((a, b) => {
    // Primary: workload score (lower is better)
    if (a.workloadScore !== b.workloadScore) {
      return a.workloadScore - b.workloadScore;
    }

    // Secondary: conflict-free status (true first)
    if (a.isConflictFree !== b.isConflictFree) {
      return a.isConflictFree ? -1 : 1;
    }

    // Tertiary: least recently assigned (older lastAssignedAt first)
    if (a.lastAssignedAt && b.lastAssignedAt) {
      return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    }

    // If one has lastAssignedAt and other doesn't, prioritize the one without
    if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
    if (!a.lastAssignedAt && b.lastAssignedAt) return -1;

    return 0;
  });

  return recommendations[0] || null;
}

/**
 * Get multiple recommendations sorted by preference
 * Useful for showing alternatives or admin tools
 */
export async function getRecommendations(
  options: RecommendationOptions,
  limit: number = 5
): Promise<WorkloadRecommendation[]> {
  const { serviceId, dateTime, duration, timezone = DEFAULT_TIMEZONE } = options;

  // Get all employees qualified for this service
  const serviceEmployees = await prismaInstance.serviceEmployee.findMany({
    where: {
      serviceId,
    },
    include: {
      employee: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (serviceEmployees.length === 0) {
    return [];
  }

  // Calculate workload scores and check conflicts for all eligible employees
  const recommendations: WorkloadRecommendation[] = [];

  for (const serviceEmployee of serviceEmployees) {
    const employeeId = serviceEmployee.employeeId;
    const employeeName = serviceEmployee.employee.user.name || 'Unknown Employee';

    const { workloadScore, bookedMinutes, maxMinutes } = await calculateWorkloadScore(
      employeeId,
      timezone
    );

    const isConflictFree = !(await checkTimeConflict(employeeId, dateTime, duration, timezone));
    const lastAssignedAt = await getLastAssignedAt(employeeId);

    recommendations.push({
      employeeId,
      employeeName,
      workloadScore,
      bookedMinutes,
      maxMinutes,
      isConflictFree,
      lastAssignedAt,
    });
  }

  // Sort by workload score (ascending), then by conflict-free status, then by last assigned (ascending)
  recommendations.sort((a, b) => {
    // Primary: workload score (lower is better)
    if (a.workloadScore !== b.workloadScore) {
      return a.workloadScore - b.workloadScore;
    }

    // Secondary: conflict-free status (true first)
    if (a.isConflictFree !== b.isConflictFree) {
      return a.isConflictFree ? -1 : 1;
    }

    // Tertiary: least recently assigned (older lastAssignedAt first)
    if (a.lastAssignedAt && b.lastAssignedAt) {
      return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    }

    // If one has lastAssignedAt and other doesn't, prioritize the one without
    if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
    if (!a.lastAssignedAt && b.lastAssignedAt) return -1;

    return 0;
  });

  return recommendations.slice(0, limit);
}
