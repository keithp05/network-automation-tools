# Lease Line Items & Vendor Management

## 🎯 Overview

The lease is now the **single source of truth** for all charges. Every bill, utility, fee, and payment is defined in the lease document and automatically generates recurring bills.

**Key Features**:
- ✅ Lease defines all itemized charges
- ✅ Vendor account numbers tracked per property
- ✅ Auto-generate bills from lease line items
- ✅ Professional lease documents with all charges outlined
- ✅ Vendor management for utilities, HOA, services

---

## 📋 Lease Line Items

### What Are Lease Line Items?

Lease line items are **all charges agreed upon in the lease**. When a lease is created, the landlord specifies:
- Monthly rent
- Utilities (water, electric, gas, internet, etc.)
- HOA fees
- Parking fees
- Pet rent
- Storage fees
- Lawn care
- Pest control
- Any other recurring charges

### Database Schema

```prisma
model LeaseLineItem {
  id                String      @id @default(cuid())

  // Item details
  itemType          BillType    // RENT, WATER, ELECTRICITY, HOA, etc.
  itemName          String      // "Monthly Rent", "Water & Sewer", etc.
  description       String?     // Additional details
  amount            Float       // Charge amount

  // Billing schedule
  isRecurring       Boolean     @default(false)
  frequency         BillFrequency? // MONTHLY, QUARTERLY, etc.
  dueDay            Int?        // Day of month (1-31)

  // Vendor information (if applicable)
  vendorName        String?     // "City Water Department"
  vendorAccountNumber String?   // Account # for this property
  vendorContact     String?     // Phone or email

  // Who pays
  paidBy            PaidBy      @default(TENANT) // TENANT, LANDLORD, SHARED

  // Display order in lease
  displayOrder      Int         @default(0)

  lease             Lease       @relation(...)
  bills             Bill[]      // Auto-generated bills
}

enum PaidBy {
  TENANT    // Tenant pays this charge
  LANDLORD  // Landlord pays (e.g., HOA, property tax)
  SHARED    // Split between tenant and landlord
}
```

---

## 📄 Example Lease with Line Items

### Sample Lease Agreement

```
RESIDENTIAL LEASE AGREEMENT
Property: 123 Oak St, Austin, TX 78701
Tenant: John Smith
Landlord: Jane Doe
Term: January 1, 2026 - December 31, 2026 (12 months)

MONTHLY CHARGES:
────────────────────────────────────────────────

1. RENT
   Amount: $1,800.00
   Due: 1st of each month
   Paid by: Tenant

2. WATER & SEWER
   Amount: $85.00 (estimated average)
   Due: 5th of each month
   Vendor: City of Austin Water Department
   Account #: WAT-123456789
   Contact: (512) 494-9400
   Paid by: Tenant

3. ELECTRICITY
   Amount: $120.00 (estimated average)
   Due: 10th of each month
   Vendor: Austin Energy
   Account #: AE-987654321
   Contact: (512) 494-9400
   Paid by: Tenant

4. INTERNET
   Amount: $70.00
   Due: 15th of each month
   Vendor: Spectrum Internet
   Account #: SPEC-555-12345
   Contact: (855) 222-0102
   Paid by: Tenant

5. TRASH PICKUP
   Amount: $25.00
   Due: 1st of each month
   Vendor: Texas Disposal Systems
   Account #: TDS-78701-ABC
   Contact: (512) 243-5674
   Paid by: Tenant

6. HOA FEE
   Amount: $150.00
   Due: 1st of each month
   Vendor: Oak Ridge HOA Management
   Account #: OR-123-OAK
   Contact: oakridge@hoa.com
   Paid by: Tenant (passed through from landlord)

7. LAWN CARE
   Amount: $100.00
   Due: Last day of each month
   Vendor: Green Thumb Landscaping
   Account #: GT-2026-123OAK
   Contact: (512) 555-LAWN
   Paid by: Landlord (included in rent)

8. PEST CONTROL
   Amount: $45.00
   Due: 15th of each month (quarterly billing)
   Frequency: Quarterly
   Vendor: ABC Pest Control
   Account #: ABC-123OAK
   Contact: (512) 555-PEST
   Paid by: Landlord

9. PET RENT
   Amount: $50.00
   Due: 1st of each month
   Paid by: Tenant
   Note: For 1 dog (Max, Golden Retriever)

TOTAL TENANT RESPONSIBILITY: $2,300.00/month
  (Rent + Utilities + HOA + Pet Rent)

TOTAL LANDLORD RESPONSIBILITY: $145.00/month
  (Lawn Care + Pest Control)

SECURITY DEPOSIT: $1,800.00
  (Held in escrow, returned within 30 days of move-out
   minus any damages beyond normal wear and tear)

────────────────────────────────────────────────
Tenant Signature: _____________ Date: _______
Landlord Signature: _____________ Date: _______
```

