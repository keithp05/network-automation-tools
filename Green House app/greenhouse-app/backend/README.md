# Greenhouse Management System - Backend

A comprehensive AI-powered greenhouse management system backend that provides APIs for crop planning, growth tracking, video monitoring, and automated alerts.

## Features

- **User Authentication** - JWT-based authentication with role-based access control
- **Growth Tracking** - Record and analyze plant measurements with AI insights
- **Video Monitoring** - AI-powered image analysis for pest detection and harvest readiness
- **Interactive Planning** - Design greenhouse layouts with optimal bed placement
- **Climate Battery Calculator** - Geothermal system design and parts list generation
- **Smart Alerts** - Automated notifications based on plant conditions
- **Real-time Updates** - WebSocket support for live monitoring

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key (for AI features)

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run typecheck` - Check TypeScript types

## API Endpoints

### Authentication
```
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
GET  /api/auth/profile      # Get user profile
PUT  /api/auth/profile      # Update user profile
```

### Growth Tracking
```
POST /api/growth-tracking/measurements        # Record measurement
POST /api/growth-tracking/measurements/bulk   # Bulk record measurements
GET  /api/growth-tracking/timeline/:bedId/:cropId  # Get growth timeline
GET  /api/growth-tracking/milestones/:bedId/:cropId  # Get milestones
```

### Alert Management
```
GET  /api/growth-tracking/alerts             # Get alerts with filters
GET  /api/growth-tracking/alerts/summary     # Get alert summary
POST /api/growth-tracking/alerts/bulk-action # Perform bulk actions
POST /api/growth-tracking/alerts/clear-all   # Clear all alerts
```

### Monitoring
```
POST /api/monitoring/cameras                # Add camera
GET  /api/monitoring/cameras               # List cameras
POST /api/monitoring/capture/:cameraId     # Capture and analyze image
GET  /api/monitoring/live/:bedId           # Get live monitoring data
```

### Greenhouse Planning
```
POST /api/greenhouse-planning/create-plan         # Create greenhouse plan
POST /api/greenhouse-planning/multiple-crop-plan  # Multi-crop planning
POST /api/greenhouse-planning/calculate-materials # Calculate materials
```

### Climate Battery
```
POST /api/climate-battery/calculate    # Calculate climate battery
POST /api/climate-battery/parts-list   # Generate parts list
```

## Web Interfaces

The backend serves static HTML interfaces:

- `/` or `/login` - Authentication interface
- `/dashboard` - Interactive greenhouse designer
- `/planner` - Multi-crop planner
- `/calendar` - Calendar and monitoring interface
- `/climate-battery` - Climate battery calculator

## Authentication

All API endpoints (except auth routes) require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **USER** - Basic greenhouse management
- **MANAGER** - Advanced features and multi-greenhouse access
- **ADMIN** - Full system administration

## Growth Tracking Features

### Recording Measurements
```javascript
POST /api/growth-tracking/measurements
{
  "bedId": "bed_001",
  "cropId": "tomato_variety_1",
  "measurements": {
    "height": { "value": 24.5, "unit": "inches" },
    "leafCount": { "total": 18, "mature": 15, "new": 3 },
    "healthScore": 85,
    "overallCondition": "good"
  },
  "notes": "Plant showing excellent growth"
}
```

### Bulk Measurements
```javascript
POST /api/growth-tracking/measurements/bulk
{
  "bedIds": ["bed_001", "bed_002", "bed_003"],
  "measurements": {
    "healthScore": 80,
    "overallCondition": "good"
  },
  "notes": "Weekly health check"
}
```

## Alert System

### Alert Types
- `growth_milestone` - Growth milestones achieved
- `growth_concern` - Health issues detected
- `harvest_ready` - Plants ready for harvest
- `pest_detected` - Pest detection from AI analysis
- `disease_detected` - Disease identification
- `watering_needed` - Watering schedule alerts

### Bulk Alert Actions
```javascript
POST /api/growth-tracking/alerts/bulk-action
{
  "alertIds": ["alert_1", "alert_2", "alert_3"],
  "action": "mark_read" // or "archive", "delete", "mark_action_taken"
}
```

### Clear All Alerts
```javascript
POST /api/growth-tracking/alerts/clear-all
```

## AI Integration

### OpenAI Vision API
The system uses GPT-4 Vision for:
- Plant health assessment
- Pest and disease detection
- Harvest readiness evaluation
- Growth progress tracking

### Required Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Database Schema

The system uses PostgreSQL with the following main tables:
- `users` - User accounts and profiles
- `greenhouses` - Greenhouse configurations
- `grow_beds` - Individual growing beds
- `crops` - Crop information and assignments
- `growth_measurements` - Plant measurement data
- `alerts` - System alerts and notifications
- `sessions` - User authentication sessions

## Security Features

- **JWT Authentication** with refresh tokens
- **Rate limiting** on sensitive endpoints
- **Input sanitization** and validation
- **CORS protection** with configurable origins
- **Helmet.js** security headers
- **Password hashing** with bcrypt
- **Role-based access control**

## Monitoring and Logging

- **Winston** logging with configurable levels
- **Health check** endpoint at `/health`
- **Error handling** middleware
- **Request logging** for debugging

## WebSocket Support

Real-time features using Socket.IO:
- Live monitoring data updates
- Real-time alert notifications
- Growth measurement broadcasts
- Camera feed status updates

## Development

### Project Structure
```
src/
├── modules/
│   ├── auth/              # Authentication system
│   ├── growth-tracking/   # Growth measurement and analysis
│   ├── greenhouse-planning/ # Layout and crop planning
│   ├── monitoring/        # Camera and AI monitoring
│   └── climate-battery/   # Climate system calculations
├── routes/                # Additional API routes
├── middleware/            # Express middleware
├── services/              # Shared services
├── utils/                 # Utility functions
└── config/                # Configuration files
```

### Adding New Features

1. Create module in `src/modules/`
2. Add types in `*.types.ts`
3. Implement service in `*.service.ts`
4. Create controller in `*.controller.ts`
5. Define routes in `*.routes.ts`
6. Register routes in `src/index.ts`

### Testing

```bash
npm test                   # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Test coverage report
```

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Configuration
Ensure all production environment variables are set:
- Database connection
- JWT secrets
- OpenAI API key
- SMTP configuration (for email alerts)

### Performance Considerations
- Enable database connection pooling
- Configure rate limiting
- Set up image/video storage optimization
- Enable gzip compression
- Configure logging levels

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL in .env
   - Ensure PostgreSQL is running
   - Verify database exists

2. **OpenAI API Errors**
   - Verify OPENAI_API_KEY is valid
   - Check API usage limits
   - Review request format

3. **Authentication Issues**
   - Ensure JWT_SECRET is set
   - Check token expiration
   - Verify user permissions

4. **File Upload Problems**
   - Check file size limits
   - Verify upload directories exist
   - Review file type restrictions

### Logs Location
Development: Console output
Production: `./logs/greenhouse.log`

## Support

For issues and questions:
1. Check the logs for error details
2. Review API documentation
3. Check environment configuration
4. Verify database connectivity

## License

This project is part of the Greenhouse Management System suite.