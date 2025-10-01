'use server';

import { stripe, formatAmountForStripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPaymentIntent(
  appointmentId: string,
  amount: number,
  customerEmail: string,
  customerName?: string
) {
  try {
    // Validate amount
    if (amount < 0.5 || amount > 999999.99) {
      throw new Error('Invalid amount');
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(amount),
      currency: 'gbp',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        appointmentId,
        customerEmail,
        customerName: customerName || '',
      },
    });

    // Create payment record in database
    const payment = await db.payment.create({
      data: {
        appointmentId,
        stripePaymentId: paymentIntent.id,
        amount: formatAmountForStripe(amount),
        currency: 'gbp',
        status: 'pending',
        customerEmail,
        customerName,
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updatePaymentStatus(
  stripePaymentId: string,
  status: string,
  stripeChargeId?: string,
  paymentMethod?: string
) {
  try {
    const payment = await db.payment.update({
      where: { stripePaymentId },
      data: {
        status,
        stripeChargeId,
        paymentMethod,
        paidAt: status === 'succeeded' ? new Date() : undefined,
      },
    });

    // Update appointment status if payment succeeded
    if (status === 'succeeded') {
      await db.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'confirmed' },
      });
    }

    revalidatePath('/admin/payments');
    revalidatePath('/dashboard/appointments');

    return { success: true, payment };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function createRefund(
  paymentId: string,
  amount?: number,
  reason?: string
) {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'succeeded') {
      throw new Error('Payment must be succeeded to refund');
    }

    const refundAmount = amount ? formatAmountForStripe(amount) : payment.amount;
    const maxRefundAmount = payment.amount - payment.refundedAmount;

    if (refundAmount > maxRefundAmount) {
      throw new Error('Refund amount exceeds available amount');
    }

    // Create refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: refundAmount,
      reason: reason ? 'requested_by_customer' : undefined,
      metadata: {
        paymentId,
        reason: reason || '',
      },
    });

    // Update payment record
    const updatedPayment = await db.payment.update({
      where: { id: paymentId },
      data: {
        refundedAmount: payment.refundedAmount + refundAmount,
        refundReason: reason,
        refundedAt: new Date(),
        status: refundAmount >= payment.amount ? 'refunded' : 'succeeded',
      },
    });

    revalidatePath('/admin/payments');

    return {
      success: true,
      refund,
      payment: updatedPayment,
    };
  } catch (error) {
    console.error('Error creating refund:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getPayments() {
  try {
    const payments = await db.payment.findMany({
      include: {
        appointment: {
          include: {
            client: true,
            service: true,
            employee: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, payments };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getPaymentById(paymentId: string) {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: {
          include: {
            client: true,
            service: true,
            employee: {
              include: {
                user: true,
              },
            },
            appointmentAddons: {
              include: {
                addon: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return { success: true, payment };
  } catch (error) {
    console.error('Error fetching payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
