import { Property } from '@/types/property';

/**
 * Demo Data Service
 * Provides sample properties for testing when real APIs aren't available
 */

export class DemoDataService {
  /**
   * Generate demo properties for a given location
   */
  getDemoProperties(city: string, state: string, count: number = 10): Property[] {
    const properties: Property[] = [];

    const addresses = [
      '1234 Oak Street',
      '5678 Maple Avenue',
      '9012 Pine Drive',
      '3456 Elm Boulevard',
      '7890 Cedar Lane',
      '2345 Birch Court',
      '6789 Willow Way',
      '123 Magnolia Drive',
      '456 Cypress Street',
      '789 Poplar Avenue',
    ];

    const types = ['SINGLE_FAMILY', 'MULTI_FAMILY', 'CONDO', 'TOWNHOUSE'] as const;
    const sources = ['demo-county', 'demo-craigslist', 'demo-auction', 'demo-listing'];
    const auctionTypes = ['Tax Sale', 'Foreclosure', 'Sheriff Sale', 'Trustee Sale'];

    for (let i = 0; i < Math.min(count, addresses.length); i++) {
      const basePrice = 200000 + Math.random() * 400000;
      const beds = Math.floor(Math.random() * 4) + 2; // 2-5 bedrooms
      const baths = Math.floor(Math.random() * 3) + 1; // 1-3 bathrooms
      const sqft = Math.floor(1200 + Math.random() * 2000); // 1200-3200 sqft
      const source = sources[i % sources.length];

      // Generate auction date (next 30 days for auction properties)
      const isAuction = source === 'demo-auction';
      const auctionDate = isAuction
        ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000)
        : null;
      const auctionType = isAuction ? auctionTypes[Math.floor(Math.random() * auctionTypes.length)] : null;

      // Auction properties typically sell below market value
      const auctionDiscount = isAuction ? 0.6 + Math.random() * 0.2 : 1; // 60-80% of value

      // Calculate estimated equity (difference between market value and auction price)
      const estimatedEquity = isAuction ? Math.round(basePrice * (1 - auctionDiscount)) : undefined;

      // Calculate days until auction
      const daysUntilAuction = isAuction && auctionDate
        ? Math.ceil((auctionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : undefined;

      properties.push({
        id: `demo-${city}-${i}`,
        address: addresses[i],
        city,
        state,
        zipCode: String(78700 + i),
        latitude: 30.2672 + (Math.random() - 0.5) * 0.1,
        longitude: -97.7431 + (Math.random() - 0.5) * 0.1,
        propertyType: types[Math.floor(Math.random() * types.length)],
        bedrooms: beds,
        bathrooms: baths,
        squareFeet: sqft,
        lotSize: Math.floor(5000 + Math.random() * 5000),
        yearBuilt: Math.floor(1980 + Math.random() * 40),
        purchasePrice: Math.round(basePrice * auctionDiscount),
        currentValue: Math.round(basePrice),
        status: 'SEARCHING',
        source,
        externalId: `demo-${Date.now()}-${i}`,
        sourceUrl: `https://example.com/property/${i}`,
        images: [
          `https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop&q=80`,
          `https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop&q=80`,
        ],
        metadata: {
          isDemo: true,
          daysOnMarket: Math.floor(Math.random() * 60),
          pricePerSqft: Math.round(basePrice / sqft),
          dataSource: isAuction ? 'County Auction' : 'Demo Data',
          // Auction-specific metadata
          isAuction,
          auctionType,
          auctionDate: auctionDate?.toISOString(),
          auctionDateFormatted: auctionDate?.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          estimatedEquity,
          daysUntilAuction,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Property);
    }

    return properties;
  }

  /**
   * Check if we should use demo data
   * Returns true if no real data was found
   */
  shouldUseDemoData(realProperties: Property[]): boolean {
    return realProperties.length === 0;
  }
}

export const demoDataService = new DemoDataService();
