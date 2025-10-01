import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredWaitlistEntries } from '@/lib/actions/waitlist';

export async function GET(request: NextRequest) {
  // Verify the request is from a legitimate cron service
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting scheduled waitlist cleanup...');
    
    const result = await cleanupExpiredWaitlistEntries();
    
    if (result.success) {
      console.log(`Waitlist cleanup completed: ${result.cleanedCount} entries processed`);
      return NextResponse.json({
        success: true,
        message: `Successfully cleaned up ${result.cleanedCount} expired waitlist entries`,
        cleanedCount: result.cleanedCount,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('Waitlist cleanup failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to cleanup waitlist entries',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in scheduled waitlist cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
