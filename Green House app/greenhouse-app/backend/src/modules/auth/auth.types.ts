export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile: UserProfile;
  preferences: UserPreferences;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MANAGER = 'manager'
}

export interface UserProfile {
  avatar?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  experience: ExperienceLevel;
  specialties: string[];
  timezone: string;
  language: string;
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  units: UnitPreferences;
  dashboard: DashboardPreferences;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    harvest: boolean;
    pests: boolean;
    diseases: boolean;
    tasks: boolean;
    system: boolean;
  };
  sms: {
    enabled: boolean;
    critical: boolean;
    harvest: boolean;
  };
  push: {
    enabled: boolean;
    all: boolean;
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
  };
}

export interface UnitPreferences {
  temperature: 'fahrenheit' | 'celsius';
  measurement: 'imperial' | 'metric';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
}

export interface DashboardPreferences {
  defaultView: 'calendar' | 'monitoring' | 'layout';
  widgets: string[];
  layout: 'grid' | 'list';
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: UserPublic;
  token?: string;
  refreshToken?: string;
  message?: string;
  expiresIn?: number;
}

export interface UserPublic {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  profile: UserProfile;
  preferences: UserPreferences;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  experience?: ExperienceLevel;
  specialties?: string[];
  timezone?: string;
  language?: string;
}

export interface UpdatePreferencesRequest {
  notifications?: Partial<NotificationPreferences>;
  units?: Partial<UnitPreferences>;
  dashboard?: Partial<DashboardPreferences>;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsed: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface GreenhousePermission {
  userId: string;
  greenhouseId: string;
  role: GreenhouseRole;
  grantedAt: Date;
  grantedBy: string;
}

export enum GreenhouseRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  VIEWER = 'viewer',
  COLLABORATOR = 'collaborator'
}

export interface InviteRequest {
  email: string;
  greenhouseId: string;
  role: GreenhouseRole;
  message?: string;
}

export interface AcceptInviteRequest {
  token: string;
  acceptTerms: boolean;
}