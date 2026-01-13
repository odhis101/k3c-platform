import { Router } from 'express';
import { register, login, getProfile } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new donor
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Login donor
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (Donors only)
 */
router.get('/me', authenticateUser, getProfile);

export default router;
