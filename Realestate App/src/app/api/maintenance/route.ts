import { NextRequest, NextResponse } from 'next/server';

// Tenant Maintenance Request API
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const maintenanceRequest = {
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority') || 'MEDIUM',
      propertyId: formData.get('propertyId'),
      tenantId: formData.get('tenantId'),
      images: [] as string[],
    };

    // Handle image uploads
    const images = formData.getAll('images') as File[];

    // TODO: Upload images to cloud storage (Cloudinary/S3)
    // For now, we'll just acknowledge them
    maintenanceRequest.images = images.map(img => img.name);

    // TODO: Save to database using Prisma
    // const request = await prisma.maintenanceRequest.create({ data: maintenanceRequest });

    return NextResponse.json({
      success: true,
      message: 'Maintenance request submitted successfully',
      request: maintenanceRequest,
    });
  } catch (error) {
    console.error('Maintenance request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit maintenance request' },
      { status: 500 }
    );
  }
}

// Get maintenance requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const tenantId = searchParams.get('tenantId');

    // TODO: Fetch from database
    // const requests = await prisma.maintenanceRequest.findMany({
    //   where: { propertyId, tenantId },
    // });

    const mockRequests = [
      {
        id: '1',
        title: 'Leaky faucet in kitchen',
        description: 'The kitchen faucet has been dripping for 2 days',
        priority: 'MEDIUM',
        status: 'OPEN',
        createdAt: new Date(),
      },
    ];

    return NextResponse.json({
      success: true,
      requests: mockRequests,
    });
  } catch (error) {
    console.error('Fetch maintenance requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance requests' },
      { status: 500 }
    );
  }
}
