// Simple Greenhouse Management Server
// This is a lightweight version that serves the HTML files without all dependencies

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Simple in-memory storage for demo
const storage = {
    users: new Map(),
    measurements: new Map(),
    alerts: new Map(),
    sessions: new Map(),
    cameras: new Map(),
    motionEvents: new Map()
};

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API Routes
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res, pathname, parsedUrl.query);
        return;
    }
    
    // Serve static files
    let filePath = path.join(__dirname, pathname === '/' ? 'greenhouse-auth.html' : pathname);
    
    // Route mappings
    const routes = {
        '/login': 'greenhouse-auth.html',
        '/dashboard': 'interactive-greenhouse-designer.html',
        '/planner': 'greenhouse-planner-multiple-crops.html',
        '/calendar': 'greenhouse-calendar-monitoring.html',
        '/climate-battery': 'climate-battery-test.html',
        '/ai-identification': 'ai-plant-identification.html',
        '/growth-tracker': 'greenhouse-growth-tracker.html',
        '/cameras': 'camera-management.html'
    };
    
    if (routes[pathname]) {
        filePath = path.join(__dirname, routes[pathname]);
    }
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
            return;
        }
        
        // Get file extension
        const extname = path.extname(filePath);
        const contentType = mimeTypes[extname] || 'application/octet-stream';
        
        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error reading file');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

// Handle API requests
function handleAPI(req, res, pathname, query) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        let data = {};
        if (body) {
            try {
                data = JSON.parse(body);
            } catch (e) {
                // Invalid JSON
            }
        }
        
        // Mock API responses
        switch (pathname) {
            case '/api/auth/login':
                handleLogin(res, data);
                break;
                
            case '/api/auth/register':
                handleRegister(res, data);
                break;
                
            case '/api/auth/check-auth':
                handleCheckAuth(req, res);
                break;
                
            case '/api/growth-tracking/measurements':
                if (req.method === 'POST') {
                    handleRecordMeasurement(req, res, data);
                } else {
                    handleGetMeasurements(req, res);
                }
                break;
                
            case '/api/growth-tracking/alerts':
                handleGetAlerts(req, res);
                break;
                
            case '/api/growth-tracking/alerts/clear-all':
                handleClearAlerts(req, res);
                break;
                
            case '/api/growth-tracking/alerts/summary':
                handleAlertSummary(req, res);
                break;
                
            case '/api/greenhouse-planning/create-plan':
                if (req.method === 'POST') {
                    handleCreateGreenhousePlan(req, res, data);
                }
                break;
                
            case '/api/greenhouse-planning/calculate-materials':
                if (req.method === 'POST') {
                    handleCalculateMaterials(req, res, data);
                }
                break;
                
            case '/api/greenhouse-planning/greenhouse-types':
                handleGetGreenhouseTypes(req, res);
                break;
                
            case '/api/greenhouse-planning/validate-bed-type':
                if (req.method === 'POST') {
                    handleValidateBedType(req, res, data);
                }
                break;
                
            case '/api/ai-identification/identify/quick':
                if (req.method === 'POST') {
                    handleQuickIdentify(req, res, data);
                }
                break;
                
            case '/api/ai-identification/analyze':
                if (req.method === 'POST') {
                    handleAIAnalysis(req, res, data);
                }
                break;
                
            case '/api/ai-identification/assess/health':
                if (req.method === 'POST') {
                    handleHealthAssessment(req, res, data);
                }
                break;
                
            case '/api/ai-identification/diagnose/pest-disease':
                if (req.method === 'POST') {
                    handlePestDiseaseAnalysis(req, res, data);
                }
                break;
                
            case '/api/ai-identification/analyze/growth':
                if (req.method === 'POST') {
                    handleGrowthAnalysis(req, res, data);
                }
                break;
                
            case '/api/ai-identification/history':
                handleGetAnalysisHistory(req, res);
                break;
                
            // Camera integration endpoints
            case '/api/cameras':
                if (req.method === 'POST') {
                    handleAddCamera(req, res, data);
                } else {
                    handleGetCameras(req, res);
                }
                break;
                
            case '/api/unifi/discover':
                if (req.method === 'POST') {
                    handleDiscoverUniFiCameras(req, res, data);
                }
                break;
                
            case '/api/unifi/test-connection':
                if (req.method === 'POST') {
                    handleTestUniFiConnection(req, res, data);
                }
                break;
                
            case '/api/health':
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
                break;
                
            default:
                // Handle camera-specific endpoints with parameters
                if (pathname.startsWith('/api/cameras/')) {
                    handleCameraEndpoint(req, res, pathname, data);
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'API endpoint not found' }));
                }
        }
    });
}

