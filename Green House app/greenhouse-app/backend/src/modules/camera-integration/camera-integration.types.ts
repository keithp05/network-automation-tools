export interface CameraProvider {
  type: CameraProviderType;
  name: string;
  capabilities: CameraCapability[];
  connectionStatus: ConnectionStatus;
  lastSeen?: Date;
}

export enum CameraProviderType {
  UBIQUITI_UNIFI = 'ubiquiti_unifi',
  RTSP_GENERIC = 'rtsp_generic',
  HTTP_MJPEG = 'http_mjpeg',
  USB_WEBCAM = 'usb_webcam',
  IP_CAMERA = 'ip_camera'
}

export enum CameraCapability {
  LIVE_STREAM = 'live_stream',
  SNAPSHOT = 'snapshot',
  RECORDING = 'recording',
  MOTION_DETECTION = 'motion_detection',
  PTZ_CONTROL = 'ptz_control',
  INFRARED = 'infrared',
  AUDIO = 'audio',
  ANALYTICS = 'analytics',
  TIMELAPSE = 'timelapse'
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
  UNAUTHORIZED = 'unauthorized'
}

// Ubiquiti UniFi Protect specific types
export interface UniFiProtectConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  apiKey?: string;
  verifySsl: boolean;
}

export interface UniFiCamera {
  id: string;
  mac: string;
  name: string;
  type: string;
  model: string;
  modelKey: string;
  host: string;
  ip: string;
  connectionHost: string;
  streamUrls: StreamUrls;
  lastSeen: number;
  lastMotion: number;
  isConnected: boolean;
  isRecording: boolean;
  isMotionDetected: boolean;
  isPoorConnection: boolean;
  phyRate: number;
  stats: CameraStats;
  channels: CameraChannel[];
  featureFlags: FeatureFlags;
  settings: CameraSettings;
}

export interface StreamUrls {
  rtsp: string;
  rtsps: string;
  rtmp: string;
  rtmps: string;
  hls: string;
  hlsPlaylist: string;
  snapshots: {
    current: string;
    lastMotion: string;
  };
}

export interface CameraStats {
  rxBytes: number;
  txBytes: number;
  wifi: {
    channel: number;
    frequency: number;
    linkSpeedMbps: number;
    signalQuality: number;
    signalStrength: number;
  };
  battery?: {
    percentage: number;
    isCharging: boolean;
  };
  temperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
}

export interface CameraChannel {
  id: number;
  name: string;
  enabled: boolean;
  isRtspEnabled: boolean;
  rtspAlias: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  minBitrate: number;
  maxBitrate: number;
}

export interface FeatureFlags {
  canManage: boolean;
  canManageRecording: boolean;
  canManageLiveview: boolean;
  canViewRecording: boolean;
  canViewLiveview: boolean;
  hasSmartDetect: boolean;
  hasLineDetect: boolean;
  hasMotionDetect: boolean;
  hasPrivacyMask: boolean;
  hasLcdMessage: boolean;
  hasLedStatus: boolean;
  hasSpeaker: boolean;
  hasMicrophone: boolean;
  hasExternalIr: boolean;
  hasIcrSensitivity: boolean;
  hasHdr: boolean;
  hasAutoRotate: boolean;
  hasMotionZones: boolean;
  hasWifi: boolean;
  hasPackageDetect: boolean;
  hasPersonDetect: boolean;
  hasVehicleDetect: boolean;
  hasFaceDetect: boolean;
  hasLicensePlateDetect: boolean;
}

export interface CameraSettings {
  name: string;
  timezone: string;
  locale: string;
  osdSettings: {
    isNameEnabled: boolean;
    isDateEnabled: boolean;
    isLogoEnabled: boolean;
    isDebugEnabled: boolean;
  };
  ledSettings: {
    isEnabled: boolean;
    blinkRate: number;
  };
  recordingSettings: {
    prePaddingSecs: number;
    postPaddingSecs: number;
    retentionDurationMs: number;
    endMotionEventDelay: number;
    suppressIlluminationSurge: boolean;
    mode: 'always' | 'motion' | 'smartDetect' | 'never';
  };
  smartDetectSettings: {
    objectTypes: string[];
    audioTypes: string[];
  };
  motionDetectSettings: {
    sensitivity: number;
    threshold: number;
    minEventLength: number;
    zones: MotionZone[];
  };
  privacySettings: {
    isEnabled: boolean;
    zones: PrivacyZone[];
  };
  microphoneSettings: {
    isEnabled: boolean;
    sensitivity: number;
  };
  speakerSettings: {
    isEnabled: boolean;
    speakerTrack: {
      enabled: boolean;
      speakerId: string;
    };
  };
}

