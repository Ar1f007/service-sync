import { Resend } from 'resend';
import prismaInstance from './db';
import { EMAIL_MAX_RETRY_ATTEMPTS, EMAIL_RETRY_DELAY } from './utils';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key');

export interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  render: (data: any) => string;
}

// Email templates registry
const emailTemplates: Record<string, EmailTemplate> = {
  bookingSubmitted: {
    name: 'bookingSubmitted',
    subject: 'Booking Submitted - Awaiting Confirmation - ServiceSync',
    render: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Booking Submitted Successfully!</h2>
        <p>Dear ${data.customer.name},</p>
        <p>Thank you for booking with ServiceSync! Your appointment has been submitted and is currently awaiting confirmation from our team.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Appointment Details</h3>
          <p><strong>Service:</strong> ${data.appointment.service.title}</p>
          <p><strong>Date:</strong> ${new Date(data.appointment.dateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(data.appointment.dateTime).toLocaleTimeString()}</p>
          <p><strong>Duration:</strong> ${data.appointment.service.duration} minutes</p>
          <p><strong>Price:</strong> £${data.appointment.service.price.toFixed(2)}</p>
          <p><strong>Staff:</strong> ${data.appointment.employee.user.name}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Confirmation</span></p>
        </div>
        
        <p>We'll review your booking and send you a confirmation email once it's approved. This usually takes a few minutes during business hours.</p>
        <p>If you have any questions or need to make changes, please contact us as soon as possible.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://service-sync-lac.vercel.app/dashboard/appointments" 
             style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            View My Bookings
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center;">
          Best regards,<br />
          The ServiceSync Team
        </p>
      </div>
    `,
  },
  appointmentConfirmation: {
    name: 'appointmentConfirmation',
    subject: 'Appointment Confirmed - ServiceSync',
    render: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Appointment Confirmed</h2>
        <p>Dear ${data.customer.name},</p>
        <p>Your appointment has been successfully confirmed!</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Appointment Details</h3>
          <p><strong>Service:</strong> ${data.appointment.service.title}</p>
          <p><strong>Date:</strong> ${new Date(data.appointment.dateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(data.appointment.dateTime).toLocaleTimeString()}</p>
          <p><strong>Duration:</strong> ${data.appointment.service.duration} minutes</p>
          <p><strong>Price:</strong> £${data.appointment.service.price.toFixed(2)}</p>
          <p><strong>Staff:</strong> ${data.appointment.employee.user.name}</p>
        </div>
        
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>ServiceSync Team</p>
      </div>
    `
  },
  
  appointmentReminder: {
    name: 'appointmentReminder',
    subject: 'Appointment Reminder - ServiceSync',
    render: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Appointment Reminder</h2>
        <p>Dear ${data.customer.name},</p>
        <p>This is a friendly reminder about your upcoming appointment.</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3>Appointment Details</h3>
          <p><strong>Service:</strong> ${data.appointment.service.title}</p>
          <p><strong>Date:</strong> ${new Date(data.appointment.dateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(data.appointment.dateTime).toLocaleTimeString()}</p>
          <p><strong>Duration:</strong> ${data.appointment.service.duration} minutes</p>
          <p><strong>Staff:</strong> ${data.appointment.employee.user.name}</p>
        </div>
        
        <p>Please arrive 10 minutes early for your appointment.</p>
        <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
        <p>Best regards,<br>ServiceSync Team</p>
      </div>
    `
  },
  
  appointmentCancellation: {
    name: 'appointmentCancellation',
    subject: 'Appointment Cancelled - ServiceSync',
    render: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Appointment Cancelled</h2>
        <p>Dear ${data.customer.name},</p>
        <p>Your appointment has been cancelled.</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3>Cancelled Appointment Details</h3>
          <p><strong>Service:</strong> ${data.appointment.service.title}</p>
          <p><strong>Date:</strong> ${new Date(data.appointment.dateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(data.appointment.dateTime).toLocaleTimeString()}</p>
          <p><strong>Staff:</strong> ${data.appointment.employee.user.name}</p>
        </div>
        
        <p>If you would like to book a new appointment, please visit our booking page.</p>
        <p>Best regards,<br>ServiceSync Team</p>
      </div>
    `
  },
  
  waitlistNotification: {
    name: 'waitlistNotification',
    subject: 'Slot Available - ServiceSync',
    render: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Slot Available!</h2>
        <p>Dear ${data.customer.name},</p>
        <p>Great news! A slot has become available for your requested service.</p>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3>Available Slot</h3>
          <p><strong>Service:</strong> ${data.appointment.service.title}</p>
          <p><strong>Date:</strong> ${new Date(data.appointment.dateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(data.appointment.dateTime).toLocaleTimeString()}</p>
          <p><strong>Duration:</strong> ${data.appointment.service.duration} minutes</p>
          <p><strong>Price:</strong> £${data.appointment.service.price.toFixed(2)}</p>
          <p><strong>Staff:</strong> ${data.appointment.employee.user.name}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>⏰ Important:</strong> This slot is only available for the next 15 minutes. Please book quickly to secure your appointment.</p>
        </div>
        
        <p>Click the button below to book this slot:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/book?slot=${data.appointment.id}" 
           style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Book This Slot
        </a>
        
        <p>Best regards,<br>ServiceSync Team</p>
      </div>
    `
  },
  
  adminNotification: {
    name: 'adminNotification',
    subject: 'New Booking - ServiceSync Admin',
    render: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">New Booking Received</h2>
        <p>A new appointment has been booked.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Booking Details</h3>
          <p><strong>Customer:</strong> ${data.customer.name} (${data.customer.email})</p>
          <p><strong>Service:</strong> ${data.appointment.service.title}</p>
          <p><strong>Date:</strong> ${new Date(data.appointment.dateTime).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(data.appointment.dateTime).toLocaleTimeString()}</p>
          <p><strong>Duration:</strong> ${data.appointment.service.duration} minutes</p>
          <p><strong>Price:</strong> £${data.appointment.service.price.toFixed(2)}</p>
          <p><strong>Staff:</strong> ${data.appointment.employee.user.name}</p>
        </div>
        
        <p>Please check your admin dashboard for more details.</p>
        <p>ServiceSync System</p>
      </div>
    `
  }
};

export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'dummy-key') {
      console.log('Resend API key not configured, skipping email send:', emailData.subject);
      return true; // Return true to avoid failing the booking process
    }

    const template = emailTemplates[emailData.template];
    if (!template) {
      throw new Error(`Email template '${emailData.template}' not found`);
    }

    const html = template.render(emailData.data);
    
    const result = await resend.emails.send({
      from: 'ServiceSync <noreply@emails.ariflab.xyz>', // Use your verified domain
      to: emailData.to,
      subject: emailData.subject,
      html: html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function queueEmail(emailData: EmailData): Promise<void> {
  try {
    await prismaInstance.emailQueue.create({
      data: {
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        data: emailData.data,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Failed to queue email:', error);
    throw error;
  }
}

export async function processEmailQueue(): Promise<void> {
  try {
    const pendingEmails = await prismaInstance.emailQueue.findMany({
      where: {
        status: 'pending',
        attempts: { lt: EMAIL_MAX_RETRY_ATTEMPTS }, 
        OR: [
          { lastAttempt: null },
          { lastAttempt: { lte: new Date(Date.now() - EMAIL_RETRY_DELAY) } } 
        ]
      },
      take: 10, // Process 10 emails at a time
    });

    for (const email of pendingEmails) {
      try {
        const success = await sendEmail({
          to: email.to,
          subject: email.subject,
          template: email.template,
          data: email.data as Record<string, unknown>,
        });

        if (success) {
          await prismaInstance.emailQueue.update({
            where: { id: email.id },
            data: {
              status: 'sent',
              lastAttempt: new Date(),
            },
          });
        } else {
          throw new Error('Email sending failed');
        }
      } catch (error) {
        await prismaInstance.emailQueue.update({
          where: { id: email.id },
          data: {
            attempts: email.attempts + 1,
            lastAttempt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            status: email.attempts + 1 >= 3 ? 'failed' : 'pending',
          },
        });
      }
    }
  } catch (error) {
    console.error('Failed to process email queue:', error);
  }
}

export async function sendAppointmentConfirmation(appointment: any, customer: any): Promise<void> {
  // Try to send immediately, fallback to queue if fails
  const emailData = {
    to: customer.email,
    subject: 'Appointment Confirmed - ServiceSync',
    template: 'appointmentConfirmation',
    data: { appointment, customer },
  };

  const sent = await sendEmail(emailData);
  if (!sent) {
    // If immediate send fails, queue it for retry
    await queueEmail(emailData);
  }
}

export async function sendBookingSubmitted(appointment: any, customer: any): Promise<void> {
  // Try to send immediately, fallback to queue if fails
  const emailData = {
    to: customer.email,
    subject: 'Booking Submitted - Awaiting Confirmation - ServiceSync',
    template: 'bookingSubmitted',
    data: { appointment, customer },
  };

  const sent = await sendEmail(emailData);
  if (!sent) {
    // If immediate send fails, queue it for retry
    await queueEmail(emailData);
  }
}

export async function sendAppointmentReminder(appointment: any, customer: any): Promise<void> {
  await queueEmail({
    to: customer.email,
    subject: 'Appointment Reminder - ServiceSync',
    template: 'appointmentReminder',
    data: { appointment, customer },
  });
}

export async function sendAppointmentCancellation(appointment: any, customer: any): Promise<void> {
  // Try to send immediately, fallback to queue if fails
  const emailData = {
    to: customer.email,
    subject: 'Appointment Cancelled - ServiceSync',
    template: 'appointmentCancellation',
    data: { appointment, customer },
  };

  const sent = await sendEmail(emailData);
  if (!sent) {
    // If immediate send fails, queue it for retry
    await queueEmail(emailData);
  }
}

export async function sendWaitlistNotification(appointment: any, customer: any): Promise<void> {
  await queueEmail({
    to: customer.email,
    subject: 'Slot Available - ServiceSync',
    template: 'waitlistNotification',
    data: { appointment, customer },
  });
}

export async function sendAdminNotification(appointment: any, customer: any): Promise<void> {
  // Get admin emails
  const admins = await prismaInstance.user.findMany({
    where: { role: 'admin' },
    select: { email: true },
  });

  for (const admin of admins) {
    // Try to send immediately, fallback to queue if fails
    const emailData = {
      to: admin.email,
      subject: 'New Booking - ServiceSync Admin',
      template: 'adminNotification',
      data: { appointment, customer },
    };

    const sent = await sendEmail(emailData);
    if (!sent) {
      // If immediate send fails, queue it for retry
      await queueEmail(emailData);
    }
  }
}