// Auth handlers
function handleLogin(res, data) {
    const { email, password } = data;
    
    // Check if user exists
    const user = Array.from(storage.users.values()).find(u => u.email === email);
    
    if (user && user.password === password) {
        const token = 'mock-jwt-token-' + Date.now();
        storage.sessions.set(token, user);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: 'user'
            },
            expiresIn: 900
        }));
    } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Invalid email or password'
        }));
    }
}

function handleRegister(res, data) {
    const { email, username, firstName, lastName, password } = data;
    
    // Check if user already exists
    const exists = Array.from(storage.users.values()).find(u => u.email === email);
    
    if (exists) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'User with this email already exists'
        }));
        return;
    }
    
    // Create user
    const userId = 'user_' + Date.now();
    const user = {
        id: userId,
        email,
        username,
        firstName,
        lastName,
        password, // In production, this would be hashed
        createdAt: new Date()
    };
    
    storage.users.set(userId, user);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
            id: userId,
            email,
            firstName,
            lastName
        }
    }));
}

function handleCheckAuth(req, res) {
    const auth = req.headers.authorization;
    
    if (auth && auth.startsWith('Bearer ')) {
        const token = auth.substring(7);
        const user = storage.sessions.get(token);
        
        if (user) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                authenticated: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            }));
            return;
        }
    }
    
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: false,
        authenticated: false,
        message: 'Not authenticated'
    }));
}

// Growth tracking handlers
function handleRecordMeasurement(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }
    
    const measurementId = 'measurement_' + Date.now();
    const measurement = {
        id: measurementId,
        ...data,
        createdAt: new Date()
    };
    
    storage.measurements.set(measurementId, measurement);
    
    // Create alert if health score is low
    if (data.measurements && data.measurements.healthScore < 70) {
        const alertId = 'alert_' + Date.now();
        storage.alerts.set(alertId, {
            id: alertId,
            type: 'warning',
            title: 'Low Health Score',
            message: `Plant health score is ${data.measurements.healthScore}%. Consider checking the plant.`,
            bedId: data.bedId,
            cropId: data.cropId,
            createdAt: new Date(),
            isRead: false
        });
    }
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        measurement,
        message: 'Measurement recorded successfully'
    }));
}

function handleGetMeasurements(req, res) {
    const measurements = Array.from(storage.measurements.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        measurements,
        count: measurements.length
    }));
}

function handleGetAlerts(req, res) {
    const alerts = Array.from(storage.alerts.values())
        .filter(a => !a.isArchived)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        alerts,
        count: alerts.length
    }));
}

function handleClearAlerts(req, res) {
    // Archive all alerts
    storage.alerts.forEach(alert => {
        alert.isArchived = true;
        alert.archivedAt = new Date();
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        message: 'All alerts cleared successfully'
    }));
}

function handleAlertSummary(req, res) {
    const alerts = Array.from(storage.alerts.values()).filter(a => !a.isArchived);
    const unread = alerts.filter(a => !a.isRead).length;
    const critical = alerts.filter(a => a.type === 'critical').length;
    const warnings = alerts.filter(a => a.type === 'warning').length;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        summary: {
            total: alerts.length,
            unread,
            critical,
            warnings,
            recentCount: alerts.filter(a => new Date() - new Date(a.createdAt) < 24 * 60 * 60 * 1000).length
        }
    }));
}

// Greenhouse planning handlers
function handleCreateGreenhousePlan(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }
    
    const planId = 'plan_' + Date.now();
    const plan = {
        id: planId,
        ...data,
        createdAt: new Date()
    };
    
    // Store the plan (in production, this would go to database)
    storage[planId] = plan;
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        plan,
        message: 'Greenhouse plan created successfully'
    }));
}

