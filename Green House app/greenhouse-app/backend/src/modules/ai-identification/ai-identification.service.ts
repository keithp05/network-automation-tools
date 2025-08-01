import axios from 'axios';
import FormData from 'form-data';
import {
  AIProvider,
  AIProviderType,
  AIAnalysisResult,
  ImageAnalysisRequest,
  CombinedAnalysisResult,
  PlantIdentification,
  PestDetection,
  DiseaseDetection,
  HealthAssessment,
  GrowthAnalysis,
  Recommendation,
  ConsensusResult,
  AIProviderConfig
} from './ai-identification.types';

export class AIIdentificationService {
  private static config: AIProviderConfig;
  private static results: Map<string, CombinedAnalysisResult> = new Map();

  static initialize(config: AIProviderConfig) {
    this.config = config;
  }

  // Main analysis function that coordinates multiple AI providers
  static async analyzeImage(request: ImageAnalysisRequest): Promise<CombinedAnalysisResult> {
    const analysisId = this.generateId();
    const startTime = Date.now();
    
    console.log(`Starting multi-AI analysis for request ${analysisId}`);
    
    try {
      // Run analyses in parallel for faster results
      const analysisPromises = request.providers.map(provider => 
        this.runProviderAnalysis(provider, request)
      );
      
      const results = await Promise.allSettled(analysisPromises);
      const successfulResults: AIAnalysisResult[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          console.error(`Provider ${request.providers[index]} failed:`, result.reason);
        }
      });

      // Generate consensus from all successful results
      const consensus = this.generateConsensus(successfulResults);
      
      // Generate unified recommendations
      const recommendations = this.generateUnifiedRecommendations(consensus, request.context);
      
      const combinedResult: CombinedAnalysisResult = {
        id: analysisId,
        timestamp: new Date(),
        imageUrl: request.imageUrl || 'base64-image',
        request,
        results: successfulResults,
        consensus,
        confidence: this.calculateOverallConfidence(successfulResults),
        processingTime: Date.now() - startTime,
        recommendations
      };

      // Store result for future reference
      this.results.set(analysisId, combinedResult);
      
