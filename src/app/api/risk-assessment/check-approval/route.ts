import { NextRequest, NextResponse } from 'next/server';
import { RiskAssessmentService } from '@/lib/risk-assessment';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const requiresApproval = await RiskAssessmentService.requiresApproval(userId);
    const mitigation = await RiskAssessmentService.getRiskMitigation(userId);

    return NextResponse.json({
      requiresApproval,
      mitigation,
    });
  } catch (error) {
    console.error('Error checking approval requirements:', error);
    return NextResponse.json(
      { error: 'Failed to check approval requirements' },
      { status: 500 }
    );
  }
}
