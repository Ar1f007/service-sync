import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update payment status
        await db.payment.update({
          where: { stripePaymentId: paymentIntent.id },
          data: {
            status: 'succeeded',
            stripeChargeId: paymentIntent.latest_charge as string,
            paymentMethod: paymentIntent.payment_method_types?.[0],
            paidAt: new Date(),
            stripeWebhookData: event.data.object,
          },
        });

        // Update appointment status
        const payment = await db.payment.findUnique({
          where: { stripePaymentId: paymentIntent.id },
        });

        if (payment) {
          await db.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: 'confirmed' },
          });
        }

        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await db.payment.update({
          where: { stripePaymentId: paymentIntent.id },
          data: {
            status: 'failed',
            stripeWebhookData: event.data.object,
          },
        });

        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        
        await db.payment.update({
          where: { stripePaymentId: paymentIntent.id },
          data: {
            status: 'canceled',
            stripeWebhookData: event.data.object,
          },
        });

        console.log('Payment canceled:', paymentIntent.id);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object;
        console.log('Dispute created:', dispute.id);
        // Handle dispute logic here if needed
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
