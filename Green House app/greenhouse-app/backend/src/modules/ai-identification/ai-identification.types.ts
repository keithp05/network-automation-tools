export interface AIProvider {
  name: string;
  type: 'vision' | 'text' | 'multimodal';
  capabilities: AICapability[];
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
}

export enum AICapability {
  PLANT_IDENTIFICATION = 'plant_identification',
  PEST_DETECTION = 'pest_detection',
  DISEASE_DIAGNOSIS = 'disease_diagnosis',
  HEALTH_ASSESSMENT = 'health_assessment',
  GROWTH_ANALYSIS = 'growth_analysis',
  HARVEST_TIMING = 'harvest_timing',
  CARE_RECOMMENDATIONS = 'care_recommendations',
  COMPANION_PLANTING = 'companion_planting',
  PROBLEM_SOLVING = 'problem_solving'
}

export interface ImageAnalysisRequest {
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
  context?: AnalysisContext;
  providers: AIProviderType[];
  options?: AnalysisOptions;
}

export interface AnalysisContext {
  cropType?: string;
  plantAge?: number;
  growingSystem?: string;
  location?: string;
  season?: string;
  previousDiagnoses?: PreviousDiagnosis[];
  growthHistory?: GrowthMeasurement[];
}

export interface AnalysisOptions {
  includeConfidence?: boolean;
  includeTreatment?: boolean;
  includeTimeline?: boolean;
  language?: string;
  detailLevel?: 'basic' | 'detailed' | 'expert';
}

export enum AIProviderType {
  GOOGLE_VISION = 'google_vision',
  GOOGLE_GEMINI = 'google_gemini',
  OPENAI_GPT4_VISION = 'openai_gpt4_vision',
  OPENAI_CHATGPT = 'openai_chatgpt',
  PLANTNET = 'plantnet',
  CUSTOM_MODEL = 'custom_model'
}

export interface AIAnalysisResult {
  provider: AIProviderType;
  timestamp: Date;
  confidence: number;
  processingTime: number;
  result: AnalysisResult;
  rawResponse?: any;
  error?: string;
}

export interface AnalysisResult {
  plantIdentification?: PlantIdentification;
  pestDetection?: PestDetection[];
  diseaseDetection?: DiseaseDetection[];
  healthAssessment?: HealthAssessment;
  growthAnalysis?: GrowthAnalysis;
  recommendations?: Recommendation[];
  summary?: string;
}

export interface PlantIdentification {
  species: string;
  commonName: string;
  scientificName: string;
  confidence: number;
  family?: string;
  genus?: string;
  characteristics: string[];
  careRequirements: CareRequirements;
  alternativeMatches?: AlternativeMatch[];
}

export interface AlternativeMatch {
  species: string;
  commonName: string;
  confidence: number;
}

export interface CareRequirements {
  sunlight: 'full' | 'partial' | 'shade';
  water: 'low' | 'moderate' | 'high';
  soilType: string[];
  temperature: TemperatureRange;
  humidity: HumidityRange;
  fertilizer: FertilizerRequirements;
  spacing: number; // inches
  harvestTime: number; // days from planting
}

export interface TemperatureRange {
  min: number;
  max: number;
  optimal: number;
  unit: 'fahrenheit' | 'celsius';
}

export interface HumidityRange {
  min: number;
  max: number;
  optimal: number;
}

export interface FertilizerRequirements {
  npk: string; // e.g., "10-10-10"
  frequency: string; // e.g., "weekly", "monthly"
  organicOptions: string[];
}

export interface PestDetection {
  pestType: string;
  commonName: string;
  scientificName?: string;
  confidence: number;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  location: DetectionLocation;
  characteristics: string[];
  damage: DamageAssessment;
  treatment: TreatmentPlan;
  prevention: PreventionMeasures;
}

export interface DiseaseDetection {
  diseaseType: string;
  pathogen: 'fungal' | 'bacterial' | 'viral' | 'nutritional' | 'environmental';
  commonName: string;
  scientificName?: string;
  confidence: number;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  location: DetectionLocation;
  symptoms: string[];
  progression: ProgressionStage;
  treatment: TreatmentPlan;
  prognosis: Prognosis;
}

