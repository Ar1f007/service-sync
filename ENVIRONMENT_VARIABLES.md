# Environment Variables Configuration

Please add these environment variables to your `.env.local` file:

## Required Variables

### Database
```bash
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/servicesync?retryWrites=true&w=majority"
```

### Email Service (Resend)
```bash
RESEND_API_KEY="re_your_resend_api_key_here"
```

### Application URL
```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Payment Processing (Required for payments)

### Stripe Configuration
```bash
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret_here"
```

## Optional Variables

### Better Auth Configuration
```bash
BETTER_AUTH_SECRET="your_better_auth_secret_here"
BETTER_AUTH_URL="http://localhost:3000"
```

### Cron Jobs (Optional)
```bash
CRON_SECRET="your_cron_secret_here"
```

### Redis (for caching)
```bash
REDIS_URL="redis://localhost:6379"
```

### Analytics
```bash
ANALYTICS_API_KEY="your_analytics_api_key_here"
```

## How to Get API Keys

### Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env.local`

### Stripe API Keys (for payment processing)
1. Go to [stripe.com](https://stripe.com)
2. Sign up for a developer account
3. Go to Developers > API Keys
4. Copy the Publishable key and Secret key
5. Add them to your `.env.local`

## Example .env.local file

```bash
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/servicesync?retryWrites=true&w=majority"

# Email Service
RESEND_API_KEY="re_1234567890abcdef"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Payment Processing (Stripe)
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_stripe_webhook_secret_here"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# Cron Jobs (Optional)
CRON_SECRET="your-cron-secret-here"
```

## Notes

- The email system will work without the Resend API key (emails will be queued but not sent)
- Payment processing requires all Stripe keys to be configured
- All other features will work normally without the optional API keys
- Make sure to restart your development server after adding environment variables
