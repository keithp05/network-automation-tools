import OpenAI from 'openai';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface PropertyComp {
  address: string;
  distance: number; // miles
  price: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt?: number;
  soldDate?: string;
  daysOnMarket?: number;
}

export interface RentalComp {
  address: string;
  distance: number;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rentPerSqft: number;
}

export interface CrimeScore {
  overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreNumber: number; // 0-100
  violentCrimeRate: number;
  propertyCrimeRate: number;
  comparison: string; // "23% safer than national average"
  nearbyIncidents: Array<{
    type: string;
    date: string;
    distance: number;
  }>;
  recommendation: string;
}

export interface ShortTermRental {
  platform: string; // 'Airbnb', 'VRBO', 'Booking.com'
  averageNightlyRate: number;
  seasonalRates: {
    season: string;
    averageRate: number;
    occupancyRate: number;
  }[];
  estimatedOccupancyRate: number; // percentage
  estimatedMonthlyIncome: number;
  estimatedAnnualIncome: number;
  monthlyBreakdown: {
    month: string;
    averageRate: number;
    occupancyRate: number;
    estimatedIncome: number;
  }[];
}

export interface CMAReport {
  propertyId: string;
  estimatedValue: number;
  valueRange: {
    low: number;
    high: number;
  };
  pricePerSqft: number;
  comparables: PropertyComp[];
  rentalComps: RentalComp[];
  estimatedRent: number;
  rentRange: {
    low: number;
    high: number;
  };
  shortTermRental?: ShortTermRental;
  crimeScore: CrimeScore;
  aiAnalysis: {
    marketSummary: string;
    investmentPotential: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  };
  generatedAt: Date;
}

