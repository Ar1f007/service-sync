import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface BookingSubmittedEmailProps {
  appointment: {
    service: {
      title: string;
      price: number;
      duration: number;
    };
    employee: {
      user: {
        name: string;
      };
    };
    dateTime: string;
    status: string;
    totalPrice?: number;
    addons?: Array<{
      id: string;
      name: string;
      price: number;
      duration: number;
    }>;
  };
  customer: {
    name: string | null;
    email: string;
  };
}

export const BookingSubmitted = ({
  appointment,
  customer,
}: BookingSubmittedEmailProps) => {
  const appointmentDate = new Date(appointment.dateTime).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const appointmentTime = new Date(appointment.dateTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Html>
      <Head />
      <Preview>Your booking has been submitted and is awaiting confirmation</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Heading style={logo}>ServiceSync</Heading>
          </Section>
          
          <Heading style={h1}>Booking Submitted Successfully!</Heading>
          
          <Text style={text}>
            Hi {customer.name || 'Valued Customer'},
          </Text>
          
          <Text style={text}>
            Thank you for booking with ServiceSync! Your appointment has been submitted and is currently awaiting confirmation from our team.
          </Text>

          <Section style={appointmentDetails}>
            <Heading style={h2}>Appointment Details</Heading>
            <Text style={text}>
              <strong>Service:</strong> {appointment.service.title}
            </Text>
            <Text style={text}>
              <strong>Duration:</strong> {appointment.service.duration} minutes
            </Text>
            <Text style={text}>
              <strong>Date:</strong> {appointmentDate}
            </Text>
            <Text style={text}>
              <strong>Time:</strong> {appointmentTime}
            </Text>
            <Text style={text}>
              <strong>Staff:</strong> {appointment.employee.user.name}
            </Text>
            
            {/* Add-ons Section */}
            {appointment.addons && appointment.addons.length > 0 && (
              <>
                <Text style={text}>
                  <strong>Add-ons:</strong>
                </Text>
                {appointment.addons.map((addon) => (
                  <Text key={addon.id} style={{ ...text, marginLeft: '20px', color: '#64748b' }}>
                    • {addon.name} (+£{addon.price.toFixed(2)}{addon.duration > 0 ? `, +${addon.duration}min` : ''})
                  </Text>
                ))}
              </>
            )}
            
            {/* Pricing Section */}
            <Text style={text}>
              <strong>Base Service Price:</strong> £{appointment.service.price.toFixed(2)}
            </Text>
            {appointment.addons && appointment.addons.length > 0 && (
              <Text style={text}>
                <strong>Add-ons Total:</strong> £{appointment.addons.reduce((sum, addon) => sum + addon.price, 0).toFixed(2)}
              </Text>
            )}
            <Text style={{ ...text, fontWeight: 'bold', fontSize: '18px', color: '#0d9488' }}>
              <strong>Total Price:</strong> £{appointment.totalPrice ? appointment.totalPrice.toFixed(2) : appointment.service.price.toFixed(2)}
            </Text>
            
            <Text style={text}>
              <strong>Status:</strong> Pending Confirmation
            </Text>
          </Section>

          <Text style={text}>
            We'll review your booking and send you a confirmation email once it's approved. This usually takes a few minutes during business hours.
          </Text>

          <Text style={text}>
            If you have any questions or need to make changes, please contact us as soon as possible.
          </Text>

          <Section style={buttonContainer}>
            <Link style={button} href="https://service-sync-lac.vercel.app/dashboard/appointments">
              View My Bookings
            </Link>
          </Section>

          <Text style={footer}>
            Best regards,<br />
            The ServiceSync Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

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
  color: '#0f172a',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const h1 = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '30px 0 20px',
  padding: '0',
};

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const appointmentDetails = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0d9488',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0',
  textAlign: 'center' as const,
};

export default BookingSubmitted;
