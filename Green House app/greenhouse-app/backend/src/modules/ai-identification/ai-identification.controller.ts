import { Request, Response } from 'express';
import { AIIdentificationService } from './ai-identification.service';
import { 
  ImageAnalysisRequest, 
  AIProviderType,
  AIProviderConfig 
} from './ai-identification.types';

export class AIIdentificationController {

  // Initialize AI providers with configuration
  static async initializeProviders(req: Request, res: Response): Promise<void> {
    try {
      const config: AIProviderConfig = req.body;
      
      AIIdentificationService.initialize(config);
      
      res.status(200).json({
        success: true,
        message: 'AI providers initialized successfully',
        providers: Object.keys(config)
      });
    } catch (error) {
      console.error('Initialize providers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize AI providers'
      });
    }
  }

  // Analyze image with multiple AI providers
  static async analyzeImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const {
        imageUrl,
        imageBase64,
        prompt,
        context,
        providers = [
          AIProviderType.OPENAI_GPT4_VISION,
          AIProviderType.GOOGLE_GEMINI,
          AIProviderType.PLANTNET
        ],
        options = {}
      } = req.body;

      if (!imageUrl && !imageBase64) {
        res.status(400).json({
          success: false,
          message: 'Either imageUrl or imageBase64 is required'
        });
        return;
      }

      const analysisRequest: ImageAnalysisRequest = {
        imageUrl,
        imageBase64,
        prompt,
        context: {
          ...context,
          userId: req.user.userId
        },
        providers,
        options
      };

      const result = await AIIdentificationService.analyzeImage(analysisRequest);

      res.status(200).json({
        success: true,
        analysis: result,
        message: 'Image analyzed successfully'
      });
    } catch (error) {
      console.error('Analyze image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Quick plant identification (optimized for speed)
  static async quickIdentify(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { imageUrl, imageBase64 } = req.body;

      if (!imageUrl && !imageBase64) {
        res.status(400).json({
          success: false,
          message: 'Image required for identification'
        });
        return;
      }

      // Use only the fastest providers for quick identification
      const analysisRequest: ImageAnalysisRequest = {
        imageUrl,
        imageBase64,
        prompt: 'Quickly identify this plant species',
        providers: [AIProviderType.PLANTNET, AIProviderType.GOOGLE_VISION],
        options: {
          detailLevel: 'basic',
          includeConfidence: true
        }
      };

      const result = await AIIdentificationService.analyzeImage(analysisRequest);

      // Return simplified response for quick identification
      const quickResult = {
        plantIdentification: result.consensus.plantIdentification,
        confidence: result.confidence,
        processingTime: result.processingTime,
        alternatives: result.consensus.plantIdentification?.alternativeMatches
      };

      res.status(200).json({
        success: true,
        identification: quickResult,
        message: 'Plant identified successfully'
      });
    } catch (error) {
      console.error('Quick identify error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to identify plant'
      });
    }
  }

  // Comprehensive health assessment
  static async assessHealth(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { 
        imageUrl, 
        imageBase64, 
        cropType, 
        plantAge, 
        growingSystem,
        previousDiagnoses = [] 
      } = req.body;

      if (!imageUrl && !imageBase64) {
        res.status(400).json({
          success: false,
          message: 'Image required for health assessment'
        });
        return;
      }

      const analysisRequest: ImageAnalysisRequest = {
        imageUrl,
        imageBase64,
        prompt: 'Provide comprehensive health assessment focusing on pest detection, disease diagnosis, and care recommendations',
        context: {
          cropType,
          plantAge,
          growingSystem,
          previousDiagnoses
        },
        providers: [
          AIProviderType.OPENAI_GPT4_VISION,
          AIProviderType.GOOGLE_GEMINI,
          AIProviderType.OPENAI_CHATGPT
        ],
        options: {
          detailLevel: 'expert',
          includeConfidence: true,
          includeTreatment: true,
          includeTimeline: true
        }
      };

      const result = await AIIdentificationService.analyzeImage(analysisRequest);

      res.status(200).json({
        success: true,
        healthAssessment: {
          overallHealth: result.consensus.healthAssessment,
          pests: result.consensus.pestDetection,
          diseases: result.consensus.diseaseDetection,
          recommendations: result.recommendations,
          confidence: result.confidence,
          providerAgreement: result.consensus.agreementScore
        },
        message: 'Health assessment completed'
      });
    } catch (error) {
      console.error('Health assessment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assess plant health'
      });
    }
  }

  // Pest and disease diagnosis
  static async diagnosePestDisease(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { 
        imageUrl, 
        imageBase64, 
        cropType, 
        symptoms = '',
        location = '' 
      } = req.body;

      if (!imageUrl && !imageBase64) {
        res.status(400).json({
          success: false,
          message: 'Image required for diagnosis'
        });
        return;
      }

      const analysisRequest: ImageAnalysisRequest = {
        imageUrl,
        imageBase64,
        prompt: `Diagnose any pests or diseases. ${symptoms ? `Reported symptoms: ${symptoms}` : ''} ${location ? `Location: ${location}` : ''}`,
        context: {
          cropType
        },
        providers: [
          AIProviderType.OPENAI_GPT4_VISION,
          AIProviderType.GOOGLE_GEMINI,
          AIProviderType.OPENAI_CHATGPT
        ],
        options: {
          detailLevel: 'expert',
          includeTreatment: true
        }
      };

      const result = await AIIdentificationService.analyzeImage(analysisRequest);

      res.status(200).json({
        success: true,
        diagnosis: {
          pests: result.consensus.pestDetection || [],
          diseases: result.consensus.diseaseDetection || [],
          treatmentPlans: result.recommendations.filter(r => 
            r.category === 'pest_control' || r.category === 'disease_treatment'
          ),
          confidence: result.confidence,
          urgency: this.assessUrgency(result.consensus.pestDetection, result.consensus.diseaseDetection)
        },
        message: 'Diagnosis completed'
      });
    } catch (error) {
      console.error('Pest/Disease diagnosis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to diagnose pests or diseases'
      });
    }
  }

  // Growth stage analysis
  static async analyzeGrowth(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { 
        imageUrl, 
        imageBase64, 
        cropType, 
        plantingDate,
        expectedHarvestDate,
        growthHistory = [] 
      } = req.body;

      if (!imageUrl && !imageBase64) {
        res.status(400).json({
          success: false,
          message: 'Image required for growth analysis'
        });
        return;
      }

      const plantAge = plantingDate ? 
        Math.floor((Date.now() - new Date(plantingDate).getTime()) / (1000 * 60 * 60 * 24)) : 
        undefined;

      const analysisRequest: ImageAnalysisRequest = {
        imageUrl,
        imageBase64,
        prompt: 'Analyze growth stage, development rate, and provide harvest timing predictions',
        context: {
          cropType,
          plantAge,
          growthHistory
        },
        providers: [
          AIProviderType.OPENAI_GPT4_VISION,
          AIProviderType.GOOGLE_GEMINI
        ],
        options: {
          detailLevel: 'detailed',
          includeTimeline: true
        }
      };

      const result = await AIIdentificationService.analyzeImage(analysisRequest);

      res.status(200).json({
        success: true,
        growthAnalysis: {
          currentStage: result.consensus.growthAnalysis?.stage,
          developmentRate: result.consensus.growthAnalysis?.developmentRate,
          harvestPrediction: this.calculateHarvestPrediction(plantAge, expectedHarvestDate),
          recommendations: result.recommendations.filter(r => 
            r.category === 'harvesting' || r.category === 'monitoring'
          ),
          confidence: result.confidence
        },
        message: 'Growth analysis completed'
      });
    } catch (error) {
      console.error('Growth analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze growth'
      });
    }
  }

  // Get analysis history
  static async getAnalysisHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await AIIdentificationService.getAnalysisHistory(limit);

      // Filter by user if needed (for multi-tenant systems)
      const userHistory = history.filter(analysis => 
        analysis.request.context?.userId === req.user?.userId
      );

      res.status(200).json({
        success: true,
        history: userHistory.map(analysis => ({
          id: analysis.id,
          timestamp: analysis.timestamp,
          imageUrl: analysis.imageUrl,
          providers: analysis.request.providers,
          confidence: analysis.confidence,
          plantIdentification: analysis.consensus.plantIdentification,
          issues: [
            ...(analysis.consensus.pestDetection || []),
            ...(analysis.consensus.diseaseDetection || [])
          ].length,
          processingTime: analysis.processingTime
        })),
        count: userHistory.length
      });
    } catch (error) {
      console.error('Get analysis history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analysis history'
      });
    }
  }

  // Get specific analysis result
  static async getAnalysisResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await AIIdentificationService.getAnalysisResult(id);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Analysis result not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        analysis: result
      });
    } catch (error) {
      console.error('Get analysis result error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analysis result'
      });
    }
  }

  // Compare multiple images for growth tracking
  static async compareImages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { images, cropType, comparisonType = 'growth' } = req.body;

      if (!images || images.length < 2) {
        res.status(400).json({
          success: false,
          message: 'At least 2 images required for comparison'
        });
        return;
      }

      // Analyze each image
      const analysisPromises = images.map(async (img: any, index: number) => {
        const request: ImageAnalysisRequest = {
          imageUrl: img.imageUrl,
          imageBase64: img.imageBase64,
          prompt: `Analyze for ${comparisonType} comparison - Image ${index + 1}`,
          context: {
            cropType,
            plantAge: img.plantAge,
            captureDate: img.captureDate
          },
          providers: [AIProviderType.OPENAI_GPT4_VISION, AIProviderType.GOOGLE_GEMINI]
        };

        return await AIIdentificationService.analyzeImage(request);
      });

      const results = await Promise.all(analysisPromises);

      // Generate comparison analysis
      const comparison = this.generateComparison(results, comparisonType);

      res.status(200).json({
        success: true,
        comparison,
        individualAnalyses: results.map(r => ({
          id: r.id,
          timestamp: r.timestamp,
          confidence: r.confidence,
          healthScore: r.consensus.healthAssessment?.overallHealth,
          growthStage: r.consensus.growthAnalysis?.stage
        })),
        message: 'Image comparison completed'
      });
    } catch (error) {
      console.error('Compare images error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare images'
      });
    }
  }

  // Private helper methods
  private static assessUrgency(pests: any[] = [], diseases: any[] = []): 'low' | 'medium' | 'high' | 'critical' {
    const issues = [...pests, ...diseases];
    
    if (issues.some(issue => issue.severity === 'severe')) {
      return 'critical';
    } else if (issues.some(issue => issue.severity === 'high')) {
      return 'high';
    } else if (issues.length > 0) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private static calculateHarvestPrediction(plantAge?: number, expectedHarvestDate?: string) {
    if (!plantAge || !expectedHarvestDate) {
      return {
        estimatedDays: 'Unknown',
        confidence: 'Low'
      };
    }

    const expected = new Date(expectedHarvestDate);
    const today = new Date();
    const daysToHarvest = Math.floor((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      estimatedDays: Math.max(0, daysToHarvest),
      confidence: 'Medium',
      status: daysToHarvest <= 7 ? 'harvest_soon' : daysToHarvest <= 0 ? 'ready' : 'growing'
    };
  }

  private static generateComparison(results: any[], comparisonType: string) {
    if (results.length < 2) return null;

    const first = results[0];
    const last = results[results.length - 1];

    // Health score comparison
    const firstHealth = first.consensus.healthAssessment?.overallHealth || 0;
    const lastHealth = last.consensus.healthAssessment?.overallHealth || 0;
    const healthChange = lastHealth - firstHealth;

    // Growth stage progression
    const growthStages = ['seedling', 'vegetative', 'flowering', 'fruiting', 'mature'];
    const firstStage = first.consensus.growthAnalysis?.stage;
    const lastStage = last.consensus.growthAnalysis?.stage;
    
    const stageProgression = firstStage && lastStage ? 
      growthStages.indexOf(lastStage) - growthStages.indexOf(firstStage) : 0;

    return {
      type: comparisonType,
      timespan: {
        start: first.timestamp,
        end: last.timestamp,
        days: Math.floor((last.timestamp - first.timestamp) / (1000 * 60 * 60 * 24))
      },
      healthProgression: {
        change: healthChange,
        trend: healthChange > 5 ? 'improving' : healthChange < -5 ? 'declining' : 'stable',
        startScore: firstHealth,
        endScore: lastHealth
      },
      growthProgression: {
        stageChange: stageProgression,
        trend: stageProgression > 0 ? 'advancing' : stageProgression < 0 ? 'regressing' : 'stable',
        startStage: firstStage,
        endStage: lastStage
      },
      recommendations: this.generateProgressionRecommendations(healthChange, stageProgression)
    };
  }

  private static generateProgressionRecommendations(healthChange: number, stageProgression: number): any[] {
    const recommendations = [];

    if (healthChange < -10) {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        title: 'Health Declining',
        description: 'Plant health has declined significantly. Immediate intervention required.',
        action: 'Review watering, nutrients, lighting, and check for pests/diseases'
      });
    } else if (healthChange > 10) {
      recommendations.push({
        type: 'preventive',
        priority: 'low',
        title: 'Health Improving',
        description: 'Plant health is improving. Continue current care routine.',
        action: 'Maintain current watering and feeding schedule'
      });
    }

    if (stageProgression === 0) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        title: 'Growth Stage Static',
        description: 'Plant has not progressed to next growth stage as expected.',
        action: 'Review environmental conditions and nutritional requirements'
      });
    }

    return recommendations;
  }
}