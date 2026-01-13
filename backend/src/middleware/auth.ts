import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import User, { IUser } from '../models/User';
import Admin, { IAdmin } from '../models/Admin';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: IUser;
  admin?: IAdmin;
}

// JWT payload interface
interface JWTPayload {
  id: string;
  type: 'user' | 'admin';
}

/**
 * Middleware to protect routes requiring donor authentication
 */
export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    if (decoded.type !== 'user') {
      res.status(403).json({
        success: false,
        message: 'Invalid token type. User token required.',
      });
      return;
    }

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found. Token invalid.',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Middleware to protect routes requiring admin authentication
 */
export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    if (decoded.type !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Invalid token type. Admin token required.',
      });
      return;
    }

    // Find admin
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Admin not found. Token invalid.',
      });
      return;
    }

    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message: 'Account is inactive. Contact super admin.',
      });
      return;
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Middleware to check if authenticated admin is a super admin
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.admin) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (req.admin.role !== 'super_admin') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.',
    });
    return;
  }

  next();
};

/**
 * Generate JWT token for user
 */
export const generateUserToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign({ id: userId, type: 'user' }, env.JWT_SECRET, options);
};

/**
 * Generate JWT token for admin
 */
export const generateAdminToken = (adminId: string): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign({ id: adminId, type: 'admin' }, env.JWT_SECRET, options);
};

/**
 * Middleware for optional authentication - attaches user if token provided, but doesn't fail if not
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    // If no token provided, continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Try to verify token
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

      if (decoded.type === 'user') {
        // Find user and attach to request
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      }
    } catch (error) {
      // Token invalid, but we continue anyway (optional auth)
      console.log('Optional auth: Invalid token, continuing without authentication');
    }

    next();
  } catch (error) {
    // Any unexpected error, continue without authentication
    next();
  }
};
