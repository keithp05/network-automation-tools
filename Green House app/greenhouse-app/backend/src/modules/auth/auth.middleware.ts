import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { UserRole, JWTPayload } from './auth.types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export class AuthMiddleware {
  
  /**
   * Middleware to authenticate requests using JWT tokens
   */
  static authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = AuthService.verifyToken(token);

      if (!payload) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
        return;
      }

      // Add user info to request
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };

  /**
   * Middleware to check if user has required role
   */
  static requireRole = (roles: UserRole | UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware for admin-only routes
   */
  static requireAdmin = AuthMiddleware.requireRole(UserRole.ADMIN);

  /**
   * Middleware for manager or admin routes
   */
  static requireManager = AuthMiddleware.requireRole([UserRole.MANAGER, UserRole.ADMIN]);

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  static optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = AuthService.verifyToken(token);

        if (payload) {
          req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role
          };
        }
      }

      next();
    } catch (error) {
      // Ignore authentication errors for optional auth
      next();
    }
  };

  /**
   * Middleware to check if user owns or has access to a resource
   */
  static requireOwnership = (resourceUserIdField: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Admins can access any resource
      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (resourceUserId !== req.user.userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
        return;
      }

      next();
    };
  };

  /**
   * Rate limiting middleware for authentication endpoints
   */
  static rateLimit = (maxAttempts: number, windowMs: number) => {
    const attempts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      
      const clientAttempts = attempts.get(clientIp);
      
      if (!clientAttempts || now > clientAttempts.resetTime) {
        // Reset or initialize attempts
        attempts.set(clientIp, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
        return;
      }

      if (clientAttempts.count >= maxAttempts) {
        res.status(429).json({
          success: false,
          message: 'Too many attempts. Please try again later.',
          retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000)
        });
        return;
      }

      clientAttempts.count++;
      attempts.set(clientIp, clientAttempts);
      next();
    };
  };

  /**
   * Middleware to validate request body against schema
   */
  static validateRequest = (requiredFields: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        if (!req.body[field]) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to sanitize user input
   */
  static sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    if (req.body) {
      // Basic sanitization - remove HTML tags and scripts
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
        } else if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = Array.isArray(obj) ? [] : {};
          for (const key in obj) {
            sanitized[key] = sanitize(obj[key]);
          }
          return sanitized;
        }
        return obj;
      };

      req.body = sanitize(req.body);
    }

    next();
  };

  /**
   * Error handling middleware for authentication
   */
  static handleAuthError = (error: any, req: Request, res: Response, next: NextFunction): void => {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
      return;
    }

    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        details: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  };
}