export interface MotionZone {
  id: string;
  name: string;
  color: string;
  points: [number, number][];
  sensitivity: number;
}

export interface PrivacyZone {
  id: string;
  name: string;
  color: string;
  points: [number, number][];
}

// Camera integration types
export interface Camera {
  id: string;
  providerId: string;
  providerType: CameraProviderType;
  name: string;
  description?: string;
  location: CameraLocation;
  status: CameraStatus;
  capabilities: CameraCapability[];
  streamUrl?: string;
  snapshotUrl?: string;
  credentials?: CameraCredentials;
  metadata: CameraMetadata;
  settings: CameraIntegrationSettings;
  lastSnapshot?: Date;
  lastMotion?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CameraLocation {
  greenhouseId?: string;
  bedId?: string;
  zone?: string;
  position: {
    x: number;
    y: number;
    z?: number;
  };
  direction?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  coverage?: {
    radius: number;
    angle: number;
  };
}

export interface CameraStatus {
  isOnline: boolean;
  isRecording: boolean;
  isStreaming: boolean;
  hasMotion: boolean;
  lastSeen: Date;
  health: 'good' | 'fair' | 'poor' | 'offline';
  errors?: string[];
}

export interface CameraCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  token?: string;
}

export interface CameraMetadata {
  manufacturer?: string;
  model?: string;
  firmware?: string;
  resolution?: {
    width: number;
    height: number;
  };
  fps?: number;
  codec?: string;
  features?: string[];
}

export interface CameraIntegrationSettings {
  enabled: boolean;
  autoCapture: boolean;
  captureInterval: number; // minutes
  motionCapture: boolean;
  aiAnalysis: boolean;
  alertOnMotion: boolean;
  alertOnAiDetection: boolean;
  retentionDays: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  nightMode: 'auto' | 'on' | 'off';
  privacyMode: boolean;
  audioEnabled: boolean;
}

// Streaming and capture types
export interface StreamOptions {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  protocol: 'rtsp' | 'rtmp' | 'hls' | 'webrtc';
  audio: boolean;
  transcode: boolean;
  framerate?: number;
  bitrate?: number;
  keyframeInterval?: number;
}

export interface CaptureOptions {
  format: 'jpeg' | 'png' | 'webp';
  quality: number; // 0-100
  width?: number;
  height?: number;
  timestamp: boolean;
  overlay?: OverlayOptions;
}

export interface OverlayOptions {
  text?: string;
  dateTime: boolean;
  cameraName: boolean;
  customData?: Record<string, string>;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
}

export interface CaptureResult {
  id: string;
  cameraId: string;
  timestamp: Date;
  imageUrl: string;
  imageBase64?: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
  analysis?: AIAnalysisResult;
}

export interface AIAnalysisResult {
  plantDetection?: {
    detected: boolean;
    plantCount: number;
    plants: DetectedPlant[];
  };
  healthAssessment?: {
    overallHealth: number;
    issues: HealthIssue[];
  };
  growthTracking?: {
    height: number;
    width: number;
    leafCount: number;
    stage: string;
  };
  environmentalConditions?: {
    lighting: 'low' | 'medium' | 'high';
    moisture: 'dry' | 'adequate' | 'wet';
    temperature?: number;
  };
}

