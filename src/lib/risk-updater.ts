import { PrismaClient } from '../generated/prisma';
import { RiskAssessmentService } from './risk-assessment';

const prisma = new PrismaClient();

/**
 * Update risk assessment for a customer when their appointment status changes
 */
export async function updateCustomerRiskOnAppointmentChange(appointmentId: string) {
  try {
    // Get the appointment with client information
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { clientId: true },
    });

    if (!appointment) {
      console.error(`Appointment ${appointmentId} not found`);
      return;
    }

    // Update risk assessment for the client
    await RiskAssessmentService.updateCustomerRisk(appointment.clientId);
    
    console.log(`Risk assessment updated for client ${appointment.clientId}`);
  } catch (error) {
    console.error('Error updating customer risk assessment:', error);
  }
}

/**
 * Update risk assessments for all customers (batch operation)
 */
export async function updateAllCustomerRiskAssessments() {
  try {
    console.log('Starting batch risk assessment update...');
    
    // Get all unique client IDs
    const clients = await prisma.appointment.findMany({
      select: { clientId: true },
      distinct: ['clientId'],
    });

    console.log(`Found ${clients.length} unique clients`);

    // Update risk assessment for each client
    for (const client of clients) {
      try {
        await RiskAssessmentService.updateCustomerRisk(client.clientId);
        console.log(`Updated risk for client ${client.clientId}`);
      } catch (error) {
        console.error(`Error updating risk for client ${client.clientId}:`, error);
      }
    }

    console.log('Batch risk assessment update completed');
  } catch (error) {
    console.error('Error in batch risk assessment update:', error);
  }
}

/**
 * Get risk statistics for admin dashboard
 */
export async function getRiskStatistics() {
  try {
    const stats = await prisma.customerRisk.groupBy({
      by: ['riskLevel'],
      _count: {
        riskLevel: true,
      },
    });

    const totalCustomers = await prisma.customerRisk.count();
    
    const riskBreakdown = {
      total: totalCustomers,
      low: 0,
      medium: 0,
      high: 0,
      very_high: 0,
    };

    stats.forEach(stat => {
      switch (stat.riskLevel) {
        case 'low':
          riskBreakdown.low = stat._count.riskLevel;
          break;
        case 'medium':
          riskBreakdown.medium = stat._count.riskLevel;
          break;
        case 'high':
          riskBreakdown.high = stat._count.riskLevel;
          break;
        case 'very_high':
          riskBreakdown.very_high = stat._count.riskLevel;
          break;
      }
    });

    return riskBreakdown;
  } catch (error) {
    console.error('Error getting risk statistics:', error);
    return null;
  }
}
