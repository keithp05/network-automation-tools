import { NextRequest, NextResponse } from 'next/server';
import { leaseGenerator, LeaseData } from '@/services/leaseGenerator';

export async function POST(request: NextRequest) {
  try {
    const leaseData: LeaseData = await request.json();

    // Validate lease data
    const validation = leaseGenerator.validateLeaseData(leaseData);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Generate lease
    const leaseDocument = await leaseGenerator.generateLease(leaseData);

    return NextResponse.json({
      success: true,
      lease: leaseDocument,
    });
  } catch (error) {
    console.error('Lease generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate lease' },
      { status: 500 }
    );
  }
}