function handleCalculateMaterials(req, res, data) {
    const { type, dimensions, beds } = data;
    
    // Mock materials calculation
    const length = dimensions?.length || 20;
    const width = dimensions?.width || 12;
    const area = length * width;
    const bedCount = Object.keys(beds || {}).length;
    
    const materials = {
        structure: [
            { item: 'Galvanized Steel Frame', quantity: Math.ceil(area / 50), unit: 'kit', price: 299.99 },
            { item: 'Polycarbonate Panels', quantity: Math.ceil(area * 1.5), unit: 'sq ft', price: 3.50 },
            { item: 'Door Kit', quantity: 1, unit: 'kit', price: 159.99 },
            { item: 'Ventilation Windows', quantity: Math.ceil(length / 8), unit: 'each', price: 89.99 }
        ],
        beds: [
            { item: '4x8 Raised Bed Frame', quantity: bedCount, unit: 'each', price: 89.99 },
            { item: 'Growing Medium', quantity: bedCount * 32, unit: 'cu ft', price: 2.99 },
            { item: 'Irrigation Tubing', quantity: bedCount * 12, unit: 'ft', price: 0.75 }
        ],
        systems: [
            { item: 'Thermometer/Hygrometer', quantity: 2, unit: 'each', price: 24.99 },
            { item: 'LED Grow Lights', quantity: Math.ceil(bedCount / 4), unit: 'fixture', price: 149.99 },
            { item: 'Timer Control System', quantity: 1, unit: 'system', price: 199.99 }
        ]
    };
    
    // Calculate totals
    let totalCost = 0;
    Object.values(materials).forEach(category => {
        category.forEach(item => {
            item.total = item.quantity * item.price;
            totalCost += item.total;
        });
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        materials,
        summary: {
            totalCost: totalCost.toFixed(2),
            bedCount,
            area,
            efficiency: Math.round((bedCount * 32 / area) * 100)
        }
    }));
}

function handleGetGreenhouseTypes(req, res) {
    const types = [
        {
            id: 'hoop_house',
            name: 'Hoop House',
            description: 'Simple, cost-effective tunnel-style greenhouse',
            features: ['Easy assembly', 'Good ventilation', 'Budget-friendly'],
            price_range: '$200-800'
        },
        {
            id: 'lean_to',
            name: 'Lean-to',
            description: 'Attached to existing structure, space-efficient',
            features: ['Space-saving', 'Shared wall benefits', 'Easy access'],
            price_range: '$500-1500'
        },
        {
            id: 'traditional',
            name: 'Traditional A-Frame',
            description: 'Classic greenhouse design with peaked roof',
            features: ['Excellent drainage', 'Maximum height', 'Traditional look'],
            price_range: '$800-2500'
        },
        {
            id: 'geodesic_dome',
            name: 'Geodesic Dome',
            description: 'Unique dome structure with excellent strength',
            features: ['Wind resistant', 'Unique design', 'Maximum volume'],
            price_range: '$1200-4000'
        },
        {
            id: 'gothic_arch',
            name: 'Gothic Arch',
            description: 'Arched roof design for better snow load distribution',
            features: ['Snow load resistant', 'Good headroom', 'Efficient design'],
            price_range: '$600-2000'
        }
    ];
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        types
    }));
}

function handleValidateBedType(req, res, data) {
    const { plantName, bedType } = data;
    
    if (!plantName || !bedType) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Both plantName and bedType are required'
        }));
        return;
    }
    
    // Plant validation data
    const rootVegetables = ['carrots', 'carrot', 'radishes', 'radish', 'beets', 'beet', 'turnips', 'turnip', 'potatoes', 'potato', 'sweet potatoes', 'sweet potato', 'parsnips', 'parsnip', 'onions', 'onion', 'garlic', 'ginger', 'turmeric'];
    const trees = ['apple', 'pear', 'peach', 'cherry', 'citrus', 'lemon', 'orange', 'lime', 'avocado', 'fig', 'blueberry', 'raspberry', 'blackberry', 'grape', 'strawberry'];
    const hydroponicBedTypes = ['nft', 'dwc', 'media_bed', 'fill_and_drain'];
    
    const normalizedPlant = plantName.toLowerCase().trim();
    
    // Check if it's a root vegetable
    const isRootVegetable = rootVegetables.some(rootVeg => normalizedPlant.includes(rootVeg));
    
    // Check if it's a tree or perennial
    const isTree = trees.some(tree => normalizedPlant.includes(tree));
    
    let isValid = true;
    let reason = null;
    let category = null;
    
    // Root vegetables and trees need soil beds
    if ((isRootVegetable || isTree) && hydroponicBedTypes.includes(bedType)) {
        isValid = false;
        if (isRootVegetable) {
            category = 'root_vegetables';
            reason = `${plantName} is a root vegetable and cannot be grown in hydroponic systems like ${bedType}. Root vegetables need soil beds for proper development.`;
        } else {
            category = 'trees_and_perennials';
            reason = `${plantName} is a tree/perennial and requires soil beds for its extensive root system. Hydroponic systems like ${bedType} are not suitable.`;
        }
    } else if (isRootVegetable) {
        category = 'root_vegetables';
    } else if (isTree) {
        category = 'trees_and_perennials';
    } else {
        category = 'other';
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        data: {
            plantName,
            bedType,
            isValid,
            reason,
            plantCategory: {
                category,
                requiredBedTypes: (isRootVegetable || isTree) ? ['standing_soil'] : [],
                prohibitedBedTypes: (isRootVegetable || isTree) ? hydroponicBedTypes : []
            }
        }
    }));
}