export interface DetectionLocation {
  area: 'leaves' | 'stem' | 'roots' | 'fruits' | 'flowers' | 'overall';
  specific?: string;
  percentage?: number; // percentage of plant affected
}

export interface DamageAssessment {
  currentDamage: number; // 0-100%
  projectedDamage: number; // if untreated
  economicImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
  reversible: boolean;
}

export interface ProgressionStage {
  stage: 'early' | 'developing' | 'advanced' | 'terminal';
  timeToProgression?: number; // days
  spreadRate: 'slow' | 'moderate' | 'fast' | 'rapid';
}

export interface Prognosis {
  outcome: 'excellent' | 'good' | 'fair' | 'poor';
  recoveryTime?: number; // days
  yieldImpact?: number; // percentage reduction
  longTermEffects?: string[];
}

export interface TreatmentPlan {
  immediate: TreatmentAction[];
  shortTerm: TreatmentAction[];
  longTerm: TreatmentAction[];
  organic: boolean;
  cost: CostEstimate;
  effectiveness: number; // 0-100%
}

export interface TreatmentAction {
  action: string;
  product?: string;
  dosage?: string;
  frequency: string;
  duration?: string;
  timing?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cost?: number;
}

export interface PreventionMeasures {
  cultural: string[];
  biological: string[];
  chemical: string[];
  monitoring: string[];
  frequency: string;
}

export interface CostEstimate {
  materials: number;
  labor: number;
  total: number;
  currency: string;
  confidence: number;
}

export interface HealthAssessment {
  overallHealth: number; // 0-100
  stressFactors: StressFactor[];
  nutritionalStatus: NutritionalStatus;
  environmentalFactors: EnvironmentalFactors;
  recommendations: HealthRecommendation[];
  prognosis: string;
}

export interface StressFactor {
  type: 'water' | 'temperature' | 'light' | 'nutrients' | 'pests' | 'disease' | 'mechanical';
  severity: 'low' | 'moderate' | 'high';
  indicators: string[];
  solution: string;
}

export interface NutritionalStatus {
  nitrogen: 'deficient' | 'adequate' | 'excess';
  phosphorus: 'deficient' | 'adequate' | 'excess';
  potassium: 'deficient' | 'adequate' | 'excess';
  micronutrients: MicronutrientStatus[];
  recommendations: string[];
}

export interface MicronutrientStatus {
  nutrient: string;
  status: 'deficient' | 'adequate' | 'excess';
  symptoms?: string[];
}

export interface EnvironmentalFactors {
  light: LightAssessment;
  temperature: TemperatureAssessment;
  humidity: HumidityAssessment;
  airflow: AirflowAssessment;
  soilConditions?: SoilConditions;
}

export interface LightAssessment {
  intensity: 'low' | 'adequate' | 'high' | 'excessive';
  duration: number; // hours per day
  spectrum: string;
  recommendations: string[];
}

export interface TemperatureAssessment {
  current: number;
  optimal: TemperatureRange;
  stress: boolean;
  recommendations: string[];
}

export interface HumidityAssessment {
  current: number;
  optimal: HumidityRange;
  issues: string[];
  recommendations: string[];
}

export interface AirflowAssessment {
  circulation: 'poor' | 'adequate' | 'good' | 'excellent';
  issues: string[];
  recommendations: string[];
}

export interface SoilConditions {
  ph: number;
  moisture: 'dry' | 'adequate' | 'moist' | 'waterlogged';
  drainage: 'poor' | 'adequate' | 'good' | 'excellent';
  compaction: boolean;
  organicMatter: 'low' | 'adequate' | 'high';
}

export interface GrowthAnalysis {
  stage: GrowthStage;
  developmentRate: 'slow' | 'normal' | 'fast';
  size: SizeAnalysis;
  maturity: MaturityAssessment;
  projections: GrowthProjections;
  comparisons: GrowthComparisons;
}

export interface GrowthStage {
  current: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'mature';
  daysInStage: number;
  expectedDuration: number;
  nextStage: string;
  timeToNextStage: number;
}

export interface SizeAnalysis {
  height: MeasurementAnalysis;
  width: MeasurementAnalysis;
  leafCount: CountAnalysis;
  biomass: BiomassAnalysis;
}