class PropertyAnalysisService {
  /**
   * Generate sales comparables (demo data for now)
   */
  private async getSalesComps(property: any): Promise<PropertyComp[]> {
    // Demo comparable sales
    const basePrice = property.purchasePrice || 250000;
    const baseSqft = property.squareFeet || 1500;

    return [
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Oak', 'Maple', 'Pine', 'Elm'][Math.floor(Math.random() * 4)]} St`,
        distance: 0.3,
        price: basePrice * (0.95 + Math.random() * 0.1),
        pricePerSqft: Math.round((basePrice * (0.95 + Math.random() * 0.1)) / baseSqft),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 200 - 100),
        yearBuilt: 2010 + Math.floor(Math.random() * 10),
        soldDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOnMarket: Math.floor(Math.random() * 60),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Cedar', 'Birch', 'Willow', 'Ash'][Math.floor(Math.random() * 4)]} Ave`,
        distance: 0.5,
        price: basePrice * (0.93 + Math.random() * 0.14),
        pricePerSqft: Math.round((basePrice * (0.93 + Math.random() * 0.14)) / baseSqft),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms + (Math.random() > 0.5 ? 0.5 : 0),
        squareFeet: baseSqft + Math.floor(Math.random() * 300 - 150),
        yearBuilt: 2008 + Math.floor(Math.random() * 12),
        soldDate: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOnMarket: Math.floor(Math.random() * 90),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Spruce', 'Poplar', 'Walnut', 'Cherry'][Math.floor(Math.random() * 4)]} Dr`,
        distance: 0.8,
        price: basePrice * (0.92 + Math.random() * 0.16),
        pricePerSqft: Math.round((basePrice * (0.92 + Math.random() * 0.16)) / baseSqft),
        bedrooms: property.bedrooms + (Math.random() > 0.7 ? 1 : 0),
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 400 - 200),
        yearBuilt: 2005 + Math.floor(Math.random() * 15),
        soldDate: new Date(Date.now() - Math.random() * 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOnMarket: Math.floor(Math.random() * 120),
      },
    ];
  }

  /**
   * Generate rental comparables (demo data for now)
   */
  private async getRentalComps(property: any): Promise<RentalComp[]> {
    const baseSqft = property.squareFeet || 1500;
    const baseRent = Math.round((property.purchasePrice || 250000) * 0.008); // 0.8% rule

    return [
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Valley', 'Hill', 'Park', 'Lake'][Math.floor(Math.random() * 4)]} Rd`,
        distance: 0.4,
        monthlyRent: baseRent * (0.95 + Math.random() * 0.1),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 200 - 100),
        rentPerSqft: +(baseRent * (0.95 + Math.random() * 0.1) / baseSqft).toFixed(2),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['River', 'Forest', 'Meadow', 'Garden'][Math.floor(Math.random() * 4)]} Ln`,
        distance: 0.6,
        monthlyRent: baseRent * (0.93 + Math.random() * 0.14),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 300 - 150),
        rentPerSqft: +(baseRent * (0.93 + Math.random() * 0.14) / baseSqft).toFixed(2),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Summit', 'Ridge', 'Creek', 'Bay'][Math.floor(Math.random() * 4)]} Ct`,
        distance: 0.9,
        monthlyRent: baseRent * (0.9 + Math.random() * 0.2),
        bedrooms: property.bedrooms + (Math.random() > 0.7 ? 1 : 0),
        bathrooms: property.bathrooms + (Math.random() > 0.5 ? 0.5 : 0),
        squareFeet: baseSqft + Math.floor(Math.random() * 400 - 200),
        rentPerSqft: +(baseRent * (0.9 + Math.random() * 0.2) / baseSqft).toFixed(2),
      },
    ];
  }

  /**
   * Get crime score for property location
   * Uses free crime data APIs and generates A-F score
   */
  private async getCrimeScore(property: any): Promise<CrimeScore> {
    // Demo crime data - in production, integrate with SpotCrime API or FBI Crime Data API
    const scoreNumber = 60 + Math.random() * 35; // 60-95 (most areas are relatively safe)

    let overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
    if (scoreNumber >= 90) overallScore = 'A';
    else if (scoreNumber >= 80) overallScore = 'B';
    else if (scoreNumber >= 70) overallScore = 'C';
    else if (scoreNumber >= 60) overallScore = 'D';
    else overallScore = 'F';

    const violentCrimeRate = +(2 + Math.random() * 3).toFixed(1); // per 1000 residents
    const propertyCrimeRate = +(10 + Math.random() * 15).toFixed(1); // per 1000 residents

    const nationalAvgViolent = 3.8;
    const percentDiff = Math.round(((nationalAvgViolent - violentCrimeRate) / nationalAvgViolent) * 100);
    const comparison = percentDiff > 0
      ? `${percentDiff}% safer than national average`
      : `${Math.abs(percentDiff)}% higher crime than national average`;

    const crimeTypes = ['Theft', 'Burglary', 'Vandalism', 'Assault', 'Vehicle Theft', 'Robbery'];
    const nearbyIncidents = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({
      type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      distance: +(Math.random() * 1.5).toFixed(2),
    }));

    let recommendation = '';
    if (overallScore === 'A') recommendation = 'Excellent safety rating. Very low crime area ideal for families and long-term investment.';
    else if (overallScore === 'B') recommendation = 'Good safety rating. Below average crime rates make this a solid investment area.';
    else if (overallScore === 'C') recommendation = 'Average safety rating. Crime rates are moderate. Consider security measures for rental properties.';
    else if (overallScore === 'D') recommendation = 'Below average safety rating. Higher crime rates may affect property values and rental demand.';
    else recommendation = 'Poor safety rating. High crime area may present challenges for rental management and property values.';

    return {
      overallScore,
      scoreNumber: Math.round(scoreNumber),
      violentCrimeRate,
      propertyCrimeRate,
      comparison,
      nearbyIncidents,
      recommendation,
    };
  }

  /**
   * Generate AI-powered market analysis using OpenAI
   */
  private async generateAIAnalysis(
    property: any,
    comps: PropertyComp[],
    rentalComps: RentalComp[],
    crimeScore: CrimeScore
  ): Promise<CMAReport['aiAnalysis']> {
    if (!openai) {
      // Fallback if no OpenAI key configured
      return {
        marketSummary: `This ${property.bedrooms} bed, ${property.bathrooms} bath property in ${property.city}, ${property.state} is priced at $${property.purchasePrice?.toLocaleString() || 'N/A'}. Based on comparable sales, the property appears to be ${Math.random() > 0.5 ? 'fairly' : 'competitively'} priced for the current market.`,
        investmentPotential: `With an estimated rental income and current market conditions, this property shows ${['strong', 'moderate', 'good'][Math.floor(Math.random() * 3)]} investment potential. The crime score of ${crimeScore.overallScore} indicates a ${crimeScore.overallScore === 'A' || crimeScore.overallScore === 'B' ? 'safe' : 'moderate'} neighborhood.`,
        strengths: [
          'Competitive pricing for the area',
          `${crimeScore.overallScore} crime rating - ${crimeScore.comparison}`,
          'Strong rental demand in market',
        ],
        concerns: [
          'Limited comparable sales data available',
          'Market volatility should be monitored',
        ],
        recommendation: 'Proceed with due diligence. Property shows investment merit based on current market analysis.',
      };
    }

    try {
      const prompt = `You are a real estate investment analyst. Analyze this property and provide detailed insights:

Property Details:
- Address: ${property.address}, ${property.city}, ${property.state}
- Price: $${property.purchasePrice?.toLocaleString()}
- Beds/Baths: ${property.bedrooms}/${property.bathrooms}
- Square Feet: ${property.squareFeet?.toLocaleString()}
- Type: ${property.propertyType}
${property.metadata?.isAuction ? `- AUCTION PROPERTY: ${property.metadata.auctionType} on ${property.metadata.auctionDateFormatted}` : ''}
${property.metadata?.estimatedEquity ? `- Estimated Equity Potential: $${property.metadata.estimatedEquity.toLocaleString()}` : ''}

Comparable Sales (avg price: $${Math.round(comps.reduce((s, c) => s + c.price, 0) / comps.length).toLocaleString()}):
${comps.map(c => `- ${c.address}: $${c.price.toLocaleString()} (${c.squareFeet} sqft, ${c.daysOnMarket} days on market)`).join('\n')}

Rental Comps (avg rent: $${Math.round(rentalComps.reduce((s, c) => s + c.monthlyRent, 0) / rentalComps.length).toLocaleString()}):
${rentalComps.map(c => `- ${c.address}: $${c.monthlyRent}/mo (${c.bedrooms}bed/${c.bathrooms}bath, ${c.squareFeet} sqft)`).join('\n')}

Crime Score: ${crimeScore.overallScore} (${crimeScore.scoreNumber}/100) - ${crimeScore.comparison}

Provide analysis in this JSON format:
{
  "marketSummary": "2-3 sentence overview of the property and market",
  "investmentPotential": "2-3 sentence analysis of ROI potential",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "Clear buy/pass recommendation with reasoning"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      return analysis;
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      // Return fallback analysis
      return {
        marketSummary: `Property analysis for ${property.address}. Based on market data, this property is positioned competitively.`,
        investmentPotential: 'Investment potential looks promising based on comparable sales and rental data.',
        strengths: ['Competitive market pricing', 'Good location fundamentals'],
        concerns: ['Requires further due diligence'],
        recommendation: 'Consider this property for your investment portfolio pending inspection and financing approval.',
      };
    }
  }

  /**
   * Generate complete CMA report with all analysis
   */
  async generateCMAReport(property: any): Promise<CMAReport> {
    console.log('🏠 Generating CMA Report for:', property.address);

    // Gather all data in parallel
    const [comps, rentalComps, crimeScore] = await Promise.all([
      this.getSalesComps(property),
      this.getRentalComps(property),
      this.getCrimeScore(property),
    ]);

    // Calculate estimated values
    const avgCompPrice = comps.reduce((sum, comp) => sum + comp.price, 0) / comps.length;
    const estimatedValue = Math.round(avgCompPrice);
    const valueRange = {
      low: Math.round(estimatedValue * 0.95),
      high: Math.round(estimatedValue * 1.05),
    };

    const avgRent = rentalComps.reduce((sum, comp) => sum + comp.monthlyRent, 0) / rentalComps.length;
    const estimatedRent = Math.round(avgRent);
    const rentRange = {
      low: Math.round(estimatedRent * 0.9),
      high: Math.round(estimatedRent * 1.1),
    };

    const baseSqft = property.squareFeet || 1500;
    const pricePerSqft = Math.round(estimatedValue / baseSqft);

    // Generate AI analysis
    const aiAnalysis = await this.generateAIAnalysis(property, comps, rentalComps, crimeScore);

    const report: CMAReport = {
      propertyId: property.id,
      estimatedValue,
      valueRange,
      pricePerSqft,
      comparables: comps,
      rentalComps,
      estimatedRent,
      rentRange,
      crimeScore,
      aiAnalysis,
      generatedAt: new Date(),
    };

    console.log('✅ CMA Report generated successfully');
    return report;
  }
}

export const propertyAnalysisService = new PropertyAnalysisService();
