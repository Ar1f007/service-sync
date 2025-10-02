'use server';

import jsPDF from 'jspdf';
import db from '@/lib/db';
import { format } from 'date-fns';

export interface InvoiceData {
  appointmentId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  client: {
    name: string;
    email: string;
  };
  service: {
    title: string;
    price: number;
    duration: number;
  };
  employee: {
    name: string;
  };
  appointmentDate: Date;
  addons: Array<{
    name: string;
    price: number;
    duration: number;
  }>;
  totalPrice: number;
  status: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Set up the document
  doc.setFontSize(20);
  doc.text('INVOICE', 20, 30);
  
  // Invoice number and date
  doc.setFontSize(12);
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, 20, 50);
  doc.text(`Issue Date: ${format(invoiceData.issueDate, 'dd/MM/yyyy')}`, 20, 60);
  doc.text(`Due Date: ${format(invoiceData.dueDate, 'dd/MM/yyyy')}`, 20, 70);
  
  // Client information
  doc.text('Bill To:', 20, 90);
  doc.text(invoiceData.client.name, 20, 100);
  doc.text(invoiceData.client.email, 20, 110);
  
  // Service information
  doc.text('Service Details:', 20, 130);
  doc.text(`Service: ${invoiceData.service.title}`, 20, 140);
  doc.text(`Technician: ${invoiceData.employee.name}`, 20, 150);
  doc.text(`Date: ${format(invoiceData.appointmentDate, 'dd/MM/yyyy HH:mm')}`, 20, 160);
  
  // Items table
  let yPosition = 180;
  doc.text('Description', 20, yPosition);
  doc.text('Duration', 100, yPosition);
  doc.text('Price', 150, yPosition);
  
  // Draw line
  doc.line(20, yPosition + 5, 190, yPosition + 5);
  
  yPosition += 15;
  
  // Main service
  doc.text(invoiceData.service.title, 20, yPosition);
  doc.text(`${invoiceData.service.duration} min`, 100, yPosition);
  doc.text(`£${invoiceData.service.price.toFixed(2)}`, 150, yPosition);
  
  // Add-ons
  invoiceData.addons.forEach(addon => {
    yPosition += 10;
    doc.text(`+ ${addon.name}`, 20, yPosition);
    doc.text(`${addon.duration} min`, 100, yPosition);
    doc.text(`£${addon.price.toFixed(2)}`, 150, yPosition);
  });
  
  // Total
  yPosition += 20;
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;
  doc.setFontSize(14);
  doc.text(`Total: £${invoiceData.totalPrice.toFixed(2)}`, 150, yPosition);
  
  // Status
  yPosition += 20;
  doc.setFontSize(12);
  doc.text(`Status: ${invoiceData.status.toUpperCase()}`, 20, yPosition);
  
  // Footer
  yPosition += 30;
  doc.setFontSize(10);
  doc.text('Thank you for choosing ServiceSync!', 20, yPosition);
  doc.text('For any questions, please contact us at support@servicesync.com', 20, yPosition + 10);
  
  return Buffer.from(doc.output('arraybuffer'));
}

export async function createInvoice(appointmentId: string): Promise<InvoiceData> {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      service: true,
      employee: {
        include: {
          user: true
        }
      },
      appointmentAddons: {
        include: {
          addon: true
        }
      }
    }
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const invoiceNumber = `INV-${appointmentId.slice(-8).toUpperCase()}`;
  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const addons = appointment.appointmentAddons.map(aa => ({
    name: aa.addon.name,
    price: aa.addon.price,
    duration: aa.addon.duration
  }));

  return {
    appointmentId: appointment.id,
    invoiceNumber,
    issueDate,
    dueDate,
    client: {
      name: appointment.client.name || 'Unknown',
      email: appointment.client.email
    },
    service: {
      title: appointment.service.title,
      price: appointment.service.price,
      duration: appointment.service.duration
    },
    employee: {
      name: appointment.employee.user.name || 'Unknown'
    },
    appointmentDate: appointment.dateTime,
    addons,
    totalPrice: appointment.totalPrice || appointment.service.price,
    status: appointment.status
  };
}

export async function generateAndSaveInvoice(appointmentId: string): Promise<{ invoiceData: InvoiceData; pdfBuffer: Buffer }> {
  const invoiceData = await createInvoice(appointmentId);
  const pdfBuffer = await generateInvoicePDF(invoiceData);
  
  return { invoiceData, pdfBuffer };
}
