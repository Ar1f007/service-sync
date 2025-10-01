#!/usr/bin/env node

/**
 * Waitlist Cleanup Script
 * 
 * This script cleans up expired waitlist entries and notifies the next person in queue.
 * Run this script periodically (e.g., every 5 minutes) to maintain the waitlist system.
 * 
 * Usage:
 *   node src/scripts/cleanup-waitlist.js
 *   pnpm waitlist:cleanup
 */

import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function cleanupExpiredWaitlistEntries() {
  console.log('Starting waitlist cleanup...');
  
  try {
    const now = new Date();
    
    // Find expired entries
    const expiredEntries = await prisma.waitlist.findMany({
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

    if (expiredEntries.length === 0) {
      console.log('No expired waitlist entries found.');
      return;
    }

    console.log(`Found ${expiredEntries.length} expired waitlist entries.`);

    // Update expired entries
    await prisma.waitlist.updateMany({
      where: {
        id: { in: expiredEntries.map(entry => entry.id) },
      },
      data: { status: 'expired' },
    });

    console.log(`Marked ${expiredEntries.length} entries as expired.`);

    // For each expired notified entry, notify the next person
    const notifiedEntries = expiredEntries.filter(entry => entry.status === 'notified');
    
    for (const entry of notifiedEntries) {
      try {
        await notifyNextInWaitlist(entry);
        console.log(`Notified next person for service ${entry.service.title} at ${entry.requestedDateTime}`);
      } catch (error) {
        console.error(`Failed to notify next person for entry ${entry.id}:`, error);
      }
    }

    console.log('Waitlist cleanup completed successfully.');
    
  } catch (error) {
    console.error('Error during waitlist cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function notifyNextInWaitlist(expiredEntry) {
  // Find the next person in the waitlist for the same time slot
  const nextInQueue = await prisma.waitlist.findFirst({
    where: {
      serviceId: expiredEntry.serviceId,
      employeeId: expiredEntry.employeeId,
      requestedDateTime: expiredEntry.requestedDateTime,
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
    console.log(`No one waiting for service ${expiredEntry.service.title} at ${expiredEntry.requestedDateTime}`);
    return;
  }

  // Set notification expiration (15 minutes)
  const notificationExpiresAt = new Date();
  notificationExpiresAt.setMinutes(notificationExpiresAt.getMinutes() + 15);

  // Update waitlist entry status
  await prisma.waitlist.update({
    where: { id: nextInQueue.id },
    data: {
      status: 'notified',
      notificationSentAt: new Date(),
      notificationExpiresAt,
    },
  });

  // Send notification email (if email service is configured)
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dummy-key') {
    try {
      const { sendWaitlistNotification } = await import('../lib/email.js');
      await sendWaitlistNotification({
        ...nextInQueue,
        position: nextInQueue.position,
      });
      console.log(`Sent notification email to ${nextInQueue.client.email}`);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the operation if email fails
    }
  } else {
    console.log('Email service not configured, skipping notification email');
  }
}

// Run the cleanup
cleanupExpiredWaitlistEntries().catch(console.error);
