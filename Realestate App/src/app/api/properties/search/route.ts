import { NextRequest, NextResponse } from 'next/server';
import { propertyAggregator } from '@/services/propertyAggregator';
import { PropertySearchParams } from '@/types/property';

export async function POST(request: NextRequest) {
  try {
    const params: PropertySearchParams = await request.json();

    const properties = await propertyAggregator.searchProperties(params);

    return NextResponse.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error('Property search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search properties' },
      { status: 500 }
    );
  }
}
