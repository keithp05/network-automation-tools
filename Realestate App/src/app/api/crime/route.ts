import { NextRequest, NextResponse } from 'next/server';
import { crimeDataService } from '@/services/crimeData';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, address } = await request.json();

    if (!latitude || !longitude || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const crimeData = await crimeDataService.getCrimeData(latitude, longitude, address);
    const safetyGrade = crimeDataService.getSafetyGrade(crimeData.crimeScore);

    return NextResponse.json({
      success: true,
      crimeData,
      safetyGrade,
    });
  } catch (error) {
    console.error('Crime data error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch crime data' },
      { status: 500 }
    );
  }
}
