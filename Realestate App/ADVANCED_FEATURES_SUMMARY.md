# Advanced Features - Lease Management & Property Inspections

## 🎯 Overview

This document covers the advanced automation features for:
1. **Automated Rent Reminders & Auto-Pay**
2. **Lease Expiration & Renewal Workflow**
3. **Property Inspections with AI Damage Assessment**
4. **LiDAR Floor Plan Integration (iOS)**

---

## 1️⃣ Automated Rent Reminders & Calendar Invites

### Database Schema

**Lease Model** - New Fields:
```prisma
// Reminder settings
rentReminderDays  Int     @default(3)  // Days before due date
reminderEnabled   Boolean @default(true)

// Auto-pay settings
autoPayEnabled    Boolean @default(false)
autoPayMethod     PaymentMethod?
autoPayDay        Int?    // Day of month (1-31)
```

**Notification Model** - Complete Notification System:
```prisma
model Notification {
  type              NotificationType    // RENT_DUE_REMINDER, RENT_OVERDUE, etc.
  title             String
  message           String
  recipientType     RecipientType       // LANDLORD or TENANT
  status            NotificationStatus  // PENDING, SENT, DELIVERED, READ

  // Calendar invite
  calendarInvite    Boolean
  eventDate         DateTime?
  eventTitle        String?
}
```

### Features:

#### **Rent Reminders**
- **Configurable Days**: Default 3 days before due date, customizable per lease
- **Multiple Channels**:
  - Email
  - SMS (via Twilio)
  - Push notifications (mobile app)
  - In-app notifications

#### **Calendar Invites**
- **Automatic .ics Generation**:
  - Sent with rent reminder emails
  - One-click add to Google Calendar/Outlook/Apple Calendar
  - Recurring event for monthly rent

**Example**:
```
Event: Monthly Rent Due
Date: December 1, 2025
Time: 9:00 AM
Recurring: Monthly on the 1st
Amount: $1,800
```

#### **Auto-Pay Enrollment**
Tenants can enable auto-pay with:
- **Payment Method**: Bank Transfer (ACH), Credit/Debit Card, Venmo, Zelle
- **Auto-Pay Day**: Choose day of month (e.g., 1st or 5th)
- **Confirmation**: Email confirmation before each charge
- **Failure Handling**: Automatic notification if payment fails + retry logic

**Workflow**:
1. Tenant enrolls in auto-pay via tenant portal
2. 3 days before due date: Email reminder "Auto-pay scheduled for Dec 1"
3. On due date: Automatic charge processed
4. Immediate notification to both landlord and tenant
5. Payment auto-recorded in system

---

## 2️⃣ Lease Expiration & Renewal Workflow

### Database Schema

**Lease Model** - Renewal Fields:
```prisma
// Renewal tracking
renewalOffered      Boolean @default(false)
renewalOfferDate    DateTime?
renewalTermMonths   Int?        // 12, 24, or 36
renewalRent         Float?
renewalResponse     RenewalResponse?
renewalResponseDate DateTime?

enum RenewalResponse {
  PENDING
  ACCEPTED
  DECLINED
  COUNTER_OFFER
}
```

### Renewal Workflow:

#### **Step 1: Automatic Expiration Detection**
- **90 Days Before Lease Ends**: System sends notification to landlord
- **Notification**: "Lease for 123 Oak St expires on March 15, 2026. Would you like to offer renewal?"

#### **Step 2: Landlord Offers Renewal**
Landlord receives form with options:
- **Renewal Term**: Dropdown (12 months, 24 months, 36 months)
- **New Rent Amount**: Input field (pre-filled with current rent)
- **Rent Increase**: Auto-calculates percentage (e.g., "+5% increase")
- **Custom Terms**: Text field for special conditions
- **Offer Expiration**: How long tenant has to respond (default: 30 days)

**Example Offer**:
```
Lease Renewal Offer
Property: 123 Oak St, Austin, TX
Current Lease Ends: March 15, 2026
Proposed Term: 12 months
New Monthly Rent: $1,800 (no change)
Offer Valid Until: December 15, 2025
```

#### **Step 3: Tenant Receives Offer**
Tenant gets notification via:
- Email
- SMS
- In-app notification