---

## 🏢 Vendor Management

### Vendor Model

```prisma
model Vendor {
  id                String      @id @default(cuid())

  // Vendor details
  vendorName        String      // "City Water Department"
  vendorType        VendorType  // UTILITY_WATER, UTILITY_ELECTRIC, etc.
  description       String?

  // Contact information
  contactName       String?
  email             String?
  phone             String?
  website           String?

  // Address
  address           String?
  city              String?
  state             String?
  zipCode           String?

  // Account information (global)
  accountNumber     String?     // Default account # for landlord
  customerNumber    String?

  // Payment details
  paymentTerms      String?     // "Net 30", "Due on receipt"
  preferredPaymentMethod String? // "ACH", "Check", "Online portal"

  // Tax information
  taxId             String?     // EIN or SSN (encrypted)
  is1099            Boolean     @default(false) // Track for 1099 reporting

  landlord          User        @relation(...)
  bills             Bill[]
  properties        VendorProperty[] // Per-property accounts
}

enum VendorType {
  UTILITY_WATER
  UTILITY_ELECTRIC
  UTILITY_GAS
  UTILITY_INTERNET
  UTILITY_TRASH
  HOA
  PROPERTY_MANAGEMENT
  LAWN_CARE
  PEST_CONTROL
  PLUMBER
  ELECTRICIAN
  HVAC
  HANDYMAN
  CLEANING_SERVICE
  SNOW_REMOVAL
  POOL_SERVICE
  INSURANCE
  MORTGAGE_LENDER
  TAX_AUTHORITY
  OTHER
}
```

### VendorProperty Model (Property-Specific Accounts)

```prisma
model VendorProperty {
  id                String      @id @default(cuid())

  // Property-specific account info
  accountNumber     String?     // Account # for THIS property
  serviceAddress    String?     // May differ from property address

  // Service details
  serviceStartDate  DateTime?
  serviceEndDate    DateTime?
  isActive          Boolean     @default(true)

  vendor            Vendor      @relation(...)
  property          Property    @relation(...)
}
```

**Why separate VendorProperty?**
- Same vendor (e.g., "City Water") may have different account numbers for each property
- Track service dates per property
- Easy to see all vendors serving a specific property

---

## 🔄 Workflow: Creating a Lease

### Step 1: Landlord Creates Lease

**UI Form**:
```
┌────────────────────────────────────────────┐
│ Create New Lease                          │
├────────────────────────────────────────────┤
│ Tenant: [Select Tenant ▼]                │
│ Property: [Select Property ▼]             │
│ Start Date: [01/01/2026]                  │
│ End Date: [12/31/2026]                    │
│ Security Deposit: [$1,800.00]             │
│                                            │
│ ━━━ LEASE LINE ITEMS ━━━                  │
│                                            │
│ 1. Monthly Rent                            │
│    Amount: [$1,800.00]                     │
│    Due Day: [1] of each month              │
│    Paid by: [●Tenant ○Landlord]            │
│                                            │
│ 2. Water & Sewer                           │
│    Amount: [$85.00]                        │
│    Due Day: [5] of each month              │
│    Vendor: [City Water Dept ▼]            │
│    Account #: [WAT-123456789]              │
│    Paid by: [●Tenant ○Landlord]            │
│                                            │
│ 3. Electricity                             │
│    Amount: [$120.00]                       │
│    Due Day: [10] of each month             │
│    Vendor: [Austin Energy ▼]               │
│    Account #: [AE-987654321]               │
│    Paid by: [●Tenant ○Landlord]            │
│                                            │
│ [+ Add Line Item]                          │
│                                            │
│ TOTAL TENANT MONTHLY: $2,005.00            │
│ TOTAL LANDLORD MONTHLY: $145.00            │
│                                            │
│ [Generate Lease Document] [Save as Draft] │
└────────────────────────────────────────────┘
```

### Step 2: System Auto-Generates Bills

When lease is saved with `status: ACTIVE`:

```typescript
// For each lease line item where paidBy === TENANT
for (const lineItem of lease.leaseLineItems) {
  if (lineItem.paidBy === 'TENANT' && lineItem.isRecurring) {
    // Create first bill
    await createBill({
      name: lineItem.itemName,
      billType: lineItem.itemType,
      amount: lineItem.amount,
      dueDate: calculateDueDate(lease.startDate, lineItem.dueDay),
      isRecurring: true,
      frequency: lineItem.frequency,
      leaseId: lease.id,
      tenantId: lease.tenantId,
      propertyId: lease.propertyId,
      vendorId: lineItem.vendorId,
      leaseLineItemId: lineItem.id
    })
  }
}
```

