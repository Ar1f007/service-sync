import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cleanupExpiredWaitlistEntries } from '@/lib/actions/waitlist';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const result = await cleanupExpiredWaitlistEntries();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully cleaned up ${result.cleanedCount} expired waitlist entries`,
        cleanedCount: result.cleanedCount,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to cleanup waitlist entries',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in waitlist cleanup API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
