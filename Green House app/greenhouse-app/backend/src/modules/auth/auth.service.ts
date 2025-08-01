import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { 
  User, 
  UserPublic, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  JWTPayload,
  RefreshTokenPayload,
  Session,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UpdatePreferencesRequest,
  UserRole,
  ExperienceLevel
} from './auth.types';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  private static readonly BCRYPT_ROUNDS = 12;

  // In-memory storage for demo - in production, use a database
  private static users: Map<string, User> = new Map();
  private static sessions: Map<string, Session> = new Map();
  private static emailVerificationTokens: Map<string, string> = new Map();
  private static passwordResetTokens: Map<string, { userId: string; expires: Date }> = new Map();

  static async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validate input
      const validation = this.validateRegistration(request);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(
        u => u.email.toLowerCase() === request.email.toLowerCase() || u.username === request.username
      );
      
      if (existingUser) {
        return { success: false, message: 'User with this email or username already exists' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(request.password, this.BCRYPT_ROUNDS);

      // Create user
      const userId = this.generateId();
      const emailVerificationToken = this.generateToken();
      
      const user: User = {
        id: userId,
        email: request.email.toLowerCase(),
        username: request.username,
        firstName: request.firstName,
        lastName: request.lastName,
        passwordHash,
        role: UserRole.USER,
        isEmailVerified: false,
        emailVerificationToken,
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {
          experience: ExperienceLevel.BEGINNER,
          specialties: [],
          timezone: 'America/New_York',
          language: 'en'
        },
        preferences: {
          notifications: {
            email: {
              enabled: true,
              harvest: true,
              pests: true,
              diseases: true,
              tasks: true,
              system: false
            },
            sms: {
              enabled: false,
              critical: true,
              harvest: false
            },
            push: {
              enabled: true,
              all: true
            },
            inApp: {
              enabled: true,
              sound: true
            }
          },
          units: {
            temperature: 'fahrenheit',
            measurement: 'imperial',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h'
          },
          dashboard: {
            defaultView: 'calendar',
            widgets: ['weather', 'tasks', 'alerts'],
            layout: 'grid'
          }
        }
      };

      this.users.set(userId, user);
      this.emailVerificationTokens.set(emailVerificationToken, userId);

      // Send verification email (mock)
      await this.sendEmailVerification(user.email, emailVerificationToken);

      return {
        success: true,
        user: this.toPublicUser(user),
        message: 'Registration successful. Please check your email to verify your account.'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  static async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = Array.from(this.users.values()).find(
        u => u.email.toLowerCase() === request.email.toLowerCase()
      );

      if (!user) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(request.password, user.passwordHash);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return { 
          success: false, 
          message: 'Please verify your email address before logging in' 
        };
      }

      // Update last login
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(user.id, user);

      // Generate tokens
      const { token, refreshToken } = this.generateTokens(user);

      // Create session
      const session = this.createSession(user.id, token, refreshToken, request);
      this.sessions.set(session.id, session);

      return {
        success: true,
        user: this.toPublicUser(user),
        token,
        refreshToken,
        expiresIn: this.getTokenExpiresIn()
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      
      // Find session
      const session = Array.from(this.sessions.values()).find(
        s => s.refreshToken === refreshToken && s.userId === payload.userId && s.isActive
      );

      if (!session) {
        return { success: false, message: 'Invalid refresh token' };
      }

      // Find user
      const user = this.users.get(payload.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Update session
      session.token = tokens.token;
      session.refreshToken = tokens.refreshToken;
      session.lastUsed = new Date();
      this.sessions.set(session.id, session);

      return {
        success: true,
        user: this.toPublicUser(user),
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: this.getTokenExpiresIn()
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, message: 'Token refresh failed' };
    }
  }

  static async logout(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Find and deactivate session
      const session = Array.from(this.sessions.values()).find(s => s.token === token);
      if (session) {
        session.isActive = false;
        this.sessions.set(session.id, session);
      }

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  }

  static async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const userId = this.emailVerificationTokens.get(token);
      if (!userId) {
        return { success: false, message: 'Invalid or expired verification token' };
      }

      const user = this.users.get(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify email
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.updatedAt = new Date();
      this.users.set(userId, user);

      // Clean up token
      this.emailVerificationTokens.delete(token);

      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: 'Email verification failed' };
    }
  }

  static async requestPasswordReset(request: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    try {
      const user = Array.from(this.users.values()).find(
        u => u.email.toLowerCase() === request.email.toLowerCase()
      );

      if (!user) {
        // Don't reveal if email exists
        return { success: true, message: 'If an account exists, password reset instructions have been sent.' };
      }

      const resetToken = this.generateToken();
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // 1 hour expiry

      this.passwordResetTokens.set(resetToken, { userId: user.id, expires });

      // Send reset email (mock)
      await this.sendPasswordResetEmail(user.email, resetToken);

      return { success: true, message: 'If an account exists, password reset instructions have been sent.' };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { success: false, message: 'Password reset request failed' };
    }
  }

  static async resetPassword(request: PasswordResetConfirm): Promise<{ success: boolean; message: string }> {
    try {
      const tokenData = this.passwordResetTokens.get(request.token);
      if (!tokenData || tokenData.expires < new Date()) {
        return { success: false, message: 'Invalid or expired reset token' };
      }

      if (request.newPassword !== request.confirmPassword) {
        return { success: false, message: 'Passwords do not match' };
      }

      const validation = this.validatePassword(request.newPassword);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      const user = this.users.get(tokenData.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Update password
      user.passwordHash = await bcrypt.hash(request.newPassword, this.BCRYPT_ROUNDS);
      user.updatedAt = new Date();
      this.users.set(user.id, user);

      // Clean up token
      this.passwordResetTokens.delete(request.token);

      // Invalidate all sessions for this user
      Array.from(this.sessions.values())
        .filter(s => s.userId === user.id)
        .forEach(s => {
          s.isActive = false;
          this.sessions.set(s.id, s);
        });

      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Password reset failed' };
    }
  }

  static async changePassword(userId: string, request: ChangePasswordRequest): Promise<{ success: boolean; message: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(request.currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      if (request.newPassword !== request.confirmPassword) {
        return { success: false, message: 'New passwords do not match' };
      }

      const validation = this.validatePassword(request.newPassword);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      // Update password
      user.passwordHash = await bcrypt.hash(request.newPassword, this.BCRYPT_ROUNDS);
      user.updatedAt = new Date();
      this.users.set(userId, user);

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Password change failed' };
    }
  }

  static async updateProfile(userId: string, request: UpdateProfileRequest): Promise<{ success: boolean; user?: UserPublic; message?: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Update profile fields
      if (request.firstName) user.firstName = request.firstName;
      if (request.lastName) user.lastName = request.lastName;
      if (request.phone) user.profile.phone = request.phone;
      if (request.address) user.profile.address = request.address;
      if (request.experience) user.profile.experience = request.experience;
      if (request.specialties) user.profile.specialties = request.specialties;
      if (request.timezone) user.profile.timezone = request.timezone;
      if (request.language) user.profile.language = request.language;

      user.updatedAt = new Date();
      this.users.set(userId, user);

      return { success: true, user: this.toPublicUser(user) };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Profile update failed' };
    }
  }

  static async updatePreferences(userId: string, request: UpdatePreferencesRequest): Promise<{ success: boolean; user?: UserPublic; message?: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Update preferences
      if (request.notifications) {
        user.preferences.notifications = { ...user.preferences.notifications, ...request.notifications };
      }
      if (request.units) {
        user.preferences.units = { ...user.preferences.units, ...request.units };
      }
      if (request.dashboard) {
        user.preferences.dashboard = { ...user.preferences.dashboard, ...request.dashboard };
      }

      user.updatedAt = new Date();
      this.users.set(userId, user);

      return { success: true, user: this.toPublicUser(user) };
    } catch (error) {
      console.error('Update preferences error:', error);
      return { success: false, message: 'Preferences update failed' };
    }
  }

  static async getUserById(userId: string): Promise<UserPublic | null> {
    const user = this.users.get(userId);
    return user ? this.toPublicUser(user) : null;
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  // Private helper methods
  private static validateRegistration(request: RegisterRequest): { isValid: boolean; message?: string } {
    if (!request.email || !this.isValidEmail(request.email)) {
      return { isValid: false, message: 'Valid email is required' };
    }

    if (!request.username || request.username.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters long' };
    }

    if (!request.firstName || !request.lastName) {
      return { isValid: false, message: 'First name and last name are required' };
    }

    if (request.password !== request.confirmPassword) {
      return { isValid: false, message: 'Passwords do not match' };
    }

    const passwordValidation = this.validatePassword(request.password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    if (!request.acceptTerms) {
      return { isValid: false, message: 'You must accept the terms and conditions' };
    }

    return { isValid: true };
  }

  private static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        isValid: false, 
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      };
    }

    return { isValid: true };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static generateTokens(user: User): { token: string; refreshToken: string } {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });

    const refreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      tokenId: this.generateId()
    };

    const refreshToken = jwt.sign(refreshPayload, this.JWT_REFRESH_SECRET, { 
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN 
    });

    return { token, refreshToken };
  }

  private static createSession(userId: string, token: string, refreshToken: string, loginRequest: LoginRequest): Session {
    return {
      id: this.generateId(),
      userId,
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + this.getTokenExpiresIn() * 1000),
      createdAt: new Date(),
      lastUsed: new Date(),
      ipAddress: '127.0.0.1', // Would get from request
      userAgent: 'Browser', // Would get from request
      isActive: true
    };
  }

  private static getTokenExpiresIn(): number {
    // Convert JWT_EXPIRES_IN to seconds
    const expiresIn = this.JWT_EXPIRES_IN;
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 86400;
    }
    return parseInt(expiresIn);
  }

  private static toPublicUser(user: User): UserPublic {
    const { passwordHash, emailVerificationToken, resetPasswordToken, resetPasswordExpires, ...publicUser } = user;
    return publicUser;
  }

  private static generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static async sendEmailVerification(email: string, token: string): Promise<void> {
    // Mock email sending - in production, use actual email service
    console.log(`Email verification sent to ${email} with token: ${token}`);
    console.log(`Verification URL: http://localhost:3000/verify-email?token=${token}`);
  }

  private static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Mock email sending - in production, use actual email service
    console.log(`Password reset sent to ${email} with token: ${token}`);
    console.log(`Reset URL: http://localhost:3000/reset-password?token=${token}`);
  }
}