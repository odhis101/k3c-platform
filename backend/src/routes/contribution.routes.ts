import { Router } from 'express';
import {
  getMyContributions,
  getMyContributionStats,
  getContributionById,
} from '../controllers/contribution.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/contributions/my-contributions
 * @desc    Get all contributions made by the authenticated donor
 * @access  Private (Donors only)
 */
router.get('/my-contributions', authenticateUser, getMyContributions);

/**
 * @route   GET /api/contributions/stats
 * @desc    Get contribution statistics for the authenticated donor
 * @access  Private (Donors only)
 */
router.get('/stats', authenticateUser, getMyContributionStats);

/**
 * @route   GET /api/contributions/:id
 * @desc    Get a single contribution by ID
 * @access  Private (Donors only)
 */
router.get('/:id', authenticateUser, getContributionById);

export default router;