// AI Identification handlers (mock implementations)
function handleQuickIdentify(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    // Mock quick identification result
    setTimeout(() => {
        const mockPlants = [
            { commonName: 'Tomato Plant', scientificName: 'Solanum lycopersicum', confidence: 0.92 },
            { commonName: 'Bell Pepper', scientificName: 'Capsicum annuum', confidence: 0.88 },
            { commonName: 'Lettuce', scientificName: 'Lactuca sativa', confidence: 0.85 },
            { commonName: 'Cucumber', scientificName: 'Cucumis sativus', confidence: 0.91 },
            { commonName: 'Basil', scientificName: 'Ocimum basilicum', confidence: 0.89 }
        ];
        
        const randomPlant = mockPlants[Math.floor(Math.random() * mockPlants.length)];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            identification: {
                plantIdentification: {
                    species: randomPlant.commonName,
                    commonName: randomPlant.commonName,
                    scientificName: randomPlant.scientificName,
                    confidence: randomPlant.confidence,
                    characteristics: ['Green leaves', 'Healthy appearance', 'Well-formed structure']
                },
                confidence: randomPlant.confidence,
                processingTime: 1200 + Math.random() * 800,
                alternatives: mockPlants.filter(p => p !== randomPlant).slice(0, 2).map(p => ({
                    species: p.commonName,
                    commonName: p.commonName,
                    confidence: p.confidence - 0.1
                }))
            },
            message: 'Plant identified successfully'
        }));
    }, 1000 + Math.random() * 2000);
}

function handleAIAnalysis(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    // Mock comprehensive analysis
    setTimeout(() => {
        const analysisId = 'analysis_' + Date.now();
        const confidence = 0.78 + Math.random() * 0.2;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            analysis: {
                id: analysisId,
                timestamp: new Date(),
                confidence,
                processingTime: 3500 + Math.random() * 2000,
                consensus: {
                    plantIdentification: {
                        species: 'Tomato Plant',
                        commonName: 'Tomato',
                        scientificName: 'Solanum lycopersicum',
                        confidence: confidence,
                        characteristics: ['Compound leaves', 'Red fruits', 'Herbaceous stem']
                    },
                    healthAssessment: {
                        overallHealth: 75 + Math.random() * 20,
                        stressFactors: [
                            {
                                type: 'water',
                                severity: 'low',
                                indicators: ['Slight leaf curl']
                            }
                        ]
                    },
                    pestDetection: Math.random() > 0.7 ? [{
                        pestType: 'aphids',
                        commonName: 'Green Aphids',
                        confidence: 0.6,
                        severity: 'low',
                        location: { area: 'leaves' }
                    }] : [],
                    diseaseDetection: [],
                    agreementScore: 0.8 + Math.random() * 0.15
                },
                recommendations: [
                    {
                        type: 'immediate',
                        priority: 'medium',
                        category: 'watering',
                        title: 'Adjust Watering Schedule',
                        description: 'Plant shows signs of mild water stress',
                        action: 'Increase watering frequency slightly and monitor soil moisture',
                        timeline: 'Within 24 hours',
                        expectedBenefit: 'Improved plant health and growth',
                        confidence: 0.85
                    },
                    {
                        type: 'preventive',
                        priority: 'low',
                        category: 'monitoring',
                        title: 'Regular Health Checks',
                        description: 'Continue monitoring for any changes',
                        action: 'Check plant weekly for pests and diseases',
                        timeline: 'Ongoing',
                        expectedBenefit: 'Early detection of problems',
                        confidence: 0.9
                    }
                ],
                results: [
                    { provider: 'google_vision', confidence: 0.7, processingTime: 800 },
                    { provider: 'google_gemini', confidence: 0.85, processingTime: 1200 },
                    { provider: 'openai_gpt4_vision', confidence: 0.9, processingTime: 1500 },
                    { provider: 'plantnet', confidence: 0.75, processingTime: 900 }
                ]
            },
            message: 'Image analyzed successfully'
        }));
    }, 2000 + Math.random() * 3000);
}

