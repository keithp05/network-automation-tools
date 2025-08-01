# Greenhouse Management System

A comprehensive greenhouse management application with AI-powered plant identification, hydroponic/aquaponic system integration, and automated control systems.

## Features

### 🤖 AI Plant Identification
- **Real-time Plant Recognition**: Upload photos or take pictures directly with your camera to identify plants using advanced AI models
- **Health Assessment**: Automatic detection of plant diseases and health issues with treatment recommendations
- **Growth Monitoring**: Track plant growth stages and receive automated care recommendations
- **Companion Planting**: AI-suggested companion plants for optimal growing conditions

### 📊 Sensor Integration
- **pH Monitoring**: Real-time water pH level tracking
- **Dissolved Oxygen**: Monitor DO levels in aquaponic systems
- **Temperature Control**: Air and water temperature monitoring
- **Humidity Tracking**: Environmental humidity control
- **CO2 Monitoring**: Carbon dioxide level management

### 🏗️ System Design Tools
- **Floor Plan Designer**: Drag-and-drop greenhouse layout design
- **Growbed Calculator**: Design optimal growing bed configurations
- **Geothermal System**: Calculate piping and airflow requirements
- **Companion Crop Planning**: AI-assisted crop rotation and companion planting

### 🔧 Automation & Control
- **Nutrient Delivery**: Automated nutrient dosing systems
- **Climate Control**: Smart fan and temperature regulation
- **Lighting Systems**: Automated grow light management
- **Irrigation Control**: Smart watering systems for fodder production

### 📱 User Interface
- **Real-time Dashboard**: Live monitoring of all greenhouse systems
- **Mobile-Friendly**: Responsive design for mobile devices
- **Camera Integration**: Direct camera access for plant identification
- **Data Visualization**: Charts and graphs for sensor data analysis

## Technology Stack

### Backend
- **Node.js + Express**: RESTful API server
- **TypeScript**: Type-safe development
- **PostgreSQL**: Relational database for data storage
- **MQTT**: IoT sensor communication protocol
- **Socket.io**: Real-time data streaming
- **Sharp**: Image processing for AI identification
- **Plant.id API**: Professional plant identification service

### Frontend
- **React 18**: Modern UI framework
- **Material-UI**: Professional component library
- **TypeScript**: Type-safe frontend development
- **Vite**: Fast development build tool
- **Zustand**: State management
- **React Konva**: Canvas-based floor plan designer
- **Recharts**: Data visualization library

### AI & Machine Learning
- **Plant.id API**: Professional plant identification
- **TensorFlow.js**: Local ML model support
- **Computer Vision**: Image processing and analysis
- **Disease Detection**: Plant health assessment
- **Growth Prediction**: AI-powered growth stage tracking

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd greenhouse-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend (.env)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=greenhouse_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   PLANT_ID_API_KEY=your_plant_id_key
   TREFLE_API_KEY=your_trefle_key
   MQTT_BROKER_URL=mqtt://localhost:1883
   JWT_SECRET=your_jwt_secret
   ```

4. **Set up PostgreSQL database**
   ```bash
   createdb greenhouse_db
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Plant Identification
- `POST /api/plant-identification/identify` - Identify plant from image
- `POST /api/plant-identification/health-check` - Assess plant health
- `POST /api/plant-identification/batch-identify` - Identify multiple plants
- `GET /api/plant-identification/plant-care/:scientificName` - Get care instructions

### Sensors
- `GET /api/sensors` - List all sensors
- `POST /api/sensors` - Add new sensor
- `GET /api/sensors/:id/readings` - Get sensor readings

### Plants
- `GET /api/plants` - List all plants
- `POST /api/plants` - Add new plant
- `PUT /api/plants/:id` - Update plant information

## Usage

### Plant Identification Workflow

1. **Take or Upload Photo**: Use the camera or upload an existing image
2. **AI Analysis**: The system processes the image using computer vision
3. **Species Identification**: Get detailed plant information including:
   - Scientific and common names
   - Growth requirements
   - Companion plants
   - Care instructions
4. **Health Assessment**: Detect diseases and get treatment recommendations
5. **Add to System**: Automatically create plant records in your greenhouse

### Mobile Camera Features

- **Real-time Camera**: Direct camera access on mobile devices
- **Photo Guidelines**: Visual guides for optimal plant photography
- **Camera Switching**: Front/back camera selection
- **Auto-focus**: Automatic focus for clear plant images

### Dashboard Monitoring

- **Live Sensor Data**: Real-time pH, temperature, and oxygen readings
- **Growth Tracking**: Visual progress indicators for each plant
- **Alert System**: Notifications for critical conditions
- **Historical Data**: Charts showing trends over time

## Configuration

### Sensor Setup
1. Connect MQTT-enabled sensors to your network
2. Configure sensor topics in the MQTT service
3. Calibrate sensors through the web interface
4. Set up alert thresholds for each sensor type

### Plant Database
The system maintains a comprehensive plant database including:
- Growth requirements (temperature, humidity, pH, light)
- Companion planting relationships
- Disease identification and treatment
- Harvest timing and yield predictions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api/docs` when running the server

## Roadmap

- [ ] Advanced disease prediction models
- [ ] Integration with additional plant databases
- [ ] Mobile app for iOS and Android
- [ ] Voice control integration
- [ ] Machine learning for yield optimization
- [ ] Weather station integration
- [ ] Automated harvesting recommendations