**Email Content**:
```
Subject: Lease Renewal Offer for 123 Oak St

Hi John,

Your landlord has offered to renew your lease!

Current Lease Ends: March 15, 2026
Proposed New Term: 12 months (through March 15, 2027)
New Monthly Rent: $1,800/month (no change from current rent)

You have until December 15, 2025 to respond.

[Accept Renewal] [Decline] [Counter Offer]
```

#### **Step 4: Tenant Response Options**

**Option A: Accept**
- Tenant clicks "Accept Renewal"
- New lease auto-generates
- Both parties receive confirmation
- Calendar invites updated with new end date

**Option B: Decline**
- Tenant clicks "Decline"
- Landlord notified immediately
- Move-out inspection scheduled
- 60-day notice period begins

**Option C: Counter Offer**
- Tenant proposes:
  - Different term length (e.g., 24 months instead of 12)
  - Different rent (e.g., $1,750 instead of $1,800)
  - Special requests (e.g., "Can we add a pet?")
- Landlord receives counter offer notification
- Landlord can accept, decline, or re-counter

---

## 3️⃣ Property Inspections with Before/After Photos

### Database Schema

**PropertyInspection Model**:
```prisma
model PropertyInspection {
  inspectionType    InspectionType    // MOVE_IN, MOVE_OUT, ROUTINE
  inspectionDate    DateTime

  // LiDAR floor plan
  floorPlanUrl      String?           // 3D model file
  floorPlanData     Json?             // LiDAR scan data

  // Condition
  overallCondition  String?           // Excellent, Good, Fair, Poor
  totalDamageAmount Float
  wearAndTearAmount Float

  // Security deposit
  depositHeld       Float?
  depositReturned   Float?
  deductionsAmount  Float?

  photos            InspectionPhoto[]
  damageAssessments DamageAssessment[]
}
```

**InspectionPhoto Model**:
```prisma
model InspectionPhoto {
  photoUrl          String

  // Location on floor plan
  roomName          String?           // "Living Room", "Bedroom 1"
  floorPlanX        Float?            // X coordinate
  floorPlanY        Float?            // Y coordinate
  floorLevel        Int               // Floor number

  // AI Analysis
  aiAnalyzed        Boolean
  aiDetectedIssues  Json?
  aiConfidence      Float?
}
```

### Move-In Inspection Workflow:

#### **Step 1: Create Inspection**
When new tenant moves in:
1. Landlord creates "Move-In Inspection"
2. Inspection type: `MOVE_IN`
3. Inspector: Landlord or property manager
4. Date: Move-in date

#### **Step 2: LiDAR Floor Plan Scan (iOS Only)**
**Using iPhone LiDAR**:
```typescript
// iOS RoomPlan API
import { RoomPlanScanner } from '@react-native-community/room-plan'

// Start scanning
<RoomPlanScanner
  onScanComplete={(roomData) => {
    // roomData contains:
    // - 3D mesh of entire property
    // - Room boundaries
    // - Wall heights
    // - Furniture positions
    // - Floor plan 2D layout
  }}
/>
```

**Features**:
- Scan entire property in minutes
- Auto-detects rooms (bedroom, bathroom, kitchen, etc.)
- Generates 2D floor plan automatically
- Stores 3D model for future reference

#### **Step 3: Photo Upload with Floor Plan Tagging**
After scanning floor plan:

**Upload Photos**:
1. Take photo in "Living Room"
2. App shows floor plan
3. Tap location on floor plan where photo was taken
4. Photo gets geo-tagged with coordinates
5. Repeat for every room

**Result**:
- Interactive floor plan with photo pins
- Click any pin to see photo from that exact spot
- Perfect for before/after comparison

**Example**:
```
Living Room:
  - Photo 1: NW corner (showing wall) - X: 2.5, Y: 8.3
  - Photo 2: SE corner (showing window) - X: 8.1, Y: 2.2
  - Photo 3: Center (overall view) - X: 5.0, Y: 5.0
```

### Move-Out Inspection Workflow:

#### **Step 1: Create Move-Out Inspection**
When tenant moves out:
1. Landlord creates "Move-Out Inspection"
2. System automatically links to original move-in inspection
3. Floor plan auto-loaded from move-in scan

