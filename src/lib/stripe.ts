import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const formatAmountForStripe = (amount: number): number => {
  // Convert pounds to pence (Stripe uses smallest currency unit)
  return Math.round(amount * 100);
};

export const formatAmountFromStripe = (amount: number): number => {
  // Convert pence to pounds
  return amount / 100;
};

export const CURRENCY = 'gbp';
export const MIN_AMOUNT = 0.5; // Minimum £0.50
export const MAX_AMOUNT = 999999.99; // Maximum £999,999.99
