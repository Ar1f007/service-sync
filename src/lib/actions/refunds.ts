'use server';

import db from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';

interface RefundConfig {
  adminFeePercentage: number; // e.g., 0.05 for 5%
  minimumAdminFee: number; // e.g., 5.00 for £5 minimum
  maximumAdminFee: number; // e.g., 50.00 for £50 maximum
}

const REFUND_CONFIG: RefundConfig = {
  adminFeePercentage: 0.05, // 5% admin fee
  minimumAdminFee: 5.00,    // £5 minimum
  maximumAdminFee: 50.00,   // £50 maximum
};

export async function calculateRefundAmount(
  originalAmount: number,
  cancellationReason: 'client_cancelled' | 'admin_cancelled' | 'no_show' | 'other'
): Promise<{ refundAmount: number; adminFee: number; reason: string }> {
  const amountInPounds = originalAmount / 100; // Convert from pence to pounds
  
  // If client cancelled, apply admin fee
  if (cancellationReason === 'client_cancelled') {
    const adminFee = Math.min(
      Math.max(amountInPounds * REFUND_CONFIG.adminFeePercentage, REFUND_CONFIG.minimumAdminFee),
      REFUND_CONFIG.maximumAdminFee
    );
    const refundAmount = Math.max(amountInPounds - adminFee, 0);
    
    return {
      refundAmount: Math.round(refundAmount * 100), // Convert back to pence
      adminFee: Math.round(adminFee * 100),
      reason: `Client cancellation - Admin fee applied (${(REFUND_CONFIG.adminFeePercentage * 100).toFixed(1)}%)`
    };
  }
  
  // If admin cancelled or other reasons, full refund
  return {
    refundAmount: originalAmount,
    adminFee: 0,
    reason: 'Full refund - No admin fee'
  };
}

export async function processRefund(
  paymentId: string,
  cancellationReason: 'client_cancelled' | 'admin_cancelled' | 'no_show' | 'other',
  adminNotes?: string
) {
  try {
    // Get payment details
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: {
          include: {
            client: true,
            service: true,
            employee: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }

    if (payment.status !== 'succeeded') {
      return {
        success: false,
        error: 'Payment was not successful, cannot refund'
      };
    }

    const alreadyRefunded = payment.refundedAmount || 0;
    const availableAmount = payment.amount - alreadyRefunded;

    if (availableAmount <= 0) {
      return {
        success: false,
        error: 'No amount available for refund'
      };
    }

    // Calculate refund amount
    const { refundAmount, adminFee, reason } = await calculateRefundAmount(
      availableAmount,
      cancellationReason
    );

    if (refundAmount <= 0) {
      return {
        success: false,
        error: 'Refund amount is zero or negative'
      };
    }

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        cancellation_reason: cancellationReason,
        admin_fee: adminFee.toString(),
        original_amount: payment.amount.toString(),
        refund_amount: refundAmount.toString()
      }
    });

    // Update payment record
    const newRefundedAmount = alreadyRefunded + refundAmount;
    const isFullyRefunded = newRefundedAmount >= payment.amount;

    await db.payment.update({
      where: { id: paymentId },
      data: {
        refundedAmount: newRefundedAmount,
        refundedAt: new Date(),
        refundReason: `${reason}${adminNotes ? ` - ${adminNotes}` : ''}`,
        status: isFullyRefunded ? 'refunded' : 'partially_refunded'
      }
    });

    // Update appointment status if fully refunded
    if (isFullyRefunded) {
      await db.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'cancelled' }
      });
    }

    revalidatePath('/admin/payments');
    revalidatePath('/admin/appointments');

    return {
      success: true,
      refund: {
        id: refund.id,
        amount: refundAmount,
        adminFee,
        reason,
        isFullyRefunded
      }
    };

  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process refund'
    };
  }
}

export async function getRefundHistory(paymentId: string) {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        refundedAmount: true,
        refundedAt: true,
        refundReason: true,
        status: true
      }
    });

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found'
      };
    }

    return {
      success: true,
      refundHistory: {
        originalAmount: payment.amount,
        refundedAmount: payment.refundedAmount || 0,
        remainingAmount: payment.amount - (payment.refundedAmount || 0),
        refundedAt: payment.refundedAt,
        refundReason: payment.refundReason,
        status: payment.status
      }
    };
  } catch (error) {
    console.error('Error fetching refund history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch refund history'
    };
  }
}
