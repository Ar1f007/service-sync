import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const CURRENCY = "£";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatPrice(val: number) {
	return `${CURRENCY}${(val || 0).toFixed(2)}`;
}


// Email processing configuration
export const EMAIL_PROCESSING_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
export const EMAIL_MAX_RETRY_ATTEMPTS = 3;
export const EMAIL_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds

// Email templates
export const EMAIL_TEMPLATES = {
  BOOKING_SUBMITTED: 'bookingSubmitted',
  APPOINTMENT_CONFIRMATION: 'appointmentConfirmation',
  APPOINTMENT_CANCELLATION: 'appointmentCancellation',
  APPOINTMENT_REMINDER: 'appointmentReminder',
  WAITLIST_NOTIFICATION: 'waitlistNotification',
  ADMIN_NOTIFICATION: 'adminNotification',
} as const;

// Application URLs
export const APP_URLS = {
  PRODUCTION: 'https://service-sync-lac.vercel.app',
  LOCAL: 'http://localhost:3000',
} as const;

// Email sender configuration
export const EMAIL_CONFIG = {
  FROM_NAME: 'ServiceSync',
  FROM_EMAIL: 'noreply@emails.ariflab.xyz',
  REPLY_TO: 'support@emails.ariflab.xyz',
} as const;