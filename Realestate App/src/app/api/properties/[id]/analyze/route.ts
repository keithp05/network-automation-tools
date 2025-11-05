import { NextRequest, NextResponse } from 'next/server';
import { propertyAnalysisService } from '@/services/propertyAnalysisService';
import { demoDataService } from '@/services/demoDataService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    console.log('📊 Analyzing property:', propertyId);

    // Get property data from request body
    const property = await request.json();

    // Generate CMA report
    const cmaReport = await propertyAnalysisService.generateCMAReport(property);

    return NextResponse.json({
      success: true,
      report: cmaReport,
    });
  } catch (error: any) {
    console.error('❌ Error generating CMA report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate CMA report',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;

    // For demo purposes, get property from demo data service
    // In production, this would fetch from database
    const properties = demoDataService.getDemoProperties('San Antonio', 'TX', 20);
    const property = properties.find(p => p.id === propertyId);

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Generate CMA report
    const cmaReport = await propertyAnalysisService.generateCMAReport(property);

    return NextResponse.json({
      success: true,
      report: cmaReport,
    });
  } catch (error: any) {
    console.error('❌ Error generating CMA report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate CMA report',
      },
      { status: 500 }
    );
  }
}