export interface DetectedPlant {
  id: string;
  boundingBox: BoundingBox;
  confidence: number;
  species?: string;
  health: number;
  issues?: string[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HealthIssue {
  type: 'pest' | 'disease' | 'nutrient' | 'environmental';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
  location?: BoundingBox;
}

// Motion detection types
export interface MotionEvent {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  thumbnail?: string;
  zones: string[];
  score: number;
  type: 'motion' | 'person' | 'vehicle' | 'animal' | 'package';
  metadata?: Record<string, any>;
}

export interface MotionDetectionConfig {
  enabled: boolean;
  sensitivity: number; // 0-100
  threshold: number; // 0-100
  minDuration: number; // seconds
  cooldown: number; // seconds
  zones: MotionZone[];
  ignoredObjects: string[];
  smartDetection: {
    enabled: boolean;
    detectPeople: boolean;
    detectAnimals: boolean;
    detectVehicles: boolean;
    detectPackages: boolean;
  };
}

// Recording types
export interface Recording {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  events: RecordingEvent[];
  metadata: RecordingMetadata;
}

export interface RecordingEvent {
  timestamp: Date;
  type: 'motion' | 'smart' | 'manual' | 'continuous';
  description?: string;
  thumbnail?: string;
  score?: number;
}

export interface RecordingMetadata {
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  codec: string;
  bitrate: number;
  hasAudio: boolean;
}

// Timelapse types
export interface TimelapseConfig {
  id: string;
  cameraId: string;
  name: string;
  interval: number; // seconds
  duration: number; // hours
  startTime: Date;
  endTime?: Date;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
  status: 'pending' | 'active' | 'processing' | 'completed' | 'failed';
  outputUrl?: string;
}

export interface TimelapseFrame {
  id: string;
  timelapseId: string;
  frameNumber: number;
  timestamp: Date;
  imageUrl: string;
  analysis?: AIAnalysisResult;
}

// Camera management
export interface CameraGroup {
  id: string;
  name: string;
  description?: string;
  cameraIds: string[];
  layout?: GroupLayout;
  settings: GroupSettings;
}

export interface GroupLayout {
  type: 'grid' | 'carousel' | 'focus' | 'custom';
  rows?: number;
  columns?: number;
  primaryCameraId?: string;
  positions?: Record<string, { x: number; y: number; width: number; height: number }>;
}

export interface GroupSettings {
  syncRecording: boolean;
  syncMotionDetection: boolean;
  alertOnAnyMotion: boolean;
  bulkAnalysis: boolean;
}

// Integration with greenhouse system
export interface CameraGreenhouseIntegration {
  cameraId: string;
  greenhouseId: string;
  bedIds: string[];
  monitoringSchedule: MonitoringSchedule;
  automations: CameraAutomation[];
}

export interface MonitoringSchedule {
  enabled: boolean;
  times: ScheduleTime[];
  captureOnSchedule: boolean;
  analyzeOnSchedule: boolean;
}

export interface ScheduleTime {
  hour: number;
  minute: number;
  daysOfWeek: number[]; // 0-6, Sunday-Saturday
}

export interface CameraAutomation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  enabled: boolean;
}

export interface AutomationTrigger {
  type: 'motion' | 'schedule' | 'ai_detection' | 'environmental';
  conditions: Record<string, any>;
}

export interface AutomationAction {
  type: 'capture' | 'analyze' | 'alert' | 'record' | 'webhook';
  parameters: Record<string, any>;
}

// API request/response types
export interface AddCameraRequest {
  providerType: CameraProviderType;
  name: string;
  description?: string;
  location: CameraLocation;
  credentials?: CameraCredentials;
  settings?: Partial<CameraIntegrationSettings>;
  unifiConfig?: UniFiProtectConfig;
  streamUrl?: string;
}

export interface UpdateCameraRequest {
  name?: string;
  description?: string;
  location?: Partial<CameraLocation>;
  settings?: Partial<CameraIntegrationSettings>;
  credentials?: Partial<CameraCredentials>;
}

export interface CameraListResponse {
  cameras: Camera[];
  total: number;
  online: number;
  offline: number;
}

export interface CameraStreamResponse {
  cameraId: string;
  streamUrl: string;
  protocol: string;
  expires?: Date;
  token?: string;
}

export interface BulkCaptureRequest {
  cameraIds: string[];
  options?: CaptureOptions;
  analyze?: boolean;
}

export interface BulkCaptureResponse {
  captures: CaptureResult[];
  failed: { cameraId: string; error: string }[];
}

// WebSocket events
export interface CameraWebSocketEvent {
  type: CameraEventType;
  cameraId: string;
  timestamp: Date;
  data: any;
}

export enum CameraEventType {
  STATUS_CHANGE = 'status_change',
  MOTION_DETECTED = 'motion_detected',
  MOTION_ENDED = 'motion_ended',
  AI_DETECTION = 'ai_detection',
  CAPTURE_COMPLETE = 'capture_complete',
  STREAM_START = 'stream_start',
  STREAM_END = 'stream_end',
  ERROR = 'error'
}