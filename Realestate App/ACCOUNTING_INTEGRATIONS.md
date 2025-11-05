# Accounting Software Integrations

## 🎯 Overview

Complete integration with major accounting platforms to automatically sync all financial transactions:
- ✅ Rent payments (Income)
- ✅ Utility bills (Expenses)
- ✅ Maintenance costs (Expenses)
- ✅ Property expenses (Expenses)
- ✅ Tenant invoices
- ✅ Security deposits
- ✅ Late fees

**Benefit**: Eliminate manual data entry, ensure accurate tax reporting, real-time financial tracking.

---

## 📊 Supported Platforms

### 1. **QuickBooks Online** ⭐ Most Popular
- **Market Share**: ~80% of small businesses
- **API**: Official Intuit QuickBooks API
- **OAuth 2.0**: Yes
- **Real-time Sync**: Yes
- **Cost**: Free API access (up to 100 requests/min)

**Features**:
- Auto-create invoices for rent
- Record payments
- Track expenses by property
- Generate P&L reports
- Tax-ready categorization

### 2. **QuickBooks Desktop**
- **Market Share**: ~15% of small businesses
- **API**: QuickBooks Desktop SDK / Web Connector
- **OAuth 2.0**: No (uses local XML sync)
- **Real-time Sync**: No (scheduled sync)

**Features**:
- Same as QuickBooks Online
- Requires Windows computer or server for sync
- Batch sync via Web Connector

### 3. **Xero** 🌍 International
- **Market Share**: Popular in UK, Australia, NZ
- **API**: Official Xero API
- **OAuth 2.0**: Yes
- **Real-time Sync**: Yes
- **Cost**: Free API access

**Features**:
- Similar to QuickBooks Online
- Excellent multi-currency support
- Bank reconciliation

### 4. **Wave** 💰 Free Accounting
- **Market Share**: Small businesses, freelancers
- **API**: Official Wave API
- **OAuth 2.0**: Yes
- **Real-time Sync**: Yes
- **Cost**: FREE software + FREE API

**Features**:
- 100% free accounting software
- Perfect for small landlords (1-5 properties)
- Invoice generation
- Receipt scanning

### 5. **FreshBooks**
- **Market Share**: Service-based businesses
- **API**: Official FreshBooks API
- **OAuth 2.0**: Yes
- **Real-time Sync**: Yes

### 6. **Zoho Books**
- **Market Share**: Growing alternative
- **API**: Official Zoho Books API
- **OAuth 2.0**: Yes
- **Real-time Sync**: Yes

### 7. **Sage** (UK focused)
- **Market Share**: Popular in UK
- **API**: Sage Business Cloud API
- **OAuth 2.0**: Yes

### 8. **NetSuite** (Enterprise)
- **Market Share**: Large real estate firms
- **API**: SuiteScript/RESTlet API
- **OAuth 2.0**: Yes (token-based)

### 9. **Bench** (Bookkeeping Service)
- **Market Share**: Bookkeeping + software
- **API**: Limited API
- **Real-time Sync**: Via manual export

### 10. **Manual Export**
- CSV/Excel export for other software
- QBO/QBD import format
- IIF files for QuickBooks

---

## 🔄 How It Works

### Integration Flow:

```mermaid
1. Landlord clicks "Connect to QuickBooks"
        ↓
2. OAuth popup: "Authorize access to your QuickBooks account"
        ↓
3. Landlord approves
        ↓
4. App receives OAuth tokens (access + refresh)
        ↓
5. App syncs chart of accounts
        ↓
6. Landlord maps categories:
   - "Rent Income" → Income:Rental Income
   - "Water Bill" → Expense:Utilities:Water
   - "HOA Fee" → Expense:Property:HOA
        ↓
7. Auto-sync enabled
        ↓
8. Every time payment/bill is recorded:
   → Automatic sync to QuickBooks
```

### Real-Time Sync Example:

**Scenario**: Tenant pays $1,800 rent on December 1

