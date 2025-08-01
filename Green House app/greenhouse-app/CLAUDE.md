# Greenhouse Management System - Claude Development Guide

## Project Overview
A comprehensive AI-powered greenhouse management system that integrates crop planning, interactive layout design, video monitoring, and automated alerts for optimal plant growth and harvest timing.

## System Architecture

### Backend Structure
```
backend/src/
├── modules/
│   ├── greenhouse-planning/          # Interactive layout and crop planning
│   │   ├── greenhouse-planning.types.ts
│   │   ├── greenhouse-data.ts
│   │   ├── bed-layout.service.ts
│   │   ├── ai-integration.service.ts
│   │   ├── greenhouse-planning.service.ts
│   │   ├── greenhouse-planning.controller.ts
│   │   └── greenhouse-planning.routes.ts
│   ├── climate-battery/              # Climate battery calculator
│   │   ├── climate-battery.types.ts
│   │   ├── climate-battery.service.ts
│   │   ├── climate-battery.controller.ts
│   │   └── climate-battery.routes.ts
│   ├── crop-calendar/               # Planting calendar and scheduling
│   │   ├── crop-calendar.types.ts
│   │   ├── crop-data.ts
│   │   └── crop-calendar.service.ts
│   └── monitoring/                  # AI video monitoring system
│       ├── monitoring.types.ts
│       ├── vision-ai.service.ts
│       └── monitoring.service.ts
```

### Frontend Interfaces
```
greenhouse-app/
├── interactive-greenhouse-designer.html  # Main layout designer
├── greenhouse-calendar-monitoring.html   # Calendar & AI monitoring
├── greenhouse-planner-multiple-crops.html # Multi-crop planner
└── climate-battery-test.html             # Climate battery calculator
```

## Key Features

### 1. Interactive Greenhouse Layout Designer
- **Clickable 4x8 grow beds** with proper walkway spacing (3 feet)
- **Individual bed configuration** for crops and growing systems
- **Three growing systems**: Traditional, Hydroponics, Aquaponics
- **Real-time materials calculation** for mixed bed types
- **Visual color coding** by system type

### 2. Crop Planning & Calendar System
- **Multiple crop selection** with companion planting suggestions
- **AI-powered compatibility analysis** using OpenAI API
- **Automated task generation** based on growth stages
- **Climate zone integration** for optimal planting windows
- **Harvest timing predictions** with visual indicators

### 3. AI Video Monitoring
- **Real-time camera feeds** for each grow bed
- **OpenAI GPT-4 Vision integration** for image analysis
- **Automated pest detection** (aphids, whiteflies, spider mites)
- **Disease identification** (fungal, bacterial, viral)
- **Harvest readiness assessment** with confidence scoring
- **Growth progress tracking** (height, leaf count, fruit development)

### 4. Smart Notification System
- **Multi-severity alerts** (info, warning, critical)
- **Multi-channel delivery** (in-app, email, SMS, push)
- **Actionable recommendations** for each detected issue
- **Time-lapse anomaly detection** with growth rate analysis

### 5. Climate Battery Integration
- **Geothermal system calculator** for greenhouse heating/cooling
- **Complete parts list generation** with exact quantities
- **Cost estimation** and ROI calculations
- **Integration with greenhouse dimensions** for optimal sizing

## API Endpoints

### Greenhouse Planning
```
POST /api/greenhouse-planning/create-plan
POST /api/greenhouse-planning/multiple-crop-plan
POST /api/greenhouse-planning/recommend-grow-beds
POST /api/greenhouse-planning/calculate-materials
POST /api/greenhouse-planning/export
GET  /api/greenhouse-planning/greenhouse-types
```

### Climate Battery
```
POST /api/climate-battery/calculate
POST /api/climate-battery/parts-list
POST /api/climate-battery/export
```

### Crop Calendar
```
POST /api/crop-calendar/create-schedule
GET  /api/crop-calendar/planting-windows/{crop}
GET  /api/crop-calendar/monthly-schedule/{year}/{month}
POST /api/crop-calendar/add-crop
```

### Monitoring
```
POST /api/monitoring/add-camera
POST /api/monitoring/start-monitoring
POST /api/monitoring/capture-analyze
GET  /api/monitoring/timelapse/{bedId}/{cropId}
POST /api/monitoring/generate-video
```

## Environment Variables
```env
# OpenAI Integration
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/greenhouse_db

# Monitoring
CAMERA_CAPTURE_INTERVAL=60  # minutes
ALERT_EMAIL_ENABLED=true
ALERT_SMS_ENABLED=true

# Socket.IO
SOCKET_IO_CORS_ORIGIN=http://localhost:3000
```

