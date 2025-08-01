import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { 
  LoginRequest, 
  RegisterRequest, 
  PasswordResetRequest, 
  PasswordResetConfirm,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UpdatePreferencesRequest,
  EmailVerificationRequest
} from './auth.types';

export class AuthController {

  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const request: RegisterRequest = req.body;
      const result = await AuthService.register(request);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Registration controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const request: LoginRequest = req.body;
      const result = await AuthService.login(request);
      
      if (result.success) {
        // Set HTTP-only cookie for refresh token
        if (result.refreshToken) {
          res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
          });
        }
        
        res.status(200).json({
          success: result.success,
          user: result.user,
          token: result.token,
          expiresIn: result.expiresIn
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token not provided'
        });
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);
      
      if (result.success) {
        // Update refresh token cookie
        if (result.refreshToken) {
          res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
          });
        }
        
        res.status(200).json({
          success: result.success,
          token: result.token,
          expiresIn: result.expiresIn
        });
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Token refresh controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.substring(7); // Remove 'Bearer '
      
      if (token) {
        await AuthService.logout(token);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token }: EmailVerificationRequest = req.body;
      const result = await AuthService.verifyEmail(token);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Email verification controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const request: PasswordResetRequest = req.body;
      const result = await AuthService.requestPasswordReset(request);
      
      // Always return 200 to prevent email enumeration
      res.status(200).json(result);
    } catch (error) {
      console.error('Password reset request controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const request: PasswordResetConfirm = req.body;
      const result = await AuthService.resetPassword(request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Password reset controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Change password (authenticated users)
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const request: ChangePasswordRequest = req.body;
      const result = await AuthService.changePassword(req.user.userId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Change password controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const user = await AuthService.getUserById(req.user.userId);
      
      if (user) {
        res.status(200).json({
          success: true,
          user
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    } catch (error) {
      console.error('Get profile controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const request: UpdateProfileRequest = req.body;
      const result = await AuthService.updateProfile(req.user.userId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update profile controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const request: UpdatePreferencesRequest = req.body;
      const result = await AuthService.updatePreferences(req.user.userId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Update preferences controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Check if user is authenticated
   */
  static async checkAuth(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const user = await AuthService.getUserById(req.user.userId);
      
      if (user) {
        res.status(200).json({
          success: true,
          authenticated: true,
          user
        });
      } else {
        res.status(401).json({
          success: false,
          authenticated: false,
          message: 'User not found'
        });
      }
    } catch (error) {
      console.error('Check auth controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Resend email verification
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      // In production, you'd implement this in AuthService
      res.status(200).json({
        success: true,
        message: 'If an unverified account exists, verification email has been sent.'
      });
    } catch (error) {
      console.error('Resend verification controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}