```typescript
// Step 1: Payment recorded in app
await recordPayment({
  amount: 1800,
  tenant: 'John Smith',
  property: '123 Oak St',
  paymentMethod: 'Bank Transfer'
})

// Step 2: Automatic sync to QuickBooks
await syncToQuickBooks({
  type: 'INCOME',
  category: 'Rent Income',
  amount: 1800,
  date: '2025-12-01',
  customer: 'John Smith',
  property: '123 Oak St',
  memo: 'December rent - 123 Oak St'
})

// Step 3: QuickBooks creates transaction
{
  transactionType: 'Invoice Payment',
  customer: 'John Smith',
  amount: 1800.00,
  account: 'Rental Income',
  class: '123 Oak St', // Property tracking
  date: '2025-12-01'
}

// Step 4: Confirmation
✅ Synced to QuickBooks (Invoice #INV-1234)
```

---

## 💾 Database Schema

### **AccountingIntegration Model**

```prisma
model AccountingIntegration {
  platform          AccountingPlatform  // QUICKBOOKS_ONLINE, XERO, WAVE...
  status            IntegrationStatus   // CONNECTED, DISCONNECTED, ERROR

  // OAuth tokens (encrypted)
  accessToken       String?
  refreshToken      String?
  tokenExpiry       DateTime?

  // Platform-specific IDs
  companyId         String?             // QuickBooks Company ID
  realmId           String?             // QuickBooks Realm ID
  organizationId    String?             // Xero Organization ID

  // Auto-sync settings
  autoSync          Boolean @default(true)
  syncFrequency     SyncFrequency       // REAL_TIME, DAILY, WEEKLY
  lastSyncAt        DateTime?
  nextSyncAt        DateTime?

  // What to sync
  syncIncome        Boolean @default(true)
  syncExpenses      Boolean @default(true)
  syncBills         Boolean @default(true)
  syncInvoices      Boolean @default(true)
}
```

### **AccountingTransaction Model**

```prisma
model AccountingTransaction {
  transactionType   TransactionType     // INCOME, EXPENSE
  category          String              // "Rent Income", "Utilities"
  description       String
  amount            Float
  transactionDate   DateTime

  // QuickBooks/Xero ID
  externalId        String?
  externalType      String?             // "Invoice", "Bill", "Payment"

  // Sync status
  synced            Boolean @default(false)
  syncedAt          DateTime?
  syncError         String?
  syncRetryCount    Int @default(0)

  // Related entities
  propertyId        String?
  tenantId          String?
  billId            String?
  paymentId         String?
}
```

### **AccountingSyncLog Model**

```prisma
model AccountingSyncLog {
  syncType          SyncType            // INCOME, EXPENSES, FULL_SYNC
  status            SyncStatus          // PENDING, COMPLETED, FAILED

  recordsProcessed  Int
  recordsSucceeded  Int
  recordsFailed     Int

  startedAt         DateTime
  completedAt       DateTime?
  duration          Int?                // Milliseconds

  errorMessage      String?
  errorDetails      Json?
}
```

---

## 🔐 Security & Authentication

### OAuth 2.0 Flow (QuickBooks Example):