## Development Commands

### Backend
```bash
cd greenhouse-app/backend
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
npm run typecheck    # TypeScript checking
```

### Database Setup
```bash
# Run migrations
npm run migrate

# Seed with crop data
npm run seed
```

## AI Integration Details

### OpenAI Vision API Usage
The system uses GPT-4 Vision for:
- **Crop health assessment** - leaf color, growth rate, stress indicators
- **Pest identification** - with confidence scoring and treatment recommendations
- **Disease detection** - pathogen identification and severity assessment
- **Harvest readiness** - size, color, texture analysis
- **Growth tracking** - height measurement, leaf/fruit counting

### Companion Planting AI
Uses ChatGPT for:
- **Compatibility analysis** between selected crops
- **Companion plant suggestions** based on benefits
- **Growing condition optimization** for mixed plantings
- **Bed layout recommendations** for companion crops

## Data Models

### Greenhouse Plan
```typescript
interface GreenhousePlan {
  type: GreenhouseType;           // hoop_house, geodesic_dome, etc.
  dimensions: GreenhouseDimensions;
  location: LocationData;
  growBeds: GrowBedConfig[];      // Individual bed configurations
  crops: CropSelection;           // Multiple crops with companions
  features: AdditionalFeatures;   // Climate battery, automation, etc.
}
```

### Grow Bed Configuration
```typescript
interface GrowBedConfig {
  type: GrowBedType;             // fill_and_drain, standing_soil, wicking
  count: number;
  dimensions: BedDimensions;      // Standard 4x8 feet
  cropAssignment?: string;        // Which crop this bed grows
  layout?: BedLayout;            // Position in greenhouse
}
```

### AI Analysis Results
```typescript
interface ImageAnalysis {
  cropHealth: CropHealthAnalysis;     // 0-100 health score
  pestDetection: PestDetection[];     // Identified pests
  diseaseDetection: DiseaseDetection[]; // Disease identification
  harvestReadiness: HarvestReadiness;  // Ripeness assessment
  growthProgress: GrowthProgress;      // Development tracking
  alerts: Alert[];                     // Generated alerts
}
```

## Testing Strategy

### Unit Tests
- Service layer functions
- AI integration mocks
- Calendar calculations
- Layout algorithms

### Integration Tests
- API endpoint responses
- Database operations
- Socket.IO real-time updates
- OpenAI API integration

### E2E Tests
- Complete greenhouse planning workflow
- Monitoring alert generation
- Calendar scheduling
- Export functionality

## Deployment Notes

### Production Requirements
- **Node.js 18+** for backend
- **PostgreSQL 14+** for database
- **Redis** for caching and sessions
- **Socket.IO** server configuration
- **File storage** for images and time-lapse videos
- **Email/SMS service** for notifications

### Camera Integration
For production deployment with real cameras:
- **RTSP stream support** for IP cameras
- **USB camera integration** for local cameras
- **Image capture scheduling** with cron jobs
- **Storage management** for captured images
- **Video encoding** for time-lapse generation

### Security Considerations
- **API key protection** for OpenAI integration
- **Camera stream encryption** for privacy
- **User authentication** for multi-user access
- **Rate limiting** for AI API calls
- **Input validation** for all user data

## Performance Optimization

### AI API Usage
- **Image compression** before sending to OpenAI
- **Batch processing** for multiple bed analysis
- **Caching** of analysis results
- **Fallback responses** when API is unavailable

### Real-time Updates
- **Socket.IO optimization** for large numbers of connections
- **Event throttling** to prevent spam
- **Selective updates** based on user subscriptions

## Future Enhancements

### Planned Features
1. **Mobile app** with push notifications
2. **Weather integration** for outdoor conditions
3. **Yield tracking** and harvest logging
4. **Machine learning models** for local analysis
5. **IoT sensor integration** (temperature, humidity, pH)
6. **Automated irrigation** based on plant needs
7. **Marketplace integration** for seed/supply ordering
8. **Community sharing** of growing plans and results

### Technical Improvements
1. **Edge computing** for faster image analysis
2. **Progressive Web App** features
3. **Offline functionality** for critical features
4. **Advanced time-lapse** with zoom and pan
5. **3D greenhouse visualization**
6. **AR overlay** for mobile plant identification

## Support & Maintenance

### Monitoring
- **Application performance** monitoring
- **API usage tracking** and cost management
- **Error logging** and alerting
- **User activity** analytics

### Backup Strategy
- **Database backups** with point-in-time recovery
- **Image storage** redundancy
- **Configuration backup** for system settings
- **Disaster recovery** procedures

This system provides a complete solution for modern greenhouse management with AI-powered automation and intelligent crop planning.