function handleHealthAssessment(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    // Mock health assessment
    setTimeout(() => {
        const healthScore = 60 + Math.random() * 35;
        const hasPests = Math.random() > 0.6;
        const hasDiseases = Math.random() > 0.8;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            healthAssessment: {
                overallHealth: {
                    overallHealth: Math.round(healthScore),
                    stressFactors: healthScore < 70 ? [
                        {
                            type: 'nutrients',
                            severity: 'moderate',
                            indicators: ['Yellowing lower leaves', 'Slow growth']
                        }
                    ] : []
                },
                pests: hasPests ? [{
                    pestType: 'spider_mites',
                    commonName: 'Spider Mites',
                    confidence: 0.7,
                    severity: 'moderate',
                    location: { area: 'leaves', percentage: 25 }
                }] : [],
                diseases: hasDiseases ? [{
                    diseaseType: 'early_blight',
                    pathogen: 'fungal',
                    commonName: 'Early Blight',
                    confidence: 0.65,
                    severity: 'low'
                }] : [],
                recommendations: [
                    {
                        type: 'immediate',
                        priority: healthScore < 60 ? 'high' : 'medium',
                        category: 'fertilizing',
                        title: 'Nutrient Supplementation',
                        description: 'Plant appears to need additional nutrients',
                        action: 'Apply balanced fertilizer (10-10-10) at half strength'
                    }
                ],
                confidence: 0.8,
                providerAgreement: 0.75
            },
            message: 'Health assessment completed'
        }));
    }, 1500 + Math.random() * 2000);
}

function handlePestDiseaseAnalysis(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    // Mock pest/disease diagnosis
    setTimeout(() => {
        const hasPests = Math.random() > 0.4;
        const hasDiseases = Math.random() > 0.6;
        
        let urgency = 'low';
        if (hasPests && hasDiseases) urgency = 'high';
        else if (hasPests || hasDiseases) urgency = 'medium';
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            diagnosis: {
                pests: hasPests ? [
                    {
                        pestType: 'aphids',
                        commonName: 'Green Aphids',
                        confidence: 0.8,
                        severity: 'moderate',
                        location: { area: 'leaves' }
                    },
                    {
                        pestType: 'whitefly',
                        commonName: 'Greenhouse Whitefly',
                        confidence: 0.6,
                        severity: 'low',
                        location: { area: 'leaves' }
                    }
                ] : [],
                diseases: hasDiseases ? [
                    {
                        diseaseType: 'powdery_mildew',
                        pathogen: 'fungal',
                        commonName: 'Powdery Mildew',
                        confidence: 0.75,
                        severity: 'moderate'
                    }
                ] : [],
                treatmentPlans: [
                    {
                        type: 'immediate',
                        priority: 'high',
                        category: 'pest_control',
                        title: 'Aphid Treatment',
                        description: 'Apply insecticidal soap or neem oil to affected areas',
                        action: 'Spray affected leaves with organic insecticidal soap solution'
                    }
                ],
                confidence: 0.7,
                urgency
            },
            message: 'Diagnosis completed'
        }));
    }, 1800 + Math.random() * 2200);
}