export interface MeasurementAnalysis {
  current: number;
  expected: number;
  unit: string;
  percentile: number;
  trend: 'declining' | 'stable' | 'growing';
}

export interface CountAnalysis {
  current: number;
  expected: number;
  healthy: number;
  stressed: number;
  newGrowth: number;
}

export interface BiomassAnalysis {
  estimated: number;
  unit: string;
  distribution: string;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface MaturityAssessment {
  percentage: number;
  harvestReadiness: HarvestReadiness;
  qualityIndicators: QualityIndicator[];
  timing: HarvestTiming;
}

export interface HarvestReadiness {
  ready: boolean;
  confidence: number;
  estimatedDays: number;
  indicators: string[];
  qualityPrediction: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface QualityIndicator {
  indicator: string;
  value: string;
  optimal: string;
  assessment: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface HarvestTiming {
  earliest: Date;
  optimal: Date;
  latest: Date;
  windowDays: number;
  factors: string[];
}

export interface GrowthProjections {
  finalSize: SizeProjection;
  harvestDate: Date;
  yieldEstimate: YieldEstimate;
  qualityForecast: string;
}

export interface SizeProjection {
  height: number;
  width: number;
  biomass: number;
  confidence: number;
}

export interface YieldEstimate {
  quantity: number;
  unit: string;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  confidence: number;
  factors: string[];
}

export interface GrowthComparisons {
  varietyAverage: ComparisonData;
  seasonalNorm: ComparisonData;
  optimalConditions: ComparisonData;
  userHistory: ComparisonData;
}

export interface ComparisonData {
  metric: string;
  userValue: number;
  compareValue: number;
  percentile: number;
  assessment: 'below' | 'average' | 'above' | 'exceptional';
}

export interface Recommendation {
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: RecommendationCategory;
  title: string;
  description: string;
  action: string;
  timeline: string;
  cost?: CostEstimate;
  expectedBenefit: string;
  confidence: number;
  resources?: Resource[];
}

export enum RecommendationType {
  IMMEDIATE = 'immediate',
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  OPTIMIZATION = 'optimization'
}

export enum RecommendationCategory {
  WATERING = 'watering',
  FERTILIZING = 'fertilizing',
  PRUNING = 'pruning',
  PEST_CONTROL = 'pest_control',
  DISEASE_TREATMENT = 'disease_treatment',
  ENVIRONMENT = 'environment',
  HARVESTING = 'harvesting',
  MONITORING = 'monitoring'
}

export interface Resource {
  type: 'video' | 'article' | 'guide' | 'product' | 'expert';
  title: string;
  url?: string;
  description: string;
  provider: string;
}

export interface HealthRecommendation {
  issue: string;
  solution: string;
  priority: 'low' | 'medium' | 'high';
  timeframe: string;
  expectedImprovement: string;
}

export interface PreviousDiagnosis {
  date: Date;
  issue: string;
  treatment: string;
  outcome: string;
  provider: AIProviderType;
}

export interface GrowthMeasurement {
  date: Date;
  height?: number;
  width?: number;
  leafCount?: number;
  healthScore?: number;
}

export interface AIProviderConfig {
  googleVision: {
    apiKey: string;
    projectId?: string;
    features: string[];
  };
  googleGemini: {
    apiKey: string;
    model: string;
    maxTokens?: number;
  };
  openAI: {
    apiKey: string;
    model: string;
    maxTokens?: number;
  };
  plantNet: {
    apiKey?: string;
    project: string;
  };
}

export interface CombinedAnalysisResult {
  id: string;
  timestamp: Date;
  imageUrl: string;
  request: ImageAnalysisRequest;
  results: AIAnalysisResult[];
  consensus: ConsensusResult;
  confidence: number;
  processingTime: number;
  recommendations: Recommendation[];
}

export interface ConsensusResult {
  plantIdentification?: PlantIdentification;
  pestDetection?: PestDetection[];
  diseaseDetection?: DiseaseDetection[];
  healthAssessment?: HealthAssessment;
  growthAnalysis?: GrowthAnalysis;
  agreementScore: number;
  conflictingResults?: ConflictingResult[];
}

export interface ConflictingResult {
  aspect: string;
  providers: AIProviderType[];
  results: any[];
  recommendedAction: string;
}