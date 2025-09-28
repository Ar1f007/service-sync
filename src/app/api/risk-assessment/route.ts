import { NextRequest, NextResponse } from 'next/server';
import { RiskAssessmentService } from '@/lib/risk-assessment';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (userId) {
      // Get specific customer risk assessment
      const risk = await RiskAssessmentService.getCustomerRisk(userId);
      return NextResponse.json(risk);
    } else {
      // Get all customers with risk assessments
      const allCustomers = await RiskAssessmentService.getAllCustomersWithRisk(limit);
      return NextResponse.json(allCustomers);
    }
  } catch (error) {
    console.error('Error fetching risk assessment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk assessment' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update customer risk assessment
    await RiskAssessmentService.updateCustomerRisk(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    return NextResponse.json(
      { error: 'Failed to update risk assessment' },
      { status: 500 }
    );
  }
}