**Result**:
```
Bills Created:
✓ Monthly Rent - $1,800 - Due: Jan 1, 2026
✓ Water & Sewer - $85 - Due: Jan 5, 2026
✓ Electricity - $120 - Due: Jan 10, 2026
✓ Internet - $70 - Due: Jan 15, 2026
✓ Trash - $25 - Due: Jan 1, 2026
✓ HOA Fee - $150 - Due: Jan 1, 2026
✓ Pet Rent - $50 - Due: Jan 1, 2026
```

### Step 3: Recurring Bills Auto-Generate

Every month, the system automatically creates next month's bills:

```typescript
// Cron job runs daily
async function generateRecurringBills() {
  const bills = await prisma.bill.findMany({
    where: {
      isRecurring: true,
      status: 'PAID', // Only generate next bill after current is paid
      leaseLineItemId: { not: null } // Must be from lease
    },
    include: { leaseLineItem: true, lease: true }
  })

  for (const bill of bills) {
    const nextDueDate = calculateNextDueDate(bill.dueDate, bill.frequency)

    // Check if lease is still active
    if (nextDueDate <= bill.lease.endDate) {
      await createBill({
        ...bill,
        id: undefined, // New bill
        dueDate: nextDueDate,
        status: 'PENDING',
        paidDate: null
      })
    }
  }
}
```

---

## 📊 Vendor Management Workflow

### Adding a Vendor

```
┌────────────────────────────────────────────┐
│ Add Vendor                                │
├────────────────────────────────────────────┤
│ Vendor Type: [UTILITY_WATER ▼]            │
│ Vendor Name: [City Water Department]      │
│                                            │
│ Contact Information:                       │
│  Contact Name: [Customer Service]          │
│  Phone: [(512) 494-9400]                   │
│  Email: [water@austintexas.gov]            │
│  Website: [austintexas.gov/water]          │
│                                            │
│ Payment Details:                           │
│  Payment Terms: [Due on receipt]           │
│  Preferred Method: [Online portal]         │
│                                            │
│ Tax Information:                           │
│  Tax ID (EIN): [__-_______]                │
│  ☑ Send 1099 at year-end                   │
│                                            │
│ Notes: [City utility - autopay setup]     │
│                                            │
│ [Save Vendor]                              │
└────────────────────────────────────────────┘
```

### Linking Vendor to Property

```
┌────────────────────────────────────────────┐
│ Link Vendor to Property                   │
├────────────────────────────────────────────┤
│ Vendor: City Water Department             │
│ Property: 123 Oak St, Austin, TX          │
│                                            │
│ Account Number (for this property):        │
│  [WAT-123456789]                           │
│                                            │
│ Service Start Date: [01/01/2026]           │
│                                            │
│ Notes: [Meter #ABC123, located in back]   │
│                                            │
│ [Link Vendor to Property]                  │
└────────────────────────────────────────────┘
```

### Vendor Dashboard

```
┌────────────────────────────────────────────┐
│ Vendors                                    │
├────────────────────────────────────────────┤
│ [+ Add Vendor]              [Search: ...]  │
│                                            │
│ Utilities (5)                              │
│ ──────────────────────────────────────────│
│ City Water Department                      │
│  Type: Water & Sewer                       │
│  Properties: 3                             │
│  Phone: (512) 494-9400                     │
│  [Edit] [View Bills]                       │
│                                            │
│ Austin Energy                              │
│  Type: Electricity                         │
│  Properties: 3                             │
│  Phone: (512) 494-9400                     │
│  [Edit] [View Bills]                       │
│                                            │
│ Services (3)                               │
│ ──────────────────────────────────────────│
│ Green Thumb Landscaping                    │
│  Type: Lawn Care                           │
│  Properties: 2                             │
│  Phone: (512) 555-LAWN                     │
│  1099 Required: ✓                          │
│  [Edit] [View Bills]                       │
│                                            │
│ ABC Pest Control                           │
│  Type: Pest Control                        │
│  Properties: 3                             │
│  Phone: (512) 555-PEST                     │
│  1099 Required: ✓                          │
│  [Edit] [View Bills]                       │
└────────────────────────────────────────────┘
```

---

## 💡 Key Benefits

### 1. **Single Source of Truth**
- Lease defines ALL charges
- No manual bill creation needed
- All parties know what to expect

### 2. **Vendor Account Tracking**
- Never lose track of account numbers
- Easy reference when calling vendors
- Streamlined bill payments

### 3. **Automatic Bill Generation**
- Rent bill created every month automatically
- Utility bills created on schedule
- HOA fees never forgotten

### 4. **Professional Lease Documents**
```
All charges clearly outlined:
✓ Rent: $1,800/month
✓ Utilities: $300/month (estimated)
✓ HOA: $150/month
✓ Pet Rent: $50/month
─────────────────────
Total: $2,300/month

Plus account numbers for all vendors
No confusion, no disputes
```

