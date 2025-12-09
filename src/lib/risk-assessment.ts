/** biome-ignore-all lint/complexity/noStaticOnlyClass: noneed */
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export interface RiskFactors {
  cancellationRate: number;
  noShowRate: number;
  lastMinuteCancelRate: number;
  consecutiveCancellations: number;
  averageBookingFrequency: number | null;
  totalBookings: number;
}

export interface RiskCalculationResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  factors: RiskFactors;
  recommendations: string[];
}

export class RiskAssessmentService {
  // Risk scoring weights (adjustable based on business needs)
  private static readonly WEIGHTS = {
    cancellationRate: 0.3,        // 30% weight
    noShowRate: 0.25,             // 25% weight
    lastMinuteCancelRate: 0.2,    // 20% weight
    consecutiveCancellations: 0.15, // 15% weight
    bookingFrequency: 0.1,        // 10% weight
  };

  // Risk level thresholds
  private static readonly THRESHOLDS = {
    low: 20,
    medium: 40,
    high: 60,
    very_high: 80,
  };

  /**
   * Calculate risk score for a customer based on their booking history
   */
  static calculateRiskScore(factors: RiskFactors): RiskCalculationResult {
    const {
      cancellationRate,
      noShowRate,
      lastMinuteCancelRate,
      consecutiveCancellations,
      averageBookingFrequency,
      totalBookings,
    } = factors;

    // Normalize factors to 0-100 scale
    const normalizedFactors = {
      cancellationRate: Math.min(cancellationRate * 100, 100),
      noShowRate: Math.min(noShowRate * 100, 100),
      lastMinuteCancelRate: Math.min(lastMinuteCancelRate * 100, 100),
      consecutiveCancellations: Math.min(consecutiveCancellations * 20, 100), // Max 5 consecutive = 100
      bookingFrequency: this.normalizeBookingFrequency(averageBookingFrequency),
    };

    // Calculate weighted risk score
    const riskScore = 
      normalizedFactors.cancellationRate * this.WEIGHTS.cancellationRate +
      normalizedFactors.noShowRate * this.WEIGHTS.noShowRate +
      normalizedFactors.lastMinuteCancelRate * this.WEIGHTS.lastMinuteCancelRate +
      normalizedFactors.consecutiveCancellations * this.WEIGHTS.consecutiveCancellations +
      normalizedFactors.bookingFrequency * this.WEIGHTS.bookingFrequency;

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskLevel, factors);