#### **Step 2: Take Photos at Same Locations**
**Smart Photo Guidance**:
- App shows move-in floor plan
- Highlights each photo location from move-in
- "Take photo at this location" guidance
- Shows move-in photo for reference

**Workflow**:
1. App: "Go to Living Room, NW corner"
2. Shows move-in photo as reference
3. Landlord takes new photo from same spot
4. AI automatically compares photos

#### **Step 3: AI Damage Detection**
**Automatic Analysis**:
```typescript
// OpenAI Vision API
await analyzePropertyDamage({
  beforePhoto: moveInPhoto,
  afterPhoto: moveOutPhoto,
  roomType: 'living_room',
  surface: 'wall'
})

// Returns:
{
  damagesDetected: [
    {
      type: 'WALL_DAMAGE',
      severity: 'MODERATE',
      description: 'Hole in drywall approximately 2 inches diameter',
      location: 'NW corner, 4 feet from floor',
      isWearAndTear: false,
      estimatedCost: 125.00,
      confidence: 0.94
    },
    {
      type: 'PAINT_DAMAGE',
      severity: 'MINOR',
      description: 'Paint scuff marks on baseboards',
      isWearAndTear: true,  // AI classifies as normal wear
      estimatedCost: 0.00,
      confidence: 0.89
    }
  ]
}
```

**AI Classification Logic**:
- **Wear and Tear** (Normal aging):
  - Paint fading/discoloration
  - Minor scuff marks
  - Carpet matting in traffic areas
  - Normal appliance aging
  - **No charge to tenant**

- **Damage** (Tenant responsibility):
  - Holes in walls
  - Carpet stains/burns
  - Broken fixtures
  - Pet damage
  - Excessive dirt/cleaning needed
  - **Deducted from security deposit**

#### **Step 4: Damage Assessment Report**
System generates report:

```
Move-Out Inspection Report
Property: 123 Oak St, Austin, TX
Tenant: John Smith
Move-In Date: January 1, 2025
Move-Out Date: December 31, 2025

DAMAGE SUMMARY:
─────────────────────────────────────
Living Room:
  ✓ Normal wear and tear: Paint scuffs on baseboards ($0)
  ✗ DAMAGE: Hole in drywall - NW corner ($125)

Bedroom 1:
  ✗ DAMAGE: Carpet stain - red wine stain (3ft diameter) ($200)

Kitchen:
  ✓ Normal wear: Appliance aging ($0)
  ✗ DAMAGE: Broken cabinet door hinge ($45)

TOTALS:
─────────────────────────────────────
Security Deposit Held:    $1,800.00
Normal Wear & Tear:            $0.00
Actual Damage:              $370.00
Deposit Returned:         $1,430.00

Itemized Deductions:
  - Drywall repair (Living Room)     $125.00
  - Carpet cleaning/repair (Bedroom) $200.00
  - Cabinet hinge replacement         $45.00
                            ──────────────
  TOTAL DEDUCTIONS:                  $370.00
```

#### **Step 5: Tenant Notification**
Tenant receives:
- Full inspection report
- Before/after photos for each damage
- AI assessment reasoning
- Itemized deduction breakdown
- Option to dispute charges

---

## 4️⃣ LiDAR Floor Plan Features (iOS)

### Requirements:
- iPhone 12 Pro or later (has LiDAR sensor)
- iPad Pro 2020 or later (has LiDAR sensor)
- React Native app with RoomPlan API

### Features:

#### **3D Room Scanning**
```typescript
// Scan entire property
const floorPlan = await scanProperty()

// Result:
{
  rooms: [
    {
      name: 'Living Room',
      dimensions: { width: 15.5, length: 18.2, height: 9.0 },
      squareFeet: 282,
      windows: 2,
      doors: 2
    },
    {
      name: 'Bedroom 1',
      dimensions: { width: 12.0, length: 14.0, height: 9.0 },
      squareFeet: 168,
      windows: 1,
      doors: 1
    }
  ],
  totalSquareFeet: 1450,
  floorPlan2D: '...SVG or PNG data...',
  model3D: '...USDZ file URL...'
}
```

#### **Photo Geotagging on Floor Plan**
- Drag-and-drop photos onto floor plan
- Or auto-tag using room detection
- Visual pins show photo locations
- Click pin to view photo + metadata

