import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Lease Generator Service
 * Generates professional lease agreements with legal compliance
 */

export interface LeaseData {
  // Property Information
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;

  // Landlord Information
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;

  // Tenant Information
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;

  // Lease Terms
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  lateFeeAmount?: number;
  lateFeeGracePeriod?: number;

  // Additional Terms
  petPolicy?: 'allowed' | 'not_allowed' | 'with_deposit';
  petDeposit?: number;
  utilitiesIncluded?: string[];
  parkingSpaces?: number;
  additionalTerms?: string[];
}

export class LeaseGeneratorService {

  /**
   * Generate a complete lease agreement
   */
  async generateLease(data: LeaseData): Promise<string> {
    const prompt = `
Generate a comprehensive, legally compliant residential lease agreement with the following details:

PROPERTY:
${data.propertyAddress}
${data.city}, ${data.state} ${data.zipCode}

LANDLORD:
Name: ${data.landlordName}
Email: ${data.landlordEmail}
Phone: ${data.landlordPhone}

TENANT:
Name: ${data.tenantName}
Email: ${data.tenantEmail}
Phone: ${data.tenantPhone}

LEASE TERMS:
- Start Date: ${data.startDate}
- End Date: ${data.endDate}
- Monthly Rent: $${data.monthlyRent}
- Security Deposit: $${data.securityDeposit}
${data.lateFeeAmount ? `- Late Fee: $${data.lateFeeAmount} (after ${data.lateFeeGracePeriod || 5} days grace period)` : ''}
${data.petPolicy ? `- Pet Policy: ${data.petPolicy}` : ''}
${data.petDeposit ? `- Pet Deposit: $${data.petDeposit}` : ''}
${data.utilitiesIncluded ? `- Utilities Included: ${data.utilitiesIncluded.join(', ')}` : ''}
${data.parkingSpaces ? `- Parking Spaces: ${data.parkingSpaces}` : ''}

Include standard clauses for:
1. Rent Payment Terms
2. Security Deposit Rules
3. Maintenance Responsibilities
4. Property Use and Restrictions
5. Entry and Inspection Rights
6. Termination Conditions
7. Legal Compliance (Fair Housing, etc.)
8. Dispute Resolution

Make it compliant with ${data.state} state laws.

Format as a professional legal document with proper structure and formatting.
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a real estate attorney specializing in residential lease agreements. Generate legally sound, comprehensive lease documents.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const leaseContent = response.choices[0].message.content || '';

      return this.formatLeaseDocument(leaseContent, data);
    } catch (error) {
      console.error('Lease generation error:', error);
      throw new Error('Failed to generate lease agreement');
    }
  }

  /**
   * Format the lease document with proper structure
   */
  private formatLeaseDocument(content: string, data: LeaseData): string {
    const header = `
RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()} by and between:

LANDLORD: ${data.landlordName}
TENANT: ${data.tenantName}

PROPERTY ADDRESS: ${data.propertyAddress}, ${data.city}, ${data.state} ${data.zipCode}

---

${content}

---

SIGNATURES

By signing below, both parties acknowledge that they have read, understood, and agree to all terms and conditions of this Lease Agreement.

LANDLORD: _____________________________ Date: __________
${data.landlordName}

TENANT: _____________________________ Date: __________
${data.tenantName}

---

This document was generated on ${new Date().toLocaleDateString()}
    `.trim();

    return header;
  }

  /**
   * Generate lease amendment
   */
  async generateAmendment(
    originalLease: string,
    amendmentDetails: string
  ): Promise<string> {
    const prompt = `
Generate a lease amendment document based on this original lease and the requested changes:

ORIGINAL LEASE:
${originalLease.substring(0, 2000)}... [truncated]

AMENDMENT DETAILS:
${amendmentDetails}

Create a formal amendment document that:
1. References the original lease
2. Clearly states the changes
3. Maintains legal compliance
4. Includes signature blocks
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Amendment generation error:', error);
      throw new Error('Failed to generate lease amendment');
    }
  }

  /**
   * Validate lease data before generation
   */
  validateLeaseData(data: LeaseData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.propertyAddress) errors.push('Property address is required');
    if (!data.landlordName) errors.push('Landlord name is required');
    if (!data.tenantName) errors.push('Tenant name is required');
    if (!data.startDate) errors.push('Start date is required');
    if (!data.endDate) errors.push('End date is required');
    if (!data.monthlyRent || data.monthlyRent <= 0) errors.push('Valid monthly rent is required');
    if (!data.securityDeposit || data.securityDeposit < 0) errors.push('Valid security deposit is required');

    // Validate dates
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      errors.push('End date must be after start date');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate move-in checklist
   */
  async generateMoveInChecklist(propertyAddress: string): Promise<string> {
    const prompt = `
Generate a comprehensive move-in inspection checklist for a rental property at:
${propertyAddress}

Include sections for:
- Living Room
- Kitchen
- Bedrooms
- Bathrooms
- Exterior
- Appliances
- HVAC System
- Plumbing
- Electrical

Each item should have checkboxes for condition rating and space for notes.
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Checklist generation error:', error);
      throw new Error('Failed to generate move-in checklist');
    }
  }
}

export const leaseGenerator = new LeaseGeneratorService();