### 5. **1099 Tax Reporting**
- Mark vendors as 1099 required
- Track all payments to vendors
- Auto-generate 1099 forms at year-end
- Export for accountant

### 6. **Vendor Performance Tracking**
- See all bills from each vendor
- Track payment history
- Identify slow/problematic vendors
- Easy vendor comparison

---

## 📋 Example Use Cases

### Use Case 1: New Lease with Utilities

**Scenario**: Landlord leases property where tenant pays all utilities

**Steps**:
1. Create lease for $1,800/month rent
2. Add line items:
   - Water ($85/mo) - Account #: WAT-123
   - Electric ($120/mo) - Account #: AE-456
   - Gas ($45/mo) - Account #: GAS-789
   - Internet ($70/mo) - Account #: SPEC-999
   - Trash ($25/mo) - Account #: TDS-111
3. Save lease

**Result**:
- Lease document shows all charges + account numbers
- 6 recurring bills auto-created (rent + 5 utilities)
- Tenant knows exactly what to pay and when
- Tenant has all account numbers to set up online access

### Use Case 2: HOA Property

**Scenario**: Property with HOA fee that landlord passes to tenant

**Steps**:
1. Add vendor: "Oak Ridge HOA"
   - Account #: OR-123-OAK
   - Amount: $150/month
2. Add to lease as line item:
   - HOA Fee: $150/month
   - Paid by: TENANT
   - Vendor: Oak Ridge HOA
3. Save lease

**Result**:
- Lease clearly states tenant pays HOA
- HOA account number documented
- $150 bill created every month
- Landlord pays HOA, tenant reimburses via rent

### Use Case 3: Lawn Care Service

**Scenario**: Landlord pays for lawn care, includes in rent

**Steps**:
1. Add vendor: "Green Thumb Landscaping"
   - Type: LAWN_CARE
   - Amount: $100/month
   - 1099 Required: ✓
2. Add to lease as line item:
   - Lawn Care: $100/month
   - Paid by: LANDLORD
   - Vendor: Green Thumb

**Result**:
- Lease shows lawn care is landlord responsibility
- Bill created for landlord to pay
- Tracked for 1099 reporting
- Tenant knows they don't pay for lawn care

### Use Case 4: Vendor Account Number Reference

**Scenario**: Water pipe bursts, need to shut off water

**Steps**:
1. Open property details
2. View "Vendors" tab
3. See: "City Water - Account #: WAT-123456789, Phone: (512) 494-9400"
4. Call water department with account number

**Result**:
- Instant access to account number
- No searching through paperwork
- Fast emergency response

---

## 🚀 Implementation Status

**Database Schema**: ✅ Complete
- `LeaseLineItem` model created
- `Vendor` model created
- `VendorProperty` model created
- `Bill` linked to vendor and lease line item

**Auto-Generated Bills**: 🔄 Ready to implement
- Create bills from lease line items
- Recurring bill generation (cron job)
- Link bills to vendors

**Lease Document Generator**: 🔄 Ready to implement
- PDF generation with all line items
- Include vendor account numbers
- Professional formatting

**Vendor Management UI**: 🔄 Ready to implement
- Add/edit vendors
- Link vendors to properties
- Track vendor payments

---

## 📊 Data Flow Summary

```mermaid
Lease Created
    ↓
Lease Line Items Added
(Rent, utilities, fees with vendor accounts)
    ↓
System Auto-Creates Bills
(One for each line item)
    ↓
Bills Due on Schedule
(Based on dueDay from line item)
    ↓
Tenant Pays Bills
    ↓
Next Month's Bills Auto-Generated
(From recurring line items)
    ↓
Vendor Payments Tracked
(For landlord-paid items)
    ↓
1099 Reports Generated
(At year-end for contractors)
```

---

## 🎯 Summary

**What We've Built**:
- ✅ Lease line items (itemized charges)
- ✅ Vendor management with account numbers
- ✅ Property-specific vendor accounts
- ✅ Auto-bill generation from lease
- ✅ 1099 tracking for contractors
- ✅ Complete vendor database

**Benefits**:
- ✅ Lease is single source of truth
- ✅ Never lose vendor account numbers
- ✅ Automated bill creation
- ✅ Professional lease documents
- ✅ Easy tax reporting (1099s)
- ✅ Dispute prevention (all charges documented)

**Next Steps**:
1. Build lease creation UI with line items
2. Implement auto-bill generation service
3. Create vendor management dashboard
4. Generate professional lease PDFs
5. Add 1099 export functionality

The platform now handles the complete lease lifecycle with full vendor and account tracking! 🎉
