import axios from 'axios';
import {
  ImageAnalysis,
  CropHealthAnalysis,
  PestDetection,
  DiseaseDetection,
  HarvestReadiness,
  GrowthProgress,
  Alert,
  AlertType,
  CapturedImage
} from './monitoring.types';

export class VisionAIService {
  private static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private static readonly OPENAI_VISION_API = 'https://api.openai.com/v1/chat/completions';
  
  static async analyzeImage(
    image: CapturedImage,
    cropType: string,
    plantingDate: Date
  ): Promise<ImageAnalysis> {
    try {
      // Calculate days since planting
      const daysSincePlanting = Math.floor(
        (new Date().getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Prepare prompts for different analyses
      const analyses = await Promise.all([
        this.analyzeCropHealth(image.imageUrl, cropType),
        this.detectPests(image.imageUrl, cropType),
        this.detectDiseases(image.imageUrl, cropType),
        this.assessHarvestReadiness(image.imageUrl, cropType, daysSincePlanting),
        this.trackGrowthProgress(image.imageUrl, cropType, daysSincePlanting)
      ]);
      
      const [cropHealth, pests, diseases, harvestReadiness, growthProgress] = analyses;
      
      // Generate alerts based on analysis
      const alerts = this.generateAlerts(cropHealth, pests, diseases, harvestReadiness);
      
      const analysis: ImageAnalysis = {
        id: `analysis-${Date.now()}`,
        imageId: image.id,
        timestamp: new Date(),
        cropHealth,
        pestDetection: pests,
        diseaseDetection: diseases,
        harvestReadiness,
        growthProgress,
        alerts
      };
      
      return analysis;
    } catch (error) {
      console.error('Vision AI analysis error:', error);
      throw error;
    }
  }
  
  private static async analyzeCropHealth(
    imageUrl: string,
    cropType: string
  ): Promise<CropHealthAnalysis> {
    if (!this.OPENAI_API_KEY) {
      return this.getMockCropHealth();
    }
    
    try {
      const prompt = `Analyze this ${cropType} plant image for health indicators:
      1. Leaf color status (healthy/yellowing/browning/wilting)
      2. Growth rate assessment (normal/slow/fast/stunted)
      3. Canopy density (0-100%)
      4. Any visible stress indicators
      
      Respond in JSON format:
      {
        "leafColor": { "status": "string", "confidence": number },
        "growthRate": { "status": "string", "percentageVsExpected": number },
        "canopyDensity": number,
        "stressIndicators": ["string"]
      }`;
      
      const response = await this.callVisionAPI(imageUrl, prompt);
      const data = JSON.parse(response);
      
      const overallScore = this.calculateHealthScore(data);
      
      return {
        overallScore,
        leafColor: data.leafColor,
        growthRate: data.growthRate,
        canopyDensity: data.canopyDensity,
        stressIndicators: data.stressIndicators
      };
    } catch (error) {
      console.error('Crop health analysis error:', error);
      return this.getMockCropHealth();
    }
  }
  
  private static async detectPests(
    imageUrl: string,
    cropType: string
  ): Promise<PestDetection[]> {
    if (!this.OPENAI_API_KEY) {
      return this.getMockPestDetection();
    }
    
    try {
      const prompt = `Examine this ${cropType} plant image for pest infestations:
      1. Identify any visible pests (aphids, whiteflies, spider mites, caterpillars, etc.)
      2. Assess severity (low/medium/high/critical)
      3. Locate affected areas
      4. Suggest organic and chemical treatments
      
      Respond in JSON format:
      {
        "pests": [
          {
            "type": "string",
            "commonName": "string",
            "severity": "string",
            "confidence": number,
            "location": { "description": "string" },
            "organicTreatments": ["string"],
            "chemicalTreatments": ["string"]
          }
        ]
      }`;
      
      const response = await this.callVisionAPI(imageUrl, prompt);
      const data = JSON.parse(response);
      
      return data.pests.map((pest: any) => ({
        pestType: pest.type,
        commonName: pest.commonName,
        severity: pest.severity,
        confidence: pest.confidence,
        location: { x: 0, y: 0, width: 100, height: 100 }, // Simplified for now
        recommendedActions: this.getPestActions(pest.type, pest.severity),
        organicTreatments: pest.organicTreatments,
        chemicalTreatments: pest.chemicalTreatments
      }));
    } catch (error) {
      console.error('Pest detection error:', error);
      return this.getMockPestDetection();
    }
  }
  
  private static async detectDiseases(
    imageUrl: string,
    cropType: string
  ): Promise<DiseaseDetection[]> {
    if (!this.OPENAI_API_KEY) {
      return this.getMockDiseaseDetection();
    }
    
    try {
      const prompt = `Analyze this ${cropType} plant image for diseases:
      1. Identify any fungal, bacterial, or viral diseases
      2. Assess severity (early/moderate/advanced/severe)
      3. List visible symptoms
      4. Recommend treatment and prevention
      
      Respond in JSON format:
      {
        "diseases": [
          {
            "type": "string",
            "commonName": "string",
            "pathogen": "string",
            "severity": "string",
            "confidence": number,
            "symptoms": ["string"],
            "treatments": ["string"],
            "prevention": ["string"]
          }
        ]
      }`;
      
      const response = await this.callVisionAPI(imageUrl, prompt);
      const data = JSON.parse(response);
      
      return data.diseases.map((disease: any) => ({
        diseaseType: disease.type,
        commonName: disease.commonName,
        pathogen: disease.pathogen,
        severity: disease.severity,
        confidence: disease.confidence,
        affectedArea: [{ x: 0, y: 0, width: 100, height: 100 }], // Simplified
        symptoms: disease.symptoms,
        recommendedActions: disease.treatments,
        preventiveMeasures: disease.prevention
      }));
    } catch (error) {
      console.error('Disease detection error:', error);
      return this.getMockDiseaseDetection();
    }
  }
  
  private static async assessHarvestReadiness(
    imageUrl: string,
    cropType: string,
    daysSincePlanting: number
  ): Promise<HarvestReadiness> {
    if (!this.OPENAI_API_KEY) {
      return this.getMockHarvestReadiness(cropType, daysSincePlanting);
    }
    
    try {
      const prompt = `Assess harvest readiness for this ${cropType} (${daysSincePlanting} days since planting):
      1. Size assessment (undersized/optimal/oversized)
      2. Color maturity (immature/ready/overripe)
      3. Texture and firmness
      4. Overall readiness score (0-100)
      5. Estimated days until optimal harvest
      
      Respond in JSON format:
      {
        "readinessScore": number,
        "size": "string",
        "color": "string",
        "texture": "string",
        "estimatedDaysToHarvest": number,
        "confidence": number
      }`;
      
      const response = await this.callVisionAPI(imageUrl, prompt);
      const data = JSON.parse(response);
      
      const harvestWindow = this.calculateHarvestWindow(
        new Date(),
        data.estimatedDaysToHarvest
      );
      
      return {
        cropId: cropType,
        readinessScore: data.readinessScore,
        estimatedDaysToHarvest: data.estimatedDaysToHarvest,
        visualIndicators: {
          size: data.size,
          color: data.color,
          texture: data.texture
        },
        recommendedHarvestWindow: harvestWindow,
        confidence: data.confidence
      };
    } catch (error) {
      console.error('Harvest readiness error:', error);
      return this.getMockHarvestReadiness(cropType, daysSincePlanting);
    }
  }
  
  private static async trackGrowthProgress(
    imageUrl: string,
    cropType: string,
    daysSincePlanting: number
  ): Promise<GrowthProgress> {
    if (!this.OPENAI_API_KEY) {
      return this.getMockGrowthProgress(daysSincePlanting);
    }
    
    try {
      const prompt = `Analyze growth progress for this ${cropType} (${daysSincePlanting} days old):
      1. Current growth stage
      2. Estimated height (inches)
      3. Leaf count
      4. Fruit/flower count if applicable
      5. Growth rate compared to average
      
      Respond in JSON format:
      {
        "currentStage": "string",
        "height": number,
        "leafCount": number,
        "fruitCount": number,
        "growthRateVsAverage": number
      }`;
      
      const response = await this.callVisionAPI(imageUrl, prompt);
      const data = JSON.parse(response);
      
      return {
        currentStage: data.currentStage,
        percentageComplete: this.calculateStageProgress(cropType, daysSincePlanting),
        daysInCurrentStage: this.getDaysInStage(cropType, daysSincePlanting),
        expectedDaysRemaining: this.getExpectedDaysRemaining(cropType, daysSincePlanting),
        growthRateVsAverage: data.growthRateVsAverage,
        heightMeasurement: data.height,
        leafCount: data.leafCount,
        fruitCount: data.fruitCount
      };
    } catch (error) {
      console.error('Growth progress error:', error);
      return this.getMockGrowthProgress(daysSincePlanting);
    }
  }
  
  private static async callVisionAPI(imageUrl: string, prompt: string): Promise<string> {
    const response = await axios.post(
      this.OPENAI_VISION_API,
      {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }
  
  private static generateAlerts(
    health: CropHealthAnalysis,
    pests: PestDetection[],
    diseases: DiseaseDetection[],
    harvest: HarvestReadiness
  ): Alert[] {
    const alerts: Alert[] = [];
    
    // Health alerts
    if (health.overallScore < 70) {
      alerts.push({
        id: `alert-${Date.now()}-health`,
        type: AlertType.GROWTH_ANOMALY,
        severity: health.overallScore < 50 ? 'critical' : 'warning',
        title: 'Plant Health Issue Detected',
        description: `Overall health score: ${health.overallScore}%. Stress indicators: ${health.stressIndicators.join(', ')}`,
        timestamp: new Date(),
        actionRequired: true,
        suggestedActions: ['Check environmental conditions', 'Inspect for nutrient deficiencies'],
        autoDismiss: false
      });
    }
    
    // Pest alerts
    pests.forEach(pest => {
      if (pest.severity === 'high' || pest.severity === 'critical') {
        alerts.push({
          id: `alert-${Date.now()}-pest-${pest.pestType}`,
          type: AlertType.PEST_DETECTED,
          severity: pest.severity === 'critical' ? 'critical' : 'warning',
          title: `${pest.commonName} Infestation Detected`,
          description: `${pest.severity} severity ${pest.pestType} detected with ${pest.confidence}% confidence`,
          timestamp: new Date(),
          actionRequired: true,
          suggestedActions: pest.recommendedActions,
          autoDismiss: false
        });
      }
    });
    
    // Disease alerts
    diseases.forEach(disease => {
      if (disease.severity === 'advanced' || disease.severity === 'severe') {
        alerts.push({
          id: `alert-${Date.now()}-disease-${disease.diseaseType}`,
          type: AlertType.DISEASE_DETECTED,
          severity: disease.severity === 'severe' ? 'critical' : 'warning',
          title: `${disease.commonName} Disease Detected`,
          description: `${disease.severity} stage ${disease.diseaseType} with symptoms: ${disease.symptoms.join(', ')}`,
          timestamp: new Date(),
          actionRequired: true,
          suggestedActions: disease.recommendedActions,
          autoDismiss: false
        });
      }
    });
    
    // Harvest alerts
    if (harvest.readinessScore >= 90) {
      alerts.push({
        id: `alert-${Date.now()}-harvest`,
        type: AlertType.HARVEST_READY,
        severity: 'info',
        title: 'Crop Ready for Harvest',
        description: `${harvest.cropId} is ${harvest.readinessScore}% ready for harvest`,
        timestamp: new Date(),
        actionRequired: true,
        suggestedActions: ['Schedule harvest within recommended window', 'Prepare storage'],
        autoDismiss: false
      });
    } else if (harvest.readinessScore >= 100 && harvest.estimatedDaysToHarvest < -3) {
      alerts.push({
        id: `alert-${Date.now()}-overdue`,
        type: AlertType.HARVEST_OVERDUE,
        severity: 'warning',
        title: 'Harvest Overdue',
        description: `${harvest.cropId} is overdue for harvest by ${Math.abs(harvest.estimatedDaysToHarvest)} days`,
        timestamp: new Date(),
        actionRequired: true,
        suggestedActions: ['Harvest immediately to prevent quality loss'],
        autoDismiss: false
      });
    }
    
    return alerts;
  }
  
  // Helper methods
  private static calculateHealthScore(data: any): number {
    let score = 100;
    
    if (data.leafColor.status !== 'healthy') score -= 20;
    if (data.growthRate.status !== 'normal') score -= 15;
    if (data.canopyDensity < 70) score -= 10;
    if (data.stressIndicators.length > 0) score -= (data.stressIndicators.length * 5);
    
    return Math.max(0, score);
  }
  
  private static getPestActions(pestType: string, severity: string): string[] {
    const actions = {
      'aphids': ['Spray with neem oil', 'Introduce ladybugs', 'Use insecticidal soap'],
      'whiteflies': ['Yellow sticky traps', 'Neem oil spray', 'Reflective mulch'],
      'spider_mites': ['Increase humidity', 'Predatory mites', 'Miticide application'],
      'default': ['Inspect affected areas', 'Isolate infected plants', 'Consult pest guide']
    };
    
    return actions[pestType] || actions['default'];
  }
  
  private static calculateHarvestWindow(currentDate: Date, daysToHarvest: number): {
    start: Date;
    end: Date;
  } {
    const start = new Date(currentDate);
    start.setDate(start.getDate() + Math.max(0, daysToHarvest - 2));
    
    const end = new Date(currentDate);
    end.setDate(end.getDate() + daysToHarvest + 5);
    
    return { start, end };
  }
  
  private static calculateStageProgress(cropType: string, daysSincePlanting: number): number {
    // Simplified calculation - would use actual growth stage data
    const typicalDuration = {
      'Tomatoes': 85,
      'Lettuce': 45,
      'Peppers': 75,
      'Cucumbers': 60
    };
    
    const duration = typicalDuration[cropType] || 60;
    return Math.min(100, (daysSincePlanting / duration) * 100);
  }
  
  private static getDaysInStage(cropType: string, daysSincePlanting: number): number {
    // Simplified - would calculate based on actual stage data
    return daysSincePlanting % 14; // Assuming 2-week stages
  }
  
  private static getExpectedDaysRemaining(cropType: string, daysSincePlanting: number): number {
    const typicalDuration = {
      'Tomatoes': 85,
      'Lettuce': 45,
      'Peppers': 75,
      'Cucumbers': 60
    };
    
    const duration = typicalDuration[cropType] || 60;
    return Math.max(0, duration - daysSincePlanting);
  }
  
  // Mock data methods for testing without API
  private static getMockCropHealth(): CropHealthAnalysis {
    return {
      overallScore: 85,
      leafColor: { status: 'healthy', confidence: 0.9 },
      growthRate: { status: 'normal', percentageVsExpected: 98 },
      canopyDensity: 80,
      stressIndicators: []
    };
  }
  
  private static getMockPestDetection(): PestDetection[] {
    return [];
  }
  
  private static getMockDiseaseDetection(): DiseaseDetection[] {
    return [];
  }
  
  private static getMockHarvestReadiness(cropType: string, days: number): HarvestReadiness {
    const readiness = Math.min(100, (days / 60) * 100);
    return {
      cropId: cropType,
      readinessScore: readiness,
      estimatedDaysToHarvest: Math.max(0, 60 - days),
      visualIndicators: {
        size: readiness > 80 ? 'optimal' : 'undersized',
        color: readiness > 90 ? 'ready' : 'immature',
        texture: 'firm'
      },
      recommendedHarvestWindow: {
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      confidence: 0.85
    };
  }
  
  private static getMockGrowthProgress(days: number): GrowthProgress {
    return {
      currentStage: days < 14 ? 'Seedling' : days < 40 ? 'Vegetative' : 'Flowering',
      percentageComplete: Math.min(100, (days / 60) * 100),
      daysInCurrentStage: days % 14,
      expectedDaysRemaining: Math.max(0, 60 - days),
      growthRateVsAverage: 95,
      heightMeasurement: days * 0.5,
      leafCount: days * 0.8,
      fruitCount: days > 40 ? Math.floor((days - 40) * 0.3) : 0
    };
  }
}