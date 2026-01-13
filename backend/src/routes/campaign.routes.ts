import { Router } from 'express';
import {
  getAllCampaigns,
  getActiveCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '../controllers/campaign.controller';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

/**
 * PUBLIC ROUTES - No authentication required
 */

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns with optional filters
 * @access  Public
 */
router.get('/', getAllCampaigns);

/**
 * @route   GET /api/campaigns/active
 * @desc    Get only active campaigns
 * @access  Public
 */
router.get('/active', getActiveCampaigns);

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get single campaign by ID
 * @access  Public
 */
router.get('/:id', getCampaignById);

/**
 * ADMIN ROUTES - Require admin authentication
 */

/**
 * @route   POST /api/campaigns
 * @desc    Create new campaign
 * @access  Private (Admin only)
 */
router.post('/', authenticateAdmin, createCampaign);

/**
 * @route   PUT /api/campaigns/:id
 * @desc    Update campaign
 * @access  Private (Admin only)
 */
router.put('/:id', authenticateAdmin, updateCampaign);

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete campaign
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateAdmin, deleteCampaign);

export default router;