#### **Before/After Comparison**
- Split-screen view
- Side-by-side photos from same location
- Overlay mode with opacity slider
- Difference highlighting (AI-powered)

#### **Benefits**:
1. **Accuracy**: Exact photo locations ensure fair comparisons
2. **Documentation**: 3D model proves property condition
3. **Dispute Resolution**: Visual evidence with precise coordinates
4. **Time Savings**: AI auto-detects damage vs wear
5. **Fair Assessment**: Objective criteria for deposit deductions

---

## 🔄 Complete User Flows

### Flow 1: Rent Reminder with Auto-Pay

```mermaid
Day -3: System checks upcoming rent bills
      ↓
      Email + SMS + Push: "Rent due in 3 days"
      ↓
      Calendar invite attached (.ics file)
      ↓
Day 0:  Auto-pay processes payment
      ↓
      Confirmation: "Payment successful - $1,800"
      ↓
      Both landlord & tenant notified
      ↓
      Payment auto-recorded in system
```

### Flow 2: Lease Renewal

```mermaid
Day -90: "Lease expiring soon" → Landlord
       ↓
Landlord: Offer renewal (12/24/36 months, new rent)
       ↓
Tenant: Receives email + in-app notification
       ↓
Tenant: [Accept] [Decline] [Counter Offer]
       ↓
If Accept: New lease auto-generates
If Decline: Move-out inspection scheduled
If Counter: Landlord receives counter offer
```

### Flow 3: Move-Out Inspection with AI

```mermaid
Tenant gives notice
    ↓
System: Schedule move-out inspection
    ↓
Landlord: Open app, load floor plan from move-in
    ↓
App guides: "Take photo at Living Room NW corner"
    ↓
Shows move-in photo for reference
    ↓
Landlord takes photo
    ↓
AI compares before/after
    ↓
AI classifies: Damage vs Wear & Tear
    ↓
AI estimates repair cost
    ↓
Report generated with itemized deductions
    ↓
Tenant receives report + can dispute
    ↓
Security deposit processed
```

---

## 💰 Costs & Integration

### Third-Party Services:

**Notifications**:
- **Email**: SendGrid (~$15/mo for 40K emails)
- **SMS**: Twilio (~$0.0079/SMS)
- **Push**: Firebase Cloud Messaging (FREE)

**Calendar Invites**:
- **ics Generation**: node-icalendar (FREE library)
- No API costs - just file generation

**Payment Processing**:
- **Stripe**: 2.9% + $0.30 per card, 0.8% per ACH
- **Auto-pay**: No additional fees

**AI Vision for Damage Detection**:
- **OpenAI Vision API**: ~$0.01 per image analysis
- **Per inspection**: ~$2-5 (20-50 photos)

**LiDAR Scanning**:
- **iOS RoomPlan API**: FREE (built into iOS)
- **Storage**: AWS S3 for 3D models (~$0.023/GB)

---

## 🎯 Next Implementation Steps

1. **Notification Service** - Build email/SMS system
2. **Calendar Invite Generator** - Create .ics files
3. **Lease Renewal UI** - Landlord offer page + tenant response page
4. **Property Inspection UI** - Photo upload with floor plan tagging
5. **AI Damage Assessment** - OpenAI Vision integration
6. **LiDAR Integration** - iOS native module for RoomPlan
7. **Security Deposit Calculator** - Auto-calculate based on damage

**Priority Order** (Based on impact):
1. Rent reminders + auto-pay (highest tenant value)
2. Lease renewal workflow (reduces landlord admin)
3. Property inspection system (protects both parties)
4. LiDAR floor plans (premium feature, iOS only)

---

## 📊 Database Summary

**New Models**: 4
- `PropertyInspection` - Tracks move-in/move-out inspections
- `InspectionPhoto` - Photos with floor plan coordinates
- `DamageAssessment` - AI-powered damage classification
- `Notification` - Email/SMS/push notifications

**Updated Models**: 2
- `Lease` - Added auto-pay, reminders, renewal fields
- `Bill` - Added notification relation

**Total New Fields**: 25+
**New Enums**: 7 (InspectionType, DamageType, DamageSeverity, NotificationType, RecipientType, NotificationStatus, RenewalResponse)

All features are now in the database schema and ready for UI implementation! 🚀
