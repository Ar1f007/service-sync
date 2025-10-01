import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WaitlistConfirmationEmailProps {
  clientName: string;
  serviceName: string;
  employeeName: string;
  appointmentDateTime: string;
  appointmentId: string;
  totalPrice?: number;
  addons?: Array<{ name: string; price: number }>;
}

export const WaitlistConfirmationEmail = ({
  clientName = 'John Doe',
  serviceName = 'Hair Cut',
  employeeName = 'Jane Smith',
  appointmentDateTime = '2024-01-15T10:00:00Z',
  appointmentId = '123',
  totalPrice = 50.00,
  addons = [],
}: WaitlistConfirmationEmailProps) => {
  const formattedDate = new Date(appointmentDateTime).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = new Date(appointmentDateTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Html>
      <Head />
      <Preview>Your waitlist booking has been confirmed! See you on {formattedDate} at {formattedTime}.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Text style={logo}>ServiceSync</Text>
          </Section>
          
          <Heading style={h1}>Booking Confirmed! 🎉</Heading>
          
          <Text style={text}>
            Hi {clientName},
          </Text>
          
          <Text style={text}>
            Great news! Your waitlist booking has been successfully confirmed. We're excited to see you for your appointment.
          </Text>
          
          <Section style={appointmentDetails}>
            <Text style={appointmentTitle}>Appointment Details:</Text>
            <Text style={appointmentText}>
              <strong>Service:</strong> {serviceName}
            </Text>
            <Text style={appointmentText}>
              <strong>Staff:</strong> {employeeName}
            </Text>
            <Text style={appointmentText}>
              <strong>Date:</strong> {formattedDate}
            </Text>
            <Text style={appointmentText}>
              <strong>Time:</strong> {formattedTime}
            </Text>
            <Text style={appointmentText}>
              <strong>Appointment ID:</strong> {appointmentId}
            </Text>
          </Section>

          {addons.length > 0 && (
            <Section style={addonsSection}>
              <Text style={addonsTitle}>Selected Add-ons:</Text>
              {addons.map((addon, index) => (
                <Text key={index} style={addonText}>
                  • {addon.name} - £{addon.price.toFixed(2)}
                </Text>
              ))}
            </Section>
          )}

          {totalPrice && (
            <Section style={pricingSection}>
              <Text style={pricingText}>
                <strong>Total Price: £{totalPrice.toFixed(2)}</strong>
              </Text>
            </Section>
          )}
          
          <Section style={reminderBox}>
            <Text style={reminderText}>
              📅 <strong>Reminder:</strong> Please arrive 10 minutes early for your appointment. 
              If you need to reschedule or cancel, please contact us at least 24 hours in advance.
            </Text>
          </Section>
          
          <Section style={buttonContainer}>
            <Link style={button} href="https://servicesync.com/dashboard/appointments">
              View My Appointments
            </Link>
          </Section>
          
          <Text style={text}>
            If you have any questions or need to make changes to your appointment, 
            please contact us at{' '}
            <Link href="mailto:support@servicesync.com" style={link}>
              support@servicesync.com
            </Link>
          </Text>
          
          <Text style={footer}>
            We look forward to seeing you!<br />
            The ServiceSync Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WaitlistConfirmationEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0f766e',
  margin: '0',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const appointmentDetails = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const appointmentTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const appointmentText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const addonsSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const addonsTitle = {
  color: '#0c4a6e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const addonText = {
  color: '#0c4a6e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 4px',
};

const pricingSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #22c55e',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const pricingText = {
  color: '#166534',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const reminderBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const reminderText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0f766e',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const link = {
  color: '#0f766e',
  textDecoration: 'underline',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0 0',
};
