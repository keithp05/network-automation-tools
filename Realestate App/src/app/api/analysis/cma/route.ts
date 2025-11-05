import { NextRequest, NextResponse } from 'next/server';
import { aiAnalysisService } from '@/services/aiAnalysis';
import { Property } from '@/types/property';

export async function POST(request: NextRequest) {
  try {
    const { property, comparables } = await request.json();

    const cmaReport = await aiAnalysisService.generateCMA(
      property as Property,
      comparables as Property[]
    );

    return NextResponse.json({
      success: true,
      cma: cmaReport,
    });
  } catch (error) {
    console.error('CMA analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate CMA' },
      { status: 500 }
    );
  }
}
