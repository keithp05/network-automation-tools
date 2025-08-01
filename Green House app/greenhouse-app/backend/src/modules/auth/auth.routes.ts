import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from './auth.middleware';

const router = Router();

// Public routes (no authentication required)
router.post('/register', 
  AuthMiddleware.validateRequest(['email', 'username', 'firstName', 'lastName', 'password', 'confirmPassword', 'acceptTerms']),
  AuthMiddleware.sanitizeInput,
  AuthMiddleware.rateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  AuthController.register
);

router.post('/login',
  AuthMiddleware.validateRequest(['email', 'password']),
  AuthMiddleware.sanitizeInput,
  AuthMiddleware.rateLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  AuthController.login
);

router.post('/refresh-token',
  AuthController.refreshToken
);

router.post('/verify-email',
  AuthMiddleware.validateRequest(['token']),
  AuthController.verifyEmail
);

router.post('/request-password-reset',
  AuthMiddleware.validateRequest(['email']),
  AuthMiddleware.sanitizeInput,
  AuthMiddleware.rateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  AuthController.requestPasswordReset
);

router.post('/reset-password',
  AuthMiddleware.validateRequest(['token', 'newPassword', 'confirmPassword']),
  AuthMiddleware.sanitizeInput,
  AuthController.resetPassword
);

router.post('/resend-verification',
  AuthMiddleware.validateRequest(['email']),
  AuthMiddleware.sanitizeInput,
  AuthMiddleware.rateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  AuthController.resendVerification
);

// Protected routes (authentication required)
router.post('/logout',
  AuthMiddleware.authenticate,
  AuthController.logout
);

router.get('/check-auth',
  AuthMiddleware.authenticate,
  AuthController.checkAuth
);

router.get('/profile',
  AuthMiddleware.authenticate,
  AuthController.getProfile
);

router.put('/profile',
  AuthMiddleware.authenticate,
  AuthMiddleware.sanitizeInput,
  AuthController.updateProfile
);

router.put('/preferences',
  AuthMiddleware.authenticate,
  AuthMiddleware.sanitizeInput,
  AuthController.updatePreferences
);

router.post('/change-password',
  AuthMiddleware.authenticate,
  AuthMiddleware.validateRequest(['currentPassword', 'newPassword', 'confirmPassword']),
  AuthMiddleware.sanitizeInput,
  AuthController.changePassword
);

// Admin-only routes
router.get('/users',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  (req, res) => {
    // TODO: Implement user management for admins
    res.status(501).json({
      success: false,
      message: 'User management not yet implemented'
    });
  }
);

// Error handling middleware
router.use(AuthMiddleware.handleAuthError);

export { router as authRoutes };