'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { sendWaitlistNotification, sendWaitlistConfirmation } from '@/lib/email';

export async function addToWaitlist(
  clientId: string,
  serviceId: string,
  employeeId: string,
  requestedDateTime: Date,
  duration: number,
  selectedAddonIds: string[] = [],
  totalPrice?: number
) {
  try {
    // Check if user is already on waitlist for this time slot
    const existingWaitlist = await db.waitlist.findFirst({
      where: {
        clientId,
        serviceId,
        employeeId,
        requestedDateTime,
        status: { in: ['waiting', 'notified'] },
      },
    });

    if (existingWaitlist) {
      return {
        success: false,
        error: 'You are already on the waitlist for this time slot',
      };
    }

    // Get the current position in the queue
    const currentPosition = await db.waitlist.count({
      where: {
        serviceId,
        employeeId,
        requestedDateTime,
        status: { in: ['waiting', 'notified'] },
      },
    });

    // Set expiration time (e.g., 7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create waitlist entry
    const waitlistEntry = await db.waitlist.create({
      data: {
        clientId,
        serviceId,
        employeeId,
        requestedDateTime,
        duration,
        position: currentPosition + 1,
        expiresAt,
        selectedAddonIds,
        totalPrice,
      },
      include: {
        client: true,
        service: true,
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    revalidatePath('/dashboard/appointments');
    revalidatePath('/admin/waitlist');

    return {
      success: true,
      waitlistEntry,
    };
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getWaitlistEntries(
  serviceId?: string,
  employeeId?: string,
  status?: string
) {
  try {
    const where: any = {};
    
    if (serviceId) where.serviceId = serviceId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const waitlistEntries = await db.waitlist.findMany({
      where,
      include: {
        client: true,
        service: true,
        employee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { requestedDateTime: 'asc' },
        { position: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return { success: true, waitlistEntries };
  } catch (error) {
    console.error('Error fetching waitlist entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getUserWaitlistEntries(clientId: string) {
  try {
    const waitlistEntries = await db.waitlist.findMany({
      where: {
        clientId,
        status: { in: ['waiting', 'notified'] },
      },
      include: {
        service: true,
        employee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { requestedDateTime: 'asc' },
        { position: 'asc' },
      ],
    });

    return { success: true, waitlistEntries };
  } catch (error) {
    console.error('Error fetching user waitlist entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function notifyNextInWaitlist(
  serviceId: string,
  employeeId: string,
  requestedDateTime: Date
) {
  try {
    // Find the next person in the waitlist
    const nextInQueue = await db.waitlist.findFirst({
      where: {
        serviceId,
        employeeId,
        requestedDateTime,
        status: 'waiting',
      },
      include: {
        client: true,
        service: true,
        employee: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (!nextInQueue) {
      return {
        success: false,
        error: 'No one in waitlist for this time slot',
      };
    }

    // Set notification expiration (e.g., 15 minutes)
    const notificationExpiresAt = new Date();
    notificationExpiresAt.setMinutes(notificationExpiresAt.getMinutes() + 15);

    // Update waitlist entry status
    const updatedEntry = await db.waitlist.update({
      where: { id: nextInQueue.id },
      data: {
        status: 'notified',
        notificationSentAt: new Date(),
        notificationExpiresAt,
      },
      include: {
        client: true,
        service: true,
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    // Send notification email
    try {
      await sendWaitlistNotification(updatedEntry);
    } catch (emailError) {
      console.error('Failed to send waitlist notification email:', emailError);
      // Don't fail the operation if email fails
    }

    revalidatePath('/admin/waitlist');
    revalidatePath('/dashboard/appointments');

    return {
      success: true,
      waitlistEntry: updatedEntry,
    };
  } catch (error) {
    console.error('Error notifying next in waitlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function confirmWaitlistBooking(waitlistId: string) {
  try {
    const waitlistEntry = await db.waitlist.findUnique({
      where: { id: waitlistId },
      include: {
        client: true,
        service: true,
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!waitlistEntry) {
      return {
        success: false,
        error: 'Waitlist entry not found',
      };
    }

    if (waitlistEntry.status !== 'notified') {
      return {
        success: false,
        error: 'Waitlist entry is not in notified status',
      };
    }

    // Check if notification has expired
    if (waitlistEntry.notificationExpiresAt && new Date() > waitlistEntry.notificationExpiresAt) {
      // Move to next person in queue
      await db.waitlist.update({
        where: { id: waitlistId },
        data: { status: 'expired' },
      });

      // Notify next person
      await notifyNextInWaitlist(
        waitlistEntry.serviceId,
        waitlistEntry.employeeId,
        waitlistEntry.requestedDateTime
      );

      return {
        success: false,
        error: 'Notification has expired. You have been moved to the next person in queue.',
      };
    }

    // Create appointment
    const appointment = await db.appointment.create({
      data: {
        clientId: waitlistEntry.clientId,
        serviceId: waitlistEntry.serviceId,
        employeeId: waitlistEntry.employeeId,
        dateTime: waitlistEntry.requestedDateTime,
        status: 'confirmed',
        totalPrice: waitlistEntry.totalPrice,
      },
    });

    // Create appointment add-ons if any
    if (waitlistEntry.selectedAddonIds.length > 0) {
      const addons = await db.serviceAddon.findMany({
        where: {
          id: { in: waitlistEntry.selectedAddonIds },
          serviceId: waitlistEntry.serviceId,
          isActive: true,
        },
      });

      if (addons.length > 0) {
        await db.appointmentAddon.createMany({
          data: addons.map(addon => ({
            appointmentId: appointment.id,
            addonId: addon.id,
          })),
        });
      }
    }

    // Update waitlist entry
    await db.waitlist.update({
      where: { id: waitlistId },
      data: {
        status: 'confirmed',
        convertedToAppointmentId: appointment.id,
        convertedAt: new Date(),
      },
    });

    // Send confirmation email
    try {
      await sendWaitlistConfirmation(waitlistEntry, appointment);
    } catch (emailError) {
      console.error('Failed to send waitlist confirmation email:', emailError);
      // Don't fail the operation if email fails
    }

    revalidatePath('/admin/waitlist');
    revalidatePath('/dashboard/appointments');

    return {
      success: true,
      appointment,
    };
  } catch (error) {
    console.error('Error confirming waitlist booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function cancelWaitlistEntry(waitlistId: string) {
  try {
    const waitlistEntry = await db.waitlist.findUnique({
      where: { id: waitlistId },
    });

    if (!waitlistEntry) {
      return {
        success: false,
        error: 'Waitlist entry not found',
      };
    }

    if (waitlistEntry.status === 'confirmed') {
      return {
        success: false,
        error: 'Cannot cancel confirmed waitlist entry',
      };
    }

    // Update status to cancelled
    await db.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'cancelled' },
    });

    // If this was a notified entry, notify the next person
    if (waitlistEntry.status === 'notified') {
      await notifyNextInWaitlist(
        waitlistEntry.serviceId,
        waitlistEntry.employeeId,
        waitlistEntry.requestedDateTime
      );
    }

    revalidatePath('/admin/waitlist');
    revalidatePath('/dashboard/appointments');

    return { success: true };
  } catch (error) {
    console.error('Error cancelling waitlist entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function cleanupExpiredWaitlistEntries() {
  try {
    const now = new Date();
    
    // Find expired entries
    const expiredEntries = await db.waitlist.findMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          {
            status: 'notified',
            notificationExpiresAt: { lt: now },
          },
        ],
        status: { in: ['waiting', 'notified'] },
      },
    });

    if (expiredEntries.length === 0) {
      return { success: true, cleanedCount: 0 };
    }

    // Update expired entries
    await db.waitlist.updateMany({
      where: {
        id: { in: expiredEntries.map(entry => entry.id) },
      },
      data: { status: 'expired' },
    });

    // For each expired notified entry, notify the next person
    for (const entry of expiredEntries) {
      if (entry.status === 'notified') {
        await notifyNextInWaitlist(
          entry.serviceId,
          entry.employeeId,
          entry.requestedDateTime
        );
      }
    }

    revalidatePath('/admin/waitlist');

    return {
      success: true,
      cleanedCount: expiredEntries.length,
    };
  } catch (error) {
    console.error('Error cleaning up expired waitlist entries:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