      return combinedResult;
      
    } catch (error) {
      console.error('Multi-AI analysis failed:', error);
      throw new Error('Failed to analyze image with AI providers');
    }
  }

  // Google Vision API integration
  private static async analyzeWithGoogleVision(request: ImageAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${this.config.googleVision.apiKey}`;
      
      const requestBody = {
        requests: [{
          image: request.imageBase64 
            ? { content: request.imageBase64 }
            : { source: { imageUri: request.imageUrl } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'TEXT_DETECTION' },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
            { type: 'IMAGE_PROPERTIES' }
          ]
        }]
      };

      const response = await axios.post(visionUrl, requestBody);
      const visionResult = response.data.responses[0];
      
      // Convert Google Vision results to our format
      const analysisResult = this.convertGoogleVisionResult(visionResult, request);
      
      return {
        provider: AIProviderType.GOOGLE_VISION,
        timestamp: new Date(),
        confidence: analysisResult.confidence || 0.7,
        processingTime: Date.now() - startTime,
        result: analysisResult,
        rawResponse: visionResult
      };
      
    } catch (error) {
      console.error('Google Vision API error:', error);
      throw new Error('Google Vision analysis failed');
    }
  }

  // Google Gemini AI integration
  private static async analyzeWithGemini(request: ImageAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.googleGemini.model}:generateContent?key=${this.config.googleGemini.apiKey}`;
      
      const prompt = this.buildGeminiPrompt(request);
      
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            request.imageBase64 ? {
              inline_data: {
                mime_type: "image/jpeg",
                data: request.imageBase64
              }
            } : {
              file_data: {
                file_uri: request.imageUrl
              }
            }
          ]
        }],
        generationConfig: {
          maxOutputTokens: this.config.googleGemini.maxTokens || 2048,
          temperature: 0.3
        }
      };

      const response = await axios.post(geminiUrl, requestBody);
      const geminiResult = response.data;
      
      // Parse Gemini's structured response
      const analysisResult = this.parseGeminiResponse(geminiResult.candidates[0].content.parts[0].text, request);
      
      return {
        provider: AIProviderType.GOOGLE_GEMINI,
        timestamp: new Date(),
        confidence: analysisResult.confidence || 0.8,
        processingTime: Date.now() - startTime,
        result: analysisResult,
        rawResponse: geminiResult
      };
      
    } catch (error) {
      console.error('Google Gemini API error:', error);
      throw new Error('Gemini analysis failed');
    }
  }

  // OpenAI GPT-4 Vision integration
  private static async analyzeWithOpenAIVision(request: ImageAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const openaiUrl = 'https://api.openai.com/v1/chat/completions';
      
      const prompt = this.buildOpenAIVisionPrompt(request);
      
      const requestBody = {
        model: this.config.openAI.model || 'gpt-4-vision-preview',
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: request.imageBase64 
                  ? `data:image/jpeg;base64,${request.imageBase64}`
                  : request.imageUrl
              }
            }
          ]
        }],
        max_tokens: this.config.openAI.maxTokens || 2048,
        temperature: 0.3
      };

      const response = await axios.post(openaiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.config.openAI.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const openaiResult = response.data;
      
      // Parse OpenAI's response
      const analysisResult = this.parseOpenAIResponse(openaiResult.choices[0].message.content, request);
      
      return {
        provider: AIProviderType.OPENAI_GPT4_VISION,
        timestamp: new Date(),
        confidence: analysisResult.confidence || 0.85,
        processingTime: Date.now() - startTime,
        result: analysisResult,
        rawResponse: openaiResult
      };
      
    } catch (error) {
      console.error('OpenAI Vision API error:', error);
      throw new Error('OpenAI Vision analysis failed');
    }
  }

  // ChatGPT integration for comprehensive plant advice
  private static async analyzeWithChatGPT(request: ImageAnalysisRequest, imageAnalysisResults?: any): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const openaiUrl = 'https://api.openai.com/v1/chat/completions';
      
      const prompt = this.buildChatGPTPrompt(request, imageAnalysisResults);
      
      const requestBody = {
        model: 'gpt-4',
        messages: [{
          role: "system",
          content: "You are an expert botanist and plant pathologist with decades of experience in plant identification, pest management, disease diagnosis, and greenhouse growing. Provide detailed, actionable advice."
        }, {
          role: "user", 
          content: prompt
        }],
        max_tokens: 2048,
        temperature: 0.3
      };

      const response = await axios.post(openaiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.config.openAI.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const chatGPTResult = response.data;
      
      // Parse ChatGPT's response for recommendations
      const analysisResult = this.parseChatGPTResponse(chatGPTResult.choices[0].message.content, request);
      
      return {
        provider: AIProviderType.OPENAI_CHATGPT,
        timestamp: new Date(),
        confidence: 0.9,
        processingTime: Date.now() - startTime,
        result: analysisResult,
        rawResponse: chatGPTResult
      };
      
    } catch (error) {
      console.error('ChatGPT API error:', error);
      throw new Error('ChatGPT analysis failed');
    }
  }

  // PlantNet API integration for plant identification
  private static async analyzeWithPlantNet(request: ImageAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const plantNetUrl = `https://my-api.plantnet.org/v1/identify/${this.config.plantNet.project}`;
      
      const formData = new FormData();
      
      if (request.imageBase64) {
        const buffer = Buffer.from(request.imageBase64, 'base64');
        formData.append('images', buffer, 'plant.jpg');
      } else if (request.imageUrl) {
        const imageResponse = await axios.get(request.imageUrl, { responseType: 'stream' });
        formData.append('images', imageResponse.data);
      }
      
      formData.append('organs', 'leaf');
      formData.append('organs', 'flower');
      formData.append('organs', 'fruit');
      
      const config = {
        headers: {
          ...formData.getHeaders(),
          'Api-Key': this.config.plantNet.apiKey
        }
      };

      const response = await axios.post(plantNetUrl, formData, config);
      const plantNetResult = response.data;
      
      // Convert PlantNet results to our format
      const analysisResult = this.convertPlantNetResult(plantNetResult, request);
      
      return {
        provider: AIProviderType.PLANTNET,
        timestamp: new Date(),
        confidence: analysisResult.confidence || 0.75,
        processingTime: Date.now() - startTime,
        result: analysisResult,
        rawResponse: plantNetResult
      };
      
    } catch (error) {
      console.error('PlantNet API error:', error);
      throw new Error('PlantNet analysis failed');
    }
  }

  // Provider-specific analysis dispatcher
  private static async runProviderAnalysis(provider: AIProviderType, request: ImageAnalysisRequest): Promise<AIAnalysisResult> {
    switch (provider) {
      case AIProviderType.GOOGLE_VISION:
        return await this.analyzeWithGoogleVision(request);
      case AIProviderType.GOOGLE_GEMINI:
        return await this.analyzeWithGemini(request);
      case AIProviderType.OPENAI_GPT4_VISION:
        return await this.analyzeWithOpenAIVision(request);
      case AIProviderType.OPENAI_CHATGPT:
        return await this.analyzeWithChatGPT(request);
      case AIProviderType.PLANTNET:
        return await this.analyzeWithPlantNet(request);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  // Prompt builders for different AI providers
  private static buildGeminiPrompt(request: ImageAnalysisRequest): string {
    const context = request.context;
    
    return `As an expert botanist and plant pathologist, analyze this plant image and provide a comprehensive assessment in JSON format.

Context: ${context ? JSON.stringify(context) : 'No additional context provided'}

Please analyze the image for:
1. Plant identification (species, common name, scientific name)
2. Health assessment (overall health score 0-100, stress factors)
3. Pest detection (if any pests are visible)
4. Disease diagnosis (if any diseases are apparent)
5. Growth analysis (growth stage, development rate)
6. Care recommendations (immediate actions needed)

Provide your response in the following JSON structure:
{
  "plantIdentification": {
    "species": "string",
    "commonName": "string", 
    "scientificName": "string",
    "confidence": 0.0-1.0,
    "characteristics": ["list", "of", "identifying", "features"]
  },
  "healthAssessment": {
    "overallHealth": 0-100,
    "stressFactors": [{"type": "string", "severity": "low|moderate|high", "indicators": ["symptoms"]}]
  },
  "pestDetection": [{"pestType": "string", "confidence": 0.0-1.0, "severity": "low|moderate|high|severe"}],
  "diseaseDetection": [{"diseaseType": "string", "pathogen": "fungal|bacterial|viral", "confidence": 0.0-1.0}],
  "growthAnalysis": {
    "stage": "seedling|vegetative|flowering|fruiting|mature",
    "developmentRate": "slow|normal|fast"
  },
  "recommendations": [{"action": "string", "priority": "low|medium|high|critical", "timeline": "string"}],
  "confidence": 0.0-1.0
}`;
  }

  private static buildOpenAIVisionPrompt(request: ImageAnalysisRequest): string {
    const context = request.context;
    
    return `You are an expert botanist and plant pathologist. Analyze this plant image comprehensively.

${context ? `Context: This is a ${context.cropType || 'unknown crop'} that is ${context.plantAge || 'unknown'} days old, growing in a ${context.growingSystem || 'unknown'} system.` : ''}

Please provide a detailed analysis including:

1. **Plant Identification**: Species, common name, scientific classification
2. **Health Assessment**: Overall health score (0-100), visible stress factors
3. **Pest Detection**: Any visible pests, their severity and recommended treatment
4. **Disease Diagnosis**: Any diseases, pathogens, symptoms and treatment plans
5. **Growth Analysis**: Current growth stage, development rate, projections
6. **Immediate Recommendations**: Priority actions needed in the next 24-48 hours
7. **Long-term Care**: Ongoing care recommendations for optimal health

Format your response as a detailed analysis with clear sections. Be specific about:
- Confidence levels for your identifications
- Severity ratings for any issues found
- Specific treatment products or methods
- Timelines for recommended actions
- Expected outcomes with proper care

Focus on actionable, practical advice for a greenhouse grower.`;
  }

  private static buildChatGPTPrompt(request: ImageAnalysisRequest, imageAnalysisResults?: any): string {
    const context = request.context;
    
    let prompt = `I need comprehensive plant care advice based on the following information:

${context ? `Plant Context:
- Crop Type: ${context.cropType || 'Unknown'}
- Plant Age: ${context.plantAge || 'Unknown'} days
- Growing System: ${context.growingSystem || 'Unknown'}
- Location: ${context.location || 'Unknown'}
- Season: ${context.season || 'Unknown'}` : ''}

${imageAnalysisResults ? `
Image Analysis Results:
${JSON.stringify(imageAnalysisResults, null, 2)}` : ''}

Please provide expert advice on:

1. **Immediate Actions**: What should I do in the next 24-48 hours?
2. **Treatment Plans**: Specific products, dosages, and application methods
3. **Prevention Strategies**: How to prevent future issues
4. **Growth Optimization**: How to maximize plant health and yield
5. **Timeline Expectations**: When should I see improvements?
6. **Cost Considerations**: Budget-friendly vs. premium treatment options
7. **Organic Alternatives**: Natural/organic treatment options
8. **Monitoring Plan**: What to watch for and how often to check

Be specific about:
- Product names and application rates
- Timing and frequency of treatments
- Expected results and timelines
- Warning signs to watch for
- Follow-up actions needed

Assume I'm growing in a controlled greenhouse environment with access to most commercial products.`;

    return prompt;
  }

  // Result parsers for different AI providers
  private static convertGoogleVisionResult(visionResult: any, request: ImageAnalysisRequest): any {
    const labels = visionResult.labelAnnotations || [];
    const objects = visionResult.localizedObjectAnnotations || [];
    
    // Extract plant-related information from labels
    const plantLabels = labels.filter((label: any) => 
      label.description.toLowerCase().includes('plant') ||
      label.description.toLowerCase().includes('leaf') ||
      label.description.toLowerCase().includes('flower') ||
      label.description.toLowerCase().includes('crop')
    );

    return {
      plantIdentification: plantLabels.length > 0 ? {
        species: plantLabels[0].description,
        commonName: plantLabels[0].description,
        confidence: plantLabels[0].score,
        characteristics: plantLabels.slice(0, 5).map((l: any) => l.description)
      } : undefined,
      healthAssessment: {
        overallHealth: 75, // Default score
        stressFactors: []
      },
      confidence: plantLabels.length > 0 ? plantLabels[0].score : 0.5
    };
  }

  private static parseGeminiResponse(response: string, request: ImageAnalysisRequest): any {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse Gemini JSON response:', error);
    }
    
    // Fallback to text parsing
    return this.parseTextResponse(response);
  }

  private static parseOpenAIResponse(response: string, request: ImageAnalysisRequest): any {
    // OpenAI typically returns structured text, parse key information
    return this.parseTextResponse(response);
  }

  private static parseChatGPTResponse(response: string, request: ImageAnalysisRequest): any {
    return {
      recommendations: this.extractRecommendationsFromText(response),
      summary: response,
      confidence: 0.9
    };
  }

  private static convertPlantNetResult(plantNetResult: any, request: ImageAnalysisRequest): any {
    const species = plantNetResult.results || [];
    
    if (species.length === 0) {
      return { confidence: 0 };
    }

    const topMatch = species[0];
    
    return {
      plantIdentification: {
        species: topMatch.species.scientificNameWithoutAuthor,
        commonName: topMatch.species.commonNames?.[0] || topMatch.species.scientificNameWithoutAuthor,
        scientificName: topMatch.species.scientificNameWithoutAuthor,
        confidence: topMatch.score,
        family: topMatch.species.family?.scientificNameWithoutAuthor,
        genus: topMatch.species.genus?.scientificNameWithoutAuthor,
        characteristics: [],
        alternativeMatches: species.slice(1, 4).map((s: any) => ({
          species: s.species.scientificNameWithoutAuthor,
          commonName: s.species.commonNames?.[0] || s.species.scientificNameWithoutAuthor,
          confidence: s.score
        }))
      },
      confidence: topMatch.score
    };
  }

  // Helper methods for parsing and consensus
  private static parseTextResponse(text: string): any {
    // Extract key information from unstructured text
    const recommendations = this.extractRecommendationsFromText(text);
    const health = this.extractHealthFromText(text);
    const pests = this.extractPestsFromText(text);
    const diseases = this.extractDiseasesFromText(text);
    
    return {
      healthAssessment: health,
      pestDetection: pests,
      diseaseDetection: diseases,
      recommendations,
      summary: text,
      confidence: 0.7
    };
  }

  private static extractRecommendationsFromText(text: string): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Look for action items in the text
    const actionPatterns = [
      /immediate[ly]?\s*:?\s*(.+?)(?:\.|$)/gi,
      /should\s+(.+?)(?:\.|$)/gi,
      /recommend\s+(.+?)(?:\.|$)/gi,
      /treat\s+with\s+(.+?)(?:\.|$)/gi,
      /apply\s+(.+?)(?:\.|$)/gi
    ];

    actionPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          recommendations.push({
            type: 'immediate',
            priority: 'medium',
            category: 'monitoring',
            title: 'AI Recommendation',
            description: match[1].trim(),
            action: match[1].trim(),
            timeline: 'As soon as possible',
            expectedBenefit: 'Improved plant health',
            confidence: 0.7
          });
        }
      }
    });

    return recommendations;
  }

  private static extractHealthFromText(text: string): any {
    const healthKeywords = ['healthy', 'stress', 'disease', 'pest', 'damage'];
    let healthScore = 75; // Default
    
    if (text.toLowerCase().includes('excellent') || text.toLowerCase().includes('very healthy')) {
      healthScore = 90;
    } else if (text.toLowerCase().includes('poor') || text.toLowerCase().includes('severely')) {
      healthScore = 30;
    } else if (text.toLowerCase().includes('moderate') || text.toLowerCase().includes('some issues')) {
      healthScore = 60;
    }

    return {
      overallHealth: healthScore,
      stressFactors: [],
      prognosis: 'Monitoring recommended'
    };
  }

  private static extractPestsFromText(text: string): PestDetection[] {
    const pestKeywords = ['aphid', 'spider mite', 'whitefly', 'thrip', 'scale', 'mealybug'];
    const pests: PestDetection[] = [];
    
    pestKeywords.forEach(pest => {
      if (text.toLowerCase().includes(pest)) {
        pests.push({
          pestType: pest,
          commonName: pest,
          confidence: 0.7,
          severity: 'moderate',
          location: { area: 'leaves' },
          characteristics: [],
          damage: {
            currentDamage: 20,
            projectedDamage: 40,
            economicImpact: 'moderate',
            reversible: true
          },
          treatment: {
            immediate: [],
            shortTerm: [],
            longTerm: [],
            organic: true,
            cost: { materials: 0, labor: 0, total: 0, currency: 'USD', confidence: 0.5 },
            effectiveness: 80
          },
          prevention: {
            cultural: [],
            biological: [],
            chemical: [],
            monitoring: [],
            frequency: 'weekly'
          }
        });
      }
    });
    
    return pests;
  }

  private static extractDiseasesFromText(text: string): DiseaseDetection[] {
    const diseaseKeywords = ['blight', 'mildew', 'rust', 'rot', 'wilt', 'mosaic', 'spot'];
    const diseases: DiseaseDetection[] = [];
    
    diseaseKeywords.forEach(disease => {
      if (text.toLowerCase().includes(disease)) {
        diseases.push({
          diseaseType: disease,
          pathogen: 'fungal',
          commonName: disease,
          confidence: 0.7,
          severity: 'moderate',
          location: { area: 'leaves' },
          symptoms: [],
          progression: {
            stage: 'developing',
            spreadRate: 'moderate'
          },
          treatment: {
            immediate: [],
            shortTerm: [],
            longTerm: [],
            organic: true,
            cost: { materials: 0, labor: 0, total: 0, currency: 'USD', confidence: 0.5 },
            effectiveness: 75
          },
          prognosis: {
            outcome: 'good',
            recoveryTime: 14
          }
        });
      }
    });
    
    return diseases;
  }

  // Consensus generation from multiple AI results
  private static generateConsensus(results: AIAnalysisResult[]): ConsensusResult {
    if (results.length === 0) {
      return { agreementScore: 0 };
    }

    // Aggregate plant identifications
    const plantIds = results
      .map(r => r.result.plantIdentification)
      .filter(Boolean);
    
    // Aggregate health assessments
    const healthAssessments = results
      .map(r => r.result.healthAssessment)
      .filter(Boolean);
    
    // Aggregate pest detections
    const pestDetections = results
      .flatMap(r => r.result.pestDetection || []);
    
    // Aggregate disease detections  
    const diseaseDetections = results
      .flatMap(r => r.result.diseaseDetection || []);

    // Calculate agreement score based on consensus
    const agreementScore = this.calculateAgreementScore(results);

    return {
      plantIdentification: this.consensusPlantIdentification(plantIds),
      healthAssessment: this.consensusHealthAssessment(healthAssessments),
      pestDetection: this.consensusPestDetection(pestDetections),
      diseaseDetection: this.consensusDiseaseDetection(diseaseDetections),
      agreementScore
    };
  }

  private static consensusPlantIdentification(identifications: any[]): PlantIdentification | undefined {
    if (identifications.length === 0) return undefined;
    
    // For now, return the identification with highest confidence
    // In production, implement more sophisticated consensus logic
    const best = identifications.reduce((prev, current) => 
      (current.confidence > prev.confidence) ? current : prev
    );
    
    return best;
  }

  private static consensusHealthAssessment(assessments: any[]): HealthAssessment | undefined {
    if (assessments.length === 0) return undefined;
    
    // Average health scores and combine stress factors
    const avgHealth = assessments.reduce((sum, a) => sum + (a.overallHealth || 0), 0) / assessments.length;
    const allStressFactors = assessments.flatMap(a => a.stressFactors || []);
    
    return {
      overallHealth: Math.round(avgHealth),
      stressFactors: allStressFactors,
      nutritionalStatus: {
        nitrogen: 'adequate',
        phosphorus: 'adequate', 
        potassium: 'adequate',
        micronutrients: [],
        recommendations: []
      },
      environmentalFactors: {
        light: { intensity: 'adequate', duration: 12, spectrum: 'full', recommendations: [] },
        temperature: { current: 72, optimal: { min: 65, max: 80, optimal: 72, unit: 'fahrenheit' }, stress: false, recommendations: [] },
        humidity: { current: 60, optimal: { min: 50, max: 70, optimal: 60 }, issues: [], recommendations: [] },
        airflow: { circulation: 'adequate', issues: [], recommendations: [] }
      },
      recommendations: [],
      prognosis: 'Good with proper care'
    };
  }

  private static consensusPestDetection(detections: PestDetection[]): PestDetection[] {
    // Remove duplicates and combine similar detections
    const uniquePests = new Map<string, PestDetection>();
    
    detections.forEach(pest => {
      const key = pest.pestType.toLowerCase();
      if (!uniquePests.has(key) || pest.confidence > uniquePests.get(key)!.confidence) {
        uniquePests.set(key, pest);
      }
    });
    
    return Array.from(uniquePests.values());
  }

  private static consensusDiseaseDetection(detections: DiseaseDetection[]): DiseaseDetection[] {
    // Remove duplicates and combine similar detections
    const uniqueDiseases = new Map<string, DiseaseDetection>();
    
    detections.forEach(disease => {
      const key = disease.diseaseType.toLowerCase();
      if (!uniqueDiseases.has(key) || disease.confidence > uniqueDiseases.get(key)!.confidence) {
        uniqueDiseases.set(key, disease);
      }
    });
    
    return Array.from(uniqueDiseases.values());
  }

  private static calculateAgreementScore(results: AIAnalysisResult[]): number {
    if (results.length < 2) return 1.0;
    
    // Simple agreement calculation based on confidence overlap
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const confidenceVariance = results.reduce((sum, r) => sum + Math.pow(r.confidence - avgConfidence, 2), 0) / results.length;
    
    // Lower variance = higher agreement
    return Math.max(0, 1 - confidenceVariance);
  }

  private static calculateOverallConfidence(results: AIAnalysisResult[]): number {
    if (results.length === 0) return 0;
    
    const weightedSum = results.reduce((sum, result) => {
      // Weight by provider reliability
      const providerWeight = this.getProviderWeight(result.provider);
      return sum + (result.confidence * providerWeight);
    }, 0);
    
    const totalWeight = results.reduce((sum, result) => 
      sum + this.getProviderWeight(result.provider), 0
    );
    
    return weightedSum / totalWeight;
  }

  private static getProviderWeight(provider: AIProviderType): number {
    // Assign weights based on provider reliability for different tasks
    const weights = {
      [AIProviderType.OPENAI_GPT4_VISION]: 0.9,
      [AIProviderType.GOOGLE_GEMINI]: 0.85,
      [AIProviderType.PLANTNET]: 0.8,
      [AIProviderType.GOOGLE_VISION]: 0.75,
      [AIProviderType.OPENAI_CHATGPT]: 0.95, // High for recommendations
      [AIProviderType.CUSTOM_MODEL]: 0.7
    };
    
    return weights[provider] || 0.5;
  }

  // Generate unified recommendations from consensus
  private static generateUnifiedRecommendations(consensus: ConsensusResult, context?: any): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Health-based recommendations
    if (consensus.healthAssessment && consensus.healthAssessment.overallHealth < 70) {
      recommendations.push({
        type: 'immediate',
        priority: 'high',
        category: 'monitoring',
        title: 'Health Assessment Required',
        description: `Plant health score is ${consensus.healthAssessment.overallHealth}%. Immediate attention needed.`,
        action: 'Conduct thorough inspection of plant conditions, check water, nutrients, and environmental factors',
        timeline: 'Within 24 hours',
        expectedBenefit: 'Prevent further health decline and identify specific issues',
        confidence: 0.9
      });
    }

    // Pest-based recommendations
    if (consensus.pestDetection && consensus.pestDetection.length > 0) {
      consensus.pestDetection.forEach(pest => {
        recommendations.push({
          type: 'immediate',
          priority: pest.severity === 'severe' ? 'critical' : 'high',
          category: 'pest_control',
          title: `${pest.commonName} Treatment`,
          description: `${pest.pestType} detected with ${pest.severity} severity`,
          action: 'Apply appropriate organic or chemical treatment based on severity and plant type',
          timeline: 'Within 48 hours',
          expectedBenefit: 'Eliminate pest infestation and prevent spread',
          confidence: pest.confidence
        });
      });
    }

    // Disease-based recommendations
    if (consensus.diseaseDetection && consensus.diseaseDetection.length > 0) {
      consensus.diseaseDetection.forEach(disease => {
        recommendations.push({
          type: 'immediate',
          priority: disease.severity === 'severe' ? 'critical' : 'high',
          category: 'disease_treatment',
          title: `${disease.commonName} Treatment`,
          description: `${disease.diseaseType} (${disease.pathogen}) detected`,
          action: 'Apply fungicide or appropriate treatment, improve air circulation, adjust watering schedule',
          timeline: 'Immediately',
          expectedBenefit: 'Stop disease progression and save the plant',
          confidence: disease.confidence
        });
      });
    }

    return recommendations;
  }

  // Utility methods
  static async getAnalysisResult(id: string): Promise<CombinedAnalysisResult | null> {
    return this.results.get(id) || null;
  }

  static async getAnalysisHistory(limit = 50): Promise<CombinedAnalysisResult[]> {
    return Array.from(this.results.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}