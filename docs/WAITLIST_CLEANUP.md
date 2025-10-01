# Waitlist Cleanup System

This document explains how the waitlist cleanup system works and how to set it up for automatic daily processing.

## Overview

The waitlist cleanup system automatically removes expired waitlist entries and notifies the next person in queue. It can be run in two ways:

1. **Manual Cleanup**: Admin button in the admin dashboard
2. **Automatic Cleanup**: Daily cron job (recommended)

## What Gets Cleaned Up

The system removes waitlist entries that are:
- **Expired**: Past their expiration date (default: 7 days)
- **Notification Expired**: Notified but didn't confirm within 15 minutes

## Manual Cleanup (Admin Dashboard)

### How to Use
1. Go to `/admin/waitlist`
2. Click the "Cleanup Expired Entries" button
3. The system will process expired entries and show results

### What Happens
- Expired entries are marked as "expired"
- Next people in queue are automatically notified
- Results are displayed in the admin interface

## Automatic Cleanup (Cron Job)

### Vercel Deployment (Recommended)

If you're using Vercel, the system is already configured with `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/waitlist-cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2:00 AM UTC.

### Other Hosting Platforms

For other platforms, set up a cron job to call:
```
GET https://yourdomain.com/api/cron/waitlist-cleanup
```

**Recommended Schedule**: `0 2 * * *` (daily at 2:00 AM)

### Security

The cron endpoint is protected with a secret key. Set `CRON_SECRET` in your environment variables and include it in the request:

```bash
curl -H "Authorization: Bearer your_cron_secret_here" \
     https://yourdomain.com/api/cron/waitlist-cleanup
```

## Environment Variables

Add to your `.env.local`:

```bash
# Optional: Secret for cron job security
CRON_SECRET="your-secret-key-here"
```

## Monitoring

### Admin Dashboard
- View waitlist statistics
- See cleanup results
- Monitor queue status

### Logs
The system logs all cleanup activities:
- Number of entries processed
- Success/failure status
- Timestamps

### Email Notifications
When entries are cleaned up:
- Next people in queue receive notification emails
- 15-minute confirmation window
- Automatic progression if not confirmed

## Troubleshooting

### Cleanup Not Running
1. Check if `CRON_SECRET` is set correctly
2. Verify the cron job is configured properly
3. Check server logs for errors

### No Notifications Sent
1. Verify `RESEND_API_KEY` is configured
2. Check email queue in admin dashboard
3. Ensure waitlist entries have valid email addresses

### Manual Cleanup Fails
1. Check admin permissions
2. Verify database connection
3. Check server logs for specific errors

## API Endpoints

### Manual Cleanup
```
POST /api/waitlist/cleanup
Authorization: Required (Admin only)
```

### Automatic Cleanup
```
GET /api/cron/waitlist-cleanup
Authorization: Bearer {CRON_SECRET}
```

## Configuration

### Waitlist Expiration
Default: 7 days from creation
- Can be modified in the `addToWaitlist` function
- Set in `src/lib/actions/waitlist.ts`

### Notification Expiration
Default: 15 minutes from notification
- Can be modified in the `notifyNextInWaitlist` function
- Set in `src/lib/actions/waitlist.ts`

## Best Practices

1. **Run Daily**: Set up automatic daily cleanup
2. **Monitor Results**: Check admin dashboard regularly
3. **Test Manually**: Use admin button to test cleanup
4. **Secure Endpoints**: Use strong `CRON_SECRET`
5. **Monitor Logs**: Check for any errors or issues

## Support

If you encounter issues:
1. Check the admin dashboard for error messages
2. Review server logs
3. Verify environment variables
4. Test manual cleanup first