function handleGrowthAnalysis(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    // Mock growth analysis
    setTimeout(() => {
        const stages = ['seedling', 'vegetative', 'flowering', 'fruiting', 'mature'];
        const currentStage = stages[Math.floor(Math.random() * stages.length)];
        const confidence = 0.75 + Math.random() * 0.2;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            growthAnalysis: {
                currentStage,
                developmentRate: Math.random() > 0.5 ? 'normal' : Math.random() > 0.5 ? 'fast' : 'slow',
                harvestPrediction: {
                    estimatedDays: Math.floor(Math.random() * 45) + 5,
                    confidence: 'Medium',
                    status: currentStage === 'mature' ? 'ready' : currentStage === 'fruiting' ? 'harvest_soon' : 'growing'
                },
                recommendations: [
                    {
                        type: 'monitoring',
                        priority: 'medium',
                        category: 'harvesting',
                        title: 'Monitor for Harvest Readiness',
                        description: 'Check daily for signs of ripeness',
                        action: 'Look for color changes and firmness indicators'
                    }
                ],
                confidence
            },
            message: 'Growth analysis completed'
        }));
    }, 1600 + Math.random() * 1800);
}

function handleGetAnalysisHistory(req, res) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    // Mock analysis history
    const history = [
        {
            id: 'analysis_1',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            imageUrl: '/mock-image-1.jpg',
            providers: ['google_vision', 'plantnet'],
            confidence: 0.85,
            plantIdentification: {
                commonName: 'Tomato Plant'
            },
            issues: 1,
            processingTime: 1200
        },
        {
            id: 'analysis_2',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            imageUrl: '/mock-image-2.jpg',
            providers: ['google_gemini', 'openai_gpt4_vision'],
            confidence: 0.92,
            plantIdentification: {
                commonName: 'Bell Pepper'
            },
            issues: 0,
            processingTime: 1800
        }
    ];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        history,
        count: history.length
    }));
}

// Camera integration handlers (mock implementations)
function handleAddCamera(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    const { providerType, name, location, streamUrl, unifiConfig } = data;
    
    if (!providerType || !name || !location) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Missing required fields: providerType, name, location'
        }));
        return;
    }

    const cameraId = 'camera_' + Date.now();
    const camera = {
        id: cameraId,
        providerId: streamUrl || 'mock-provider-id',
        providerType,
        name,
        description: data.description || '',
        location,
        status: {
            isOnline: true,
            isRecording: false,
            isStreaming: false,
            hasMotion: false,
            lastSeen: new Date(),
            health: 'good'
        },
        capabilities: ['live_stream', 'snapshot', 'motion_detection'],
        streamUrl: streamUrl || `rtsp://mock-stream/${cameraId}`,
        snapshotUrl: `/api/cameras/${cameraId}/snapshot`,
        metadata: {
            manufacturer: providerType === 'ubiquiti_unifi' ? 'Ubiquiti' : 'Generic',
            model: 'Mock Camera',
            resolution: { width: 1920, height: 1080 },
            fps: 30
        },
        settings: {
            enabled: true,
            autoCapture: true,
            captureInterval: 60,
            motionCapture: true,
            aiAnalysis: true,
            alertOnMotion: true,
            alertOnAiDetection: true,
            retentionDays: 7,
            quality: 'high',
            nightMode: 'auto',
            privacyMode: false,
            audioEnabled: false,
            ...data.settings
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    storage.cameras.set(cameraId, camera);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        camera,
        message: 'Camera added successfully'
    }));
}

function handleGetCameras(req, res) {
    const cameras = Array.from(storage.cameras.values());
    const online = cameras.filter(c => c.status.isOnline).length;
    const offline = cameras.length - online;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        cameras,
        total: cameras.length,
        online,
        offline
    }));
}

