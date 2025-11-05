import { NextRequest, NextResponse } from 'next/server';
import { aiAnalysisService } from '@/services/aiAnalysis';
import { Property } from '@/types/property';

export async function POST(request: NextRequest) {
  try {
    const { property } = await request.json();

    const rentalRate = await aiAnalysisService.estimateRentalRate(property as Property);

    return NextResponse.json({
      success: true,
      estimatedRent: rentalRate,
    });
  } catch (error) {
    console.error('Rental rate estimation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to estimate rental rate' },
      { status: 500 }
    );
  }
}
