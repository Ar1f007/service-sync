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

interface WaitlistNotificationEmailProps {
  clientName: string;
  serviceName: string;
  employeeName: string;
  requestedDateTime: string;
  position: number;
  confirmationUrl: string;
  expiresInMinutes: number;
}

export const WaitlistNotificationEmail = ({
  clientName = 'John Doe',
  serviceName = 'Hair Cut',
  employeeName = 'Jane Smith',
  requestedDateTime = '2024-01-15T10:00:00Z',
  position = 1,
  confirmationUrl = 'https://servicesync.com/waitlist/confirm/123',
  expiresInMinutes = 15,
}: WaitlistNotificationEmailProps) => {
  const formattedDate = new Date(requestedDateTime).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = new Date(requestedDateTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Html>
      <Head />
      <Preview>Your waitlist slot is now available! Confirm your booking within {expiresInMinutes.toString()} minutes.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Text style={logo}>ServiceSync</Text>
          </Section>
          
          <Heading style={h1}>Great News! Your Slot is Available</Heading>
          
          <Text style={text}>
            Hi {clientName},
          </Text>
          
          <Text style={text}>
            Good news! A slot has become available for your requested appointment and you're next in line.
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
              <strong>Position:</strong> #{position} in queue
            </Text>
          </Section>
          
          <Section style={urgentBox}>
            <Text style={urgentText}>
              ⏰ <strong>URGENT:</strong> You have {expiresInMinutes} minutes to confirm your booking. 
              After this time, the slot will be offered to the next person in line.
            </Text>
          </Section>
          
          <Section style={buttonContainer}>
            <Link style={button} href={confirmationUrl}>
              Confirm Booking Now
            </Link>
          </Section>
          
          <Text style={text}>
            If you're no longer interested in this appointment, you can simply ignore this email 
            and the slot will be offered to the next person.
          </Text>
          
          <Text style={text}>
            If you have any questions, please contact us at{' '}
            <Link href="mailto:support@servicesync.com" style={link}>
              support@servicesync.com
            </Link>
          </Text>
          
          <Text style={footer}>
            Best regards,<br />
            The ServiceSync Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WaitlistNotificationEmail;

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

const urgentBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const urgentText = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: 'bold',
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