function handleDiscoverUniFiCameras(req, res, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    const { host, username, password } = data;
    
    if (!host || !username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Missing required UniFi configuration'
        }));
        return;
    }

    // Mock discovered cameras
    setTimeout(() => {
        const mockCameras = [
            {
                id: 'unifi_camera_1',
                providerId: 'unifi_1234567890',
                providerType: 'ubiquiti_unifi',
                name: 'Greenhouse Entrance',
                description: 'UniFi G4 Pro - Greenhouse main entrance',
                location: {
                    position: { x: 0, y: 0 },
                    direction: 'south'
                },
                status: {
                    isOnline: true,
                    isRecording: true,
                    isStreaming: false,
                    hasMotion: false,
                    lastSeen: new Date(),
                    health: 'good'
                },
                capabilities: ['live_stream', 'snapshot', 'recording', 'motion_detection', 'analytics'],
                streamUrl: `rtsp://${host}/live/unifi_1234567890`,
                snapshotUrl: `/api/cameras/unifi_camera_1/snapshot`,
                metadata: {
                    manufacturer: 'Ubiquiti',
                    model: 'UniFi G4 Pro',
                    resolution: { width: 3840, height: 2160 },
                    fps: 30
                }
            },
            {
                id: 'unifi_camera_2',
                providerId: 'unifi_0987654321',
                providerType: 'ubiquiti_unifi',
                name: 'Growing Area 1',
                description: 'UniFi G4 Bullet - Growing beds monitoring',
                location: {
                    position: { x: 10, y: 5 },
                    direction: 'down'
                },
                status: {
                    isOnline: true,
                    isRecording: true,
                    isStreaming: false,
                    hasMotion: false,
                    lastSeen: new Date(),
                    health: 'good'
                },
                capabilities: ['live_stream', 'snapshot', 'recording', 'motion_detection', 'infrared'],
                streamUrl: `rtsp://${host}/live/unifi_0987654321`,
                snapshotUrl: `/api/cameras/unifi_camera_2/snapshot`,
                metadata: {
                    manufacturer: 'Ubiquiti',
                    model: 'UniFi G4 Bullet',
                    resolution: { width: 1920, height: 1080 },
                    fps: 24
                }
            }
        ];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            cameras: mockCameras,
            count: mockCameras.length,
            message: `Discovered ${mockCameras.length} UniFi cameras`
        }));
    }, 1500 + Math.random() * 1000);
}

function handleTestUniFiConnection(req, res, data) {
    const { host, username, password } = data;
    
    if (!host || !username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            connected: false,
            message: 'Missing required UniFi configuration'
        }));
        return;
    }

    // Mock connection test
    setTimeout(() => {
        // Simulate success most of the time
        const isConnected = Math.random() > 0.2;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: isConnected,
            connected: isConnected,
            message: isConnected ? 'Connection successful' : 'Connection failed - check credentials'
        }));
    }, 800 + Math.random() * 700);
}

function handleCameraEndpoint(req, res, pathname, data) {
    const pathParts = pathname.split('/');
    const cameraId = pathParts[3];
    const action = pathParts[4];
    
    if (!cameraId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera ID required'
        }));
        return;
    }

    switch (action) {
        case undefined:
            // GET /api/cameras/:cameraId
            if (req.method === 'GET') {
                handleGetCamera(req, res, cameraId);
            } else if (req.method === 'PUT') {
                handleUpdateCamera(req, res, cameraId, data);
            } else if (req.method === 'DELETE') {
                handleDeleteCamera(req, res, cameraId);
            }
            break;
            
        case 'capture':
            if (req.method === 'POST') {
                handleCaptureSnapshot(req, res, cameraId, data);
            }
            break;
            
        case 'stream':
            if (req.method === 'GET') {
                handleGetStreamUrl(req, res, cameraId);
            }
            break;
            
        case 'status':
            if (req.method === 'GET') {
                handleGetCameraStatus(req, res, cameraId);
            }
            break;
            
        case 'motion-events':
            if (req.method === 'GET') {
                handleGetMotionEvents(req, res, cameraId);
            }
            break;
            
        case 'capture-analyze':
            if (req.method === 'POST') {
                handleCaptureAndAnalyze(req, res, cameraId, data);
            }
            break;
            
        default:
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Camera endpoint not found'
            }));
    }
}

function handleGetCamera(req, res, cameraId) {
    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        camera
    }));
}

function handleUpdateCamera(req, res, cameraId, data) {
    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }
    
    // Update camera with provided data
    const updatedCamera = {
        ...camera,
        ...data,
        location: data.location ? { ...camera.location, ...data.location } : camera.location,
        settings: data.settings ? { ...camera.settings, ...data.settings } : camera.settings,
        updatedAt: new Date()
    };
    
    storage.cameras.set(cameraId, updatedCamera);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        camera: updatedCamera,
        message: 'Camera updated successfully'
    }));
}

function handleDeleteCamera(req, res, cameraId) {
    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }
    
    storage.cameras.delete(cameraId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        message: 'Camera deleted successfully'
    }));
}

