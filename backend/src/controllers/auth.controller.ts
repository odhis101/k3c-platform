import { Request, Response } from 'express';
import User from '../models/User';
import { generateUserToken } from '../middleware/auth';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^(\+?254|0)[17]\d{8}$/, 'Invalid Kenyan phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Register a new donor
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email already registered. Please login instead.',
      });
      return;
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone: validatedData.phone });
    if (existingPhone) {
      res.status(400).json({
        success: false,
        message: 'Phone number already registered.',
      });
      return;
    }

    // Create user
    const user = await User.create(validatedData);

    // Generate token
    const token = generateUserToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again.',
    });
  }
};

/**
 * Login donor
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Find user with password
    const user = await User.findOne({ email: validatedData.email }).select(
      '+password'
    );

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(validatedData.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Generate token
    const token = generateUserToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.',
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // User is attached to request by authenticateUser middleware
    const user = (req as any).user;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile.',
    });
  }
};
