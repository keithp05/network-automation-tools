import OpenAI from 'openai';
import { CMAData, Property, DemographicsData } from '@/types/property';

/**
 * AI Analysis Service
 * Uses OpenAI to perform Comparative Market Analysis (CMA) and rental projections
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIAnalysisService {

  /**
   * Generate a comprehensive CMA report using AI
   */
  async generateCMA(property: Property, comparables: Property[]): Promise<CMAData> {
    const prompt = `
You are a real estate analyst. Analyze this property and provide a Comparative Market Analysis (CMA).

TARGET PROPERTY:
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
- Type: ${property.propertyType}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet || 'Unknown'}
- Year Built: ${property.yearBuilt || 'Unknown'}
- Asking Price: $${property.purchasePrice?.toLocaleString() || 'Unknown'}

COMPARABLE PROPERTIES:
${comparables.map((c, i) => `
${i + 1}. ${c.address}, ${c.city}
   - Bedrooms: ${c.bedrooms}, Bathrooms: ${c.bathrooms}
   - Square Feet: ${c.squareFeet}
   - Price: $${c.currentValue?.toLocaleString()}
`).join('\n')}

Provide a detailed analysis including:
1. Estimated market value with confidence level (0-1)
2. Price per square foot analysis
3. Market trends assessment
4. Investment recommendations
5. Potential risks and opportunities

Respond in JSON format:
{
  "estimatedValue": <number>,
  "confidence": <0-1>,
  "pricePerSqFt": <number>,
  "marketTrends": {
    "direction": "up|down|stable",
    "strength": "weak|moderate|strong"
  },
  "recommendations": "<detailed analysis>",
  "risks": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"]
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');

      return {
        estimatedValue: analysis.estimatedValue,
        confidence: analysis.confidence,
        comparables: comparables.slice(0, 5).map(c => ({
          address: `${c.address}, ${c.city}`,
          soldPrice: c.currentValue || 0,
          soldDate: c.updatedAt.toISOString(),
          bedrooms: c.bedrooms,
          bathrooms: c.bathrooms,
          squareFeet: c.squareFeet || 0,
          distance: 0, // Calculate actual distance
        })),
        marketTrends: {
          priceChange3Month: 0, // Calculate from historical data
          priceChange6Month: 0,
          priceChange12Month: 0,
        },
        recommendations: analysis.recommendations,
      };
    } catch (error) {
      console.error('CMA generation error:', error);
      throw new Error('Failed to generate CMA');
    }
  }

  /**
   * Estimate rental rates using AI
   */
  async estimateRentalRate(property: Property): Promise<number> {
    const prompt = `
You are a rental market expert. Estimate the monthly rental rate for this property.

PROPERTY DETAILS:
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
- Type: ${property.propertyType}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet || 'Unknown'}
- Year Built: ${property.yearBuilt || 'Unknown'}
${property.currentValue ? `- Property Value: $${property.currentValue.toLocaleString()}` : ''}

Consider:
1. Local rental market conditions
2. Property features and condition
3. Neighborhood quality
4. Comparable rental listings
5. Seasonal variations

Provide:
{
  "estimatedMonthlyRent": <number>,
  "rentRange": {
    "low": <number>,
    "high": <number>
  },
  "confidenceLevel": <0-1>,
  "factors": ["factor1", "factor2"],
  "seasonalAdjustment": "<explanation>"
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis.estimatedMonthlyRent;
    } catch (error) {
      console.error('Rental estimation error:', error);
      throw new Error('Failed to estimate rental rate');
    }
  }

  /**
   * Analyze tenant demographics and rental demand
   */
  async analyzeTenantDemographics(property: Property): Promise<DemographicsData> {
    const prompt = `
Analyze the tenant demographics and rental demand for this area:

LOCATION: ${property.city}, ${property.state} ${property.zipCode}
PROPERTY TYPE: ${property.propertyType}
BEDROOMS: ${property.bedrooms}

Provide detailed demographic analysis including:
1. Target tenant profile
2. Rental demand level (low/medium/high)
3. Average tenant duration
4. Income requirements
5. Competition analysis

Respond in JSON:
{
  "population": <number>,
  "medianIncome": <number>,
  "medianAge": <number>,
  "educationLevel": "<description>",
  "employmentRate": <0-1>,
  "rentalDemand": "low|medium|high",
  "appreciationForecast": <percentage>,
  "tenantProfile": "<description>",
  "recommendations": "<strategies>"
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');

      return {
        population: analysis.population || 0,
        medianIncome: analysis.medianIncome || 0,
        medianAge: analysis.medianAge || 0,
        educationLevel: analysis.educationLevel || '',
        employmentRate: analysis.employmentRate || 0,
        rentalDemand: analysis.rentalDemand || 'medium',
        appreciationForecast: analysis.appreciationForecast || 0,
      };
    } catch (error) {
      console.error('Demographics analysis error:', error);
      throw new Error('Failed to analyze demographics');
    }
  }

  /**
   * Generate investment analysis report
   */
  async generateInvestmentReport(property: Property, cma: CMAData, rentalRate: number): Promise<string> {
    const purchasePrice = property.purchasePrice || property.currentValue || 0;
    const annualRent = rentalRate * 12;
    const grossYield = (annualRent / purchasePrice) * 100;

    const prompt = `
Generate a comprehensive investment analysis report for this property:

PROPERTY:
- Address: ${property.address}, ${property.city}, ${property.state}
- Purchase Price: $${purchasePrice.toLocaleString()}
- Estimated Value: $${cma.estimatedValue.toLocaleString()}
- Monthly Rent: $${rentalRate.toLocaleString()}
- Gross Yield: ${grossYield.toFixed(2)}%

MARKET ANALYSIS:
- Confidence: ${(cma.confidence * 100).toFixed(0)}%
- Recommendations: ${cma.recommendations}

Provide:
1. Investment grade (A+, A, B+, B, C+, C, D)
2. Cash flow projection
3. ROI analysis (5, 10, 20 year)
4. Risk assessment
5. Action recommendations

Format as a detailed markdown report.
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Investment report error:', error);
      throw new Error('Failed to generate investment report');
    }
  }
}

export const aiAnalysisService = new AIAnalysisService();