function handleCaptureSnapshot(req, res, cameraId, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }

    // Mock snapshot capture
    setTimeout(() => {
        const captureId = `snapshot_${cameraId}_${Date.now()}`;
        const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const result = {
            id: captureId,
            cameraId,
            timestamp: new Date(),
            imageUrl: `data:image/jpeg;base64,${mockImageBase64}`,
            imageBase64: mockImageBase64,
            metadata: {
                width: camera.metadata.resolution.width,
                height: camera.metadata.resolution.height,
                size: 2048,
                format: 'jpeg'
            }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            ...result
        }));
    }, 800 + Math.random() * 1200);
}

function handleGetStreamUrl(req, res, cameraId) {
    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        cameraId,
        streamUrl: camera.streamUrl,
        protocol: 'rtsp',
        expires: new Date(Date.now() + 60 * 60 * 1000)
    }));
}

function handleGetCameraStatus(req, res, cameraId) {
    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        status: camera.status
    }));
}

function handleGetMotionEvents(req, res, cameraId) {
    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }

    // Mock motion events
    const events = [
        {
            id: 'motion_1',
            cameraId,
            startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000),
            duration: 30,
            thumbnail: '/mock-motion-thumbnail.jpg',
            zones: ['main_area'],
            score: 85,
            type: 'motion'
        },
        {
            id: 'motion_2',
            cameraId,
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 45000),
            duration: 45,
            thumbnail: '/mock-motion-thumbnail-2.jpg',
            zones: ['entrance'],
            score: 92,
            type: 'person'
        }
    ];
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        events,
        count: events.length
    }));
}

function handleCaptureAndAnalyze(req, res, cameraId, data) {
    const auth = req.headers.authorization;
    
    if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Authentication required'
        }));
        return;
    }

    const camera = storage.cameras.get(cameraId);
    
    if (!camera) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Camera not found'
        }));
        return;
    }

    // Mock capture and analysis
    setTimeout(() => {
        const captureId = `capture_analyze_${cameraId}_${Date.now()}`;
        const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const result = {
            capture: {
                id: captureId,
                cameraId,
                timestamp: new Date(),
                imageUrl: `data:image/jpeg;base64,${mockImageBase64}`,
                imageBase64: mockImageBase64,
                metadata: {
                    width: camera.metadata.resolution.width,
                    height: camera.metadata.resolution.height,
                    size: 2048,
                    format: 'jpeg'
                }
            },
            analysis: {
                id: `analysis_${Date.now()}`,
                timestamp: new Date(),
                confidence: 0.85 + Math.random() * 0.15,
                plantDetection: {
                    detected: true,
                    plantCount: Math.floor(Math.random() * 4) + 1,
                    plants: [
                        {
                            id: 'plant_1',
                            boundingBox: { x: 100, y: 150, width: 200, height: 300 },
                            confidence: 0.9,
                            species: 'Tomato Plant',
                            health: 85
                        }
                    ]
                },
                healthAssessment: {
                    overallHealth: 75 + Math.random() * 20,
                    issues: Math.random() > 0.7 ? [
                        {
                            type: 'pest',
                            severity: 'low',
                            confidence: 0.6,
                            description: 'Possible aphid presence on lower leaves'
                        }
                    ] : []
                },
                environmentalConditions: {
                    lighting: Math.random() > 0.5 ? 'high' : 'medium',
                    moisture: 'adequate'
                }
            }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            ...result
        }));
    }, 2000 + Math.random() * 3000);
}

// Start server
server.listen(PORT, () => {
    console.log(`
🏡 Greenhouse Management System Started!
========================================
Server running at: http://localhost:${PORT}

Available pages:
  📱 Login/Register: http://localhost:${PORT}/
  🏡 Dashboard: http://localhost:${PORT}/dashboard
  📈 Growth Tracker: http://localhost:${PORT}/growth-tracker
  🌱 Planner: http://localhost:${PORT}/planner
  📅 Calendar: http://localhost:${PORT}/calendar
  🔋 Climate Battery: http://localhost:${PORT}/climate-battery
  🤖 AI Plant ID: http://localhost:${PORT}/ai-identification
  📹 Camera Management: http://localhost:${PORT}/cameras

Note: This is a simplified server for demo purposes.
For full functionality, install all dependencies and run the TypeScript version.

Press Ctrl+C to stop the server.
    `);
});