    return {
      riskScore: Math.round(riskScore),
      riskLevel,
      factors,
      recommendations,
    };
  }

  /**
   * Normalize booking frequency to 0-100 scale
   * Lower frequency (more bookings) = lower risk score
   */
  private static normalizeBookingFrequency(frequency: number | null): number {
    if (!frequency) return 50; // Neutral score for unknown frequency
    
    // If they book very frequently (daily), low risk
    if (frequency <= 1) return 10;
    // If they book weekly, low-medium risk
    if (frequency <= 7) return 20;
    // If they book monthly, medium risk
    if (frequency <= 30) return 40;
    // If they book rarely, higher risk
    if (frequency <= 90) return 70;
    // Very infrequent bookings, high risk
    return 90;
  }

  /**
   * Determine risk level based on score
   */
  private static determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (score < this.THRESHOLDS.low) return 'low';
    if (score < this.THRESHOLDS.medium) return 'medium';
    if (score < this.THRESHOLDS.high) return 'high';
    return 'very_high';
  }

  /**
   * Generate risk mitigation recommendations
   */
  private static generateRecommendations(
    riskLevel: string,
    factors: RiskFactors
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'low':
        recommendations.push('Customer is reliable - no special measures needed');
        break;
      
      case 'medium':
        recommendations.push('Monitor customer behavior closely');
        if (factors.lastMinuteCancelRate > 0.3) {
          recommendations.push('Consider requiring 48-hour notice for cancellations');
        }
        break;
      
      case 'high':
        recommendations.push('Require manual approval for new bookings');
        recommendations.push('Consider requiring a deposit');
        if (factors.consecutiveCancellations >= 2) {
          recommendations.push('Limit advance booking window to 7 days');
        }
        break;
      
      case 'very_high':
        recommendations.push('Require full payment in advance');
        recommendations.push('Manual approval required for all bookings');
        recommendations.push('Consider suspending booking privileges');
        recommendations.push('Add admin notes about customer behavior');
        break;
    }

    // Add specific recommendations based on factors
    if (factors.noShowRate > 0.5) {
      recommendations.push('Implement no-show penalties');
    }
    
    if (factors.cancellationRate > 0.6) {
      recommendations.push('Require cancellation fees');
    }

    return recommendations;
  }

  /**
   * Update or create customer risk assessment
   */
  static async updateCustomerRisk(userId: string): Promise<void> {
    try {
      // Get all appointments for the user
      const appointments = await prisma.appointment.findMany({
        where: { clientId: userId },
        orderBy: { dateTime: 'asc' },
      });

      if (appointments.length === 0) {
        // No appointments yet, create default risk profile
        await prisma.customerRisk.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            noShowBookings: 0,
            lastMinuteCancellations: 0,
            cancellationRate: 0,
            noShowRate: 0,
            lastMinuteCancelRate: 0,
            riskScore: 0,
            riskLevel: 'low',
            consecutiveCancellations: 0,
            lastCalculatedAt: new Date(),
          },
        });
        return;
      }

      // Calculate metrics
      const now = new Date();
      const totalBookings = appointments.length;
      const completedBookings = appointments.filter(apt => apt.status === 'completed').length;
      // Only count cancellations made by the client (not admin/staff)
      // Also count cancellations without cancelledByRole as client cancellations
      const cancelledBookings = appointments.filter(apt => 
        apt.status === 'cancelled' && 
        (apt.cancelledByRole === 'client' || !apt.cancelledByRole)
      ).length;
      
      // No-shows are appointments that were confirmed but the client didn't show up
      // (appointment time has passed and status is still 'confirmed' or 'pending')
      const noShowBookings = appointments.filter(apt => 
        (apt.status === 'confirmed' || apt.status === 'pending') && 
        apt.dateTime < now
      ).length;

      // Calculate last-minute cancellations (within 24 hours) - only client cancellations
      const lastMinuteCancellations = appointments.filter(apt => {
        if (apt.status !== 'cancelled' || (apt.cancelledByRole !== 'client' && apt.cancelledByRole)) return false;
        const hoursUntilAppointment = (apt.dateTime.getTime() - apt.updatedAt.getTime()) / (1000 * 60 * 60);
        return hoursUntilAppointment <= 24;
      }).length;

      // Calculate rates
      const cancellationRate = totalBookings > 0 ? cancelledBookings / totalBookings : 0;
      const noShowRate = totalBookings > 0 ? noShowBookings / totalBookings : 0;
      const lastMinuteCancelRate = cancelledBookings > 0 ? lastMinuteCancellations / cancelledBookings : 0;

      // Calculate consecutive cancellations - only client cancellations
      let consecutiveCancellations = 0;
      let maxConsecutive = 0;
      for (const apt of appointments.reverse()) {
        if (apt.status === 'cancelled' && (apt.cancelledByRole === 'client' || !apt.cancelledByRole)) {
          consecutiveCancellations++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCancellations);
        } else {
          consecutiveCancellations = 0;
        }
      }

      // Calculate average booking frequency
      const bookingDates = appointments
        .filter(apt => apt.status === 'confirmed')
        .map(apt => apt.dateTime)
        .sort((a, b) => a.getTime() - b.getTime());

      let averageBookingFrequency: number | null = null;
      if (bookingDates.length > 1) {
        const totalDays = (bookingDates[bookingDates.length - 1].getTime() - bookingDates[0].getTime()) / (1000 * 60 * 60 * 24);
        averageBookingFrequency = totalDays / (bookingDates.length - 1);
      }

      // Get last booking and cancellation dates
      const lastBookingDate = bookingDates.length > 0 ? bookingDates[bookingDates.length - 1] : null;
      const lastCancellationDate = appointments
        .filter(apt => apt.status === 'canceled')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.updatedAt || null;

      // Calculate risk score
      const factors: RiskFactors = {
        cancellationRate,
        noShowRate,
        lastMinuteCancelRate,
        consecutiveCancellations: maxConsecutive,
        averageBookingFrequency,
        totalBookings,
      };

      const riskResult = this.calculateRiskScore(factors);

      // Determine risk mitigation measures
      const requiresApproval = riskResult.riskLevel === 'high' || riskResult.riskLevel === 'very_high';
      const depositRequired = riskResult.riskLevel === 'very_high';
      const maxAdvanceBookingDays = riskResult.riskLevel === 'very_high' ? 7 : 
                                   riskResult.riskLevel === 'high' ? 14 : null;

      // Update or create customer risk record
      await prisma.customerRisk.upsert({
        where: { userId },
        update: {
          totalBookings,
          completedBookings,
          cancelledBookings,
          noShowBookings,
          lastMinuteCancellations,
          cancellationRate,
          noShowRate,
          lastMinuteCancelRate,
          riskScore: riskResult.riskScore,
          riskLevel: riskResult.riskLevel,
          averageBookingFrequency,
          lastBookingDate,
          lastCancellationDate,
          consecutiveCancellations: maxConsecutive,
          requiresApproval,
          depositRequired,
          maxAdvanceBookingDays,
          lastCalculatedAt: now,
        },
        create: {
          userId,
          totalBookings,
          completedBookings,
          cancelledBookings,
          noShowBookings,
          lastMinuteCancellations,
          cancellationRate,
          noShowRate,
          lastMinuteCancelRate,
          riskScore: riskResult.riskScore,
          riskLevel: riskResult.riskLevel,
          averageBookingFrequency,
          lastBookingDate,
          lastCancellationDate,
          consecutiveCancellations: maxConsecutive,
          requiresApproval,
          depositRequired,
          maxAdvanceBookingDays,
          lastCalculatedAt: now,
        },
      });

    } catch (error) {
      console.error('Error updating customer risk assessment:', error);
      throw error;
    }
  }

  /**
   * Get customer risk assessment (creates if doesn't exist)
   */
  static async getCustomerRisk(userId: string) {
    // First check if risk assessment exists
    let risk = await prisma.customerRisk.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If no risk assessment exists, create one
    if (!risk) {
      await this.updateCustomerRisk(userId);
      risk = await prisma.customerRisk.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    return risk;
  }

  /**
   * Get all customers with risk assessments for admin dashboard
   */
  static async getAllCustomersWithRisk(limit: number = 50) {
    // First ensure all CLIENT customers with appointments have risk assessments
    const customersWithAppointments = await prisma.appointment.findMany({
      select: { 
        clientId: true,
        client: {
          select: { role: true }
        }
      },
      distinct: ['clientId'],
    });

    // Filter to only include clients (not admin/staff)
    const clientIds = customersWithAppointments
      .filter(apt => apt.client.role === 'client')
      .map(apt => apt.clientId);

    // Create risk assessments for client customers who don't have them
    for (const clientId of clientIds) {
      const existingRisk = await prisma.customerRisk.findUnique({
        where: { userId: clientId },
      });
      
      if (!existingRisk) {
        await this.updateCustomerRisk(clientId);
      }
    }

    return await prisma.customerRisk.findMany({
      where: {
        user: {
          role: 'client'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        riskScore: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get all high-risk customers for admin dashboard
   */
  static async getHighRiskCustomers(limit: number = 50) {
    // First ensure all customers with appointments have risk assessments
    const customersWithAppointments = await prisma.appointment.findMany({
      select: { clientId: true },
      distinct: ['clientId'],
    });

    // Create risk assessments for customers who don't have them
    for (const customer of customersWithAppointments) {
      const existingRisk = await prisma.customerRisk.findUnique({
        where: { userId: customer.clientId },
      });
      
      if (!existingRisk) {
        await this.updateCustomerRisk(customer.clientId);
      }
    }

    return await prisma.customerRisk.findMany({
      where: {
        riskLevel: {
          in: ['high', 'very_high'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        riskScore: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Update admin notes for a customer
   */
  static async updateAdminNotes(userId: string, notes: string) {
    return await prisma.customerRisk.update({
      where: { userId },
      data: { adminNotes: notes },
    });
  }

  /**
   * Check if customer requires approval for booking
   */
  static async requiresApproval(userId: string): Promise<boolean> {
    const risk = await this.getCustomerRisk(userId);
    return risk?.requiresApproval || false;
  }

  /**
   * Get risk mitigation requirements for a customer
   */
  static async getRiskMitigation(userId: string) {
    const risk = await this.getCustomerRisk(userId);
    
    return {
      requiresApproval: risk?.requiresApproval || false,
      depositRequired: risk?.depositRequired || false,
      maxAdvanceBookingDays: risk?.maxAdvanceBookingDays || null,
      riskLevel: risk?.riskLevel || 'low' as const,
      riskScore: risk?.riskScore || 0,
    };
  }
}