1. **Authorization Request**:
```typescript
const authUrl = `https://appcenter.intuit.com/connect/oauth2?
  client_id=${QUICKBOOKS_CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  response_type=code&
  scope=com.intuit.quickbooks.accounting&
  state=${RANDOM_STATE}`

// Redirect user to authUrl
```

2. **User Authorizes**:
- User logs into QuickBooks
- Approves access to their company
- Redirected back to app

3. **Exchange Code for Tokens**:
```typescript
const tokens = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(CLIENT_ID + ':' + CLIENT_SECRET)}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: `grant_type=authorization_code&code=${AUTH_CODE}&redirect_uri=${REDIRECT_URI}`
})

// Returns:
{
  access_token: '...', // Valid for 1 hour
  refresh_token: '...', // Valid for 100 days
  expires_in: 3600
}
```

4. **Store Tokens (Encrypted)**:
```typescript
await prisma.accountingIntegration.create({
  data: {
    platform: 'QUICKBOOKS_ONLINE',
    accessToken: encrypt(tokens.access_token),
    refreshToken: encrypt(tokens.refresh_token),
    tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    realmId: QUICKBOOKS_COMPANY_ID,
    status: 'CONNECTED'
  }
})
```

5. **Auto-Refresh Tokens**:
```typescript
// Before each API call, check if token expired
if (integration.tokenExpiry < new Date()) {
  const newTokens = await refreshAccessToken(integration.refreshToken)
  await updateTokens(newTokens)
}
```

---

## 📝 Transaction Mapping

### Income Transactions:

| App Transaction | QuickBooks Online | Xero |
|----------------|------------------|------|
| Rent Payment | Invoice Payment (Rental Income) | Invoice Payment (Operating Revenue:Rent) |
| Late Fee | Invoice (Late Fee Income) | Invoice (Other Income:Late Fees) |
| Pet Rent | Invoice Payment (Other Income:Pet Rent) | Invoice Payment (Other Revenue:Pet Rent) |
| Parking Fee | Invoice Payment (Other Income:Parking) | Invoice Payment (Other Revenue:Parking) |

### Expense Transactions:

| App Transaction | QuickBooks Online | Xero |
|----------------|------------------|------|
| Water Bill | Bill (Utilities:Water) | Bill (Operating Expenses:Utilities:Water) |
| Electricity | Bill (Utilities:Electricity) | Bill (Operating Expenses:Utilities:Electricity) |
| HOA Fee | Bill (Property Expenses:HOA) | Bill (Operating Expenses:Property:HOA) |
| Lawn Care | Bill (Property Maintenance:Landscaping) | Bill (Operating Expenses:Maintenance:Lawn) |
| Pest Control | Bill (Property Maintenance:Pest Control) | Bill (Operating Expenses:Maintenance:Pest) |
| Mortgage Payment | Bill (Loan Payment) | Bill (Liabilities:Mortgage) |

### Chart of Accounts Setup:

**Automatic Setup** (First sync creates these accounts):

```
Income:
├─ Rental Income
│  ├─ Monthly Rent
│  ├─ Late Fees
│  └─ Pet Rent
└─ Other Income
   ├─ Parking Fees
   └─ Storage Fees

Expenses:
├─ Utilities
│  ├─ Water & Sewer
│  ├─ Electricity
│  ├─ Gas
│  ├─ Internet
│  └─ Trash
├─ Property Expenses
│  ├─ HOA Fees
│  ├─ Property Tax
│  └─ Insurance
└─ Maintenance
   ├─ Lawn Care
   ├─ Pest Control
   ├─ Repairs
   └─ Cleaning
```

---

## 🚀 Implementation Guide

### 1. QuickBooks Online Integration

**Step 1: Create QuickBooks App**
```bash
1. Go to developer.intuit.com
2. Create app → QuickBooks Online API
3. Get Client ID and Client Secret
4. Add redirect URI: https://yourapp.com/integrations/quickbooks/callback
```

**Step 2: OAuth Flow**
```typescript
// src/services/accounting/quickbooksService.ts
import { OAuth2Client } from '@intuit/oauth2-nodejs'

const oauthClient = new OAuth2Client({
  clientId: process.env.QUICKBOOKS_CLIENT_ID,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
  redirectUri: 'https://yourapp.com/integrations/quickbooks/callback'
})

// Get authorization URL
const authUri = oauthClient.authorizeUri({
  scope: [OAuthClient.scopes.Accounting],
  state: generateRandomString()
})

// Handle callback
const tokens = await oauthClient.createToken(authorizationCode)
```

**Step 3: Sync Payment**
```typescript
async function syncPayment(payment: Payment) {
  const qbo = new QuickBooks({
    consumerKey: CLIENT_ID,
    consumerSecret: CLIENT_SECRET,
    token: integration.accessToken,
    tokenSecret: integration.refreshToken,
    realmId: integration.realmId
  })

  // Create Invoice Payment
  await qbo.createPayment({
    CustomerRef: { value: tenant.externalId },
    TotalAmt: payment.amount,
    Line: [{
      Amount: payment.amount,
      LinkedTxn: [{
        TxnId: invoice.externalId,
        TxnType: 'Invoice'
      }]
    }]
  })
}
```

### 2. Xero Integration

```typescript
// src/services/accounting/xeroService.ts
import { XeroClient } from 'xero-node'

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: ['https://yourapp.com/integrations/xero/callback'],
  scopes: ['accounting.transactions', 'accounting.contacts.read']
})

// Sync payment to Xero
await xero.accountingApi.createPayment(tenantId, {
  invoice: { invoiceID: invoiceId },
  account: { code: '200' }, // Bank account
  date: new Date().toISOString().split('T')[0],
  amount: payment.amount
})
```

### 3. Wave Integration

```typescript
// src/services/accounting/waveService.ts
const WAVE_API = 'https://gql.waveapps.com/graphql/public'

// Create income transaction
const mutation = `
  mutation CreateIncome($input: MoneyTransactionCreateInput!) {
    moneyTransactionCreate(input: $input) {
      transaction {
        id
        total
      }
    }
  }
`

await fetch(WAVE_API, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${integration.accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: mutation,
    variables: {
      input: {
        businessId: integration.businessId,
        externalId: payment.id,
        date: payment.paymentDate,
        description: `Rent payment - ${property.address}`,
        total: payment.amount,
        currency: 'USD'
      }
    }
  })
})
```

---

## 🎨 User Interface

### Integrations Settings Page:

```
┌────────────────────────────────────────────┐
│ Accounting Integrations                   │
├────────────────────────────────────────────┤
│                                            │
│ [QuickBooks Online]        [✓ Connected]  │
│  Last sync: 2 minutes ago                  │
│  Next sync: In 58 minutes (Hourly)        │
│  [Settings] [Disconnect]                   │
│                                            │
│ [Xero]                     [ Connect ]     │
│  Sync your transactions to Xero            │
│  [Connect to Xero]                         │
│                                            │
│ [Wave]                     [ Connect ]     │
│  Free accounting software                  │
│  [Connect to Wave]                         │
│                                            │
│ [Manual Export]            [ Download ]    │
│  Export to CSV/Excel                       │
│  [Download Transactions]                   │
│                                            │
└────────────────────────────────────────────┘
```

### QuickBooks Settings Modal:

```
┌────────────────────────────────────────────┐
│ QuickBooks Online Settings                │
├────────────────────────────────────────────┤
│                                            │
│ Status: ✓ Connected                        │
│ Company: Acme Real Estate LLC             │
│ Last Sync: 2 minutes ago                   │
│                                            │
│ Sync Frequency:                            │
│  ○ Real-time (instant sync)               │
│  ● Hourly                                  │
│  ○ Daily (midnight)                        │
│  ○ Weekly (Sundays)                        │
│  ○ Manual only                             │
│                                            │
│ What to Sync:                              │
│  ☑ Income (rent payments)                  │
│  ☑ Expenses (bills, maintenance)           │
│  ☑ Invoices (tenant invoices)              │
│  ☑ Bills (vendor bills)                    │
│                                            │
│ Category Mapping:                          │
│  Rent Income → Rental Income              │
│  Late Fees → Other Income:Late Fees       │
│  Water Bill → Utilities:Water             │
│  [Edit Mappings]                           │
│                                            │
│ [Sync Now] [Save Settings] [Disconnect]   │
└────────────────────────────────────────────┘
```

### Sync Status Dashboard:

```
┌────────────────────────────────────────────┐
│ Recent Syncs                               │
├────────────────────────────────────────────┤
│ ✓ Income Sync - 2 min ago                  │
│   5 transactions synced successfully       │
│                                            │
│ ✓ Expense Sync - 1 hour ago                │
│   12 transactions synced successfully      │
│                                            │
│ ⚠ Bill Sync - 3 hours ago                  │
│   8 succeeded, 2 failed                    │
│   [View Errors]                            │
│                                            │
│ ✓ Full Sync - Yesterday 11:45 PM           │
│   156 transactions synced successfully     │
│                                            │
└────────────────────────────────────────────┘
```

---

## 💡 Best Practices

### 1. **Batch Syncing vs Real-Time**
- **Real-time**: Best for small landlords (< 10 properties)
- **Hourly/Daily**: Better for large portfolios (API rate limits)
- **Manual**: Tax preparation only

### 2. **Error Handling**
```typescript
async function syncWithRetry(transaction, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await syncToQuickBooks(transaction)
      return { success: true }
    } catch (error) {
      if (i === maxRetries - 1) {
        // Log error for manual review
        await logSyncError(transaction, error)
        // Notify landlord
        await notifyLandlord({
          type: 'SYNC_FAILED',
          transaction,
          error: error.message
        })
      }
      await wait(2 ** i * 1000) // Exponential backoff
    }
  }
}
```

### 3. **Token Refresh**
```typescript
// Check token expiry before each API call
async function ensureValidToken(integration) {
  if (integration.tokenExpiry < new Date()) {
    const newTokens = await refreshOAuthToken(integration.refreshToken)
    await updateIntegration(integration.id, {
      accessToken: encrypt(newTokens.access_token),
      tokenExpiry: new Date(Date.now() + newTokens.expires_in * 1000)
    })
  }
}
```

### 4. **Duplicate Prevention**
```typescript
// Check if transaction already synced
const existing = await findByExternalId(transaction.id)
if (existing) {
  console.log('Transaction already synced, skipping')
  return
}
```

---

## 📊 Reporting & Analytics

### Auto-Generated Reports (from accounting software):

1. **Profit & Loss by Property**
   - Income by property
   - Expenses by property
   - Net operating income (NOI)

2. **Cash Flow Statement**
   - Cash in (rent, fees)
   - Cash out (expenses, bills)
   - Net cash flow

3. **Tax Summary**
   - Schedule E (rental income/expenses)
   - Deductible expenses
   - Depreciation tracking

4. **Tenant Income Report**
   - Rent collected by tenant
   - Late fees by tenant
   - Payment history

---

## 🔧 Technical Requirements

### Environment Variables:
```env
# QuickBooks Online
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=https://yourapp.com/integrations/quickbooks/callback

# Xero
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret

# Wave
WAVE_API_TOKEN=your_api_token
WAVE_BUSINESS_ID=your_business_id

# FreshBooks
FRESHBOOKS_CLIENT_ID=your_client_id
FRESHBOOKS_CLIENT_SECRET=your_client_secret

# Encryption key for tokens
ACCOUNTING_ENCRYPTION_KEY=your_32_char_key
```

### NPM Packages:
```json
{
  "dependencies": {
    "@intuit/oauth2-nodejs": "^3.0.0",
    "xero-node": "^4.34.0",
    "node-quickbooks": "^2.0.36",
    "crypto": "^1.0.1"
  }
}
```

---

## 🎯 Summary

**What Gets Synced**:
- ✅ Every rent payment → Income transaction
- ✅ Every utility bill → Expense transaction
- ✅ Every maintenance cost → Expense transaction
- ✅ Every late fee → Income transaction
- ✅ Security deposits → Liability transaction

**Benefits**:
- ✅ Eliminate manual data entry
- ✅ Real-time financial tracking
- ✅ Automatic tax categorization
- ✅ Professional financial reports
- ✅ Easy tax preparation (Schedule E ready)
- ✅ Bank reconciliation
- ✅ Audit trail

**Supported Platforms**: 10
**Database Models**: 3 new models
**New Enums**: 6
**Total Features**: Complete accounting automation! 🎉
