import { Request, Response } from 'express';
import Campaign from '../models/Campaign';
import { z } from 'zod';

// Validation schemas
const createCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  goalAmount: z.number().min(100),
  category: z.enum([
    'General',
    'Building',
    'Youth',
    'Children',
    'Missions',
    'Media',
    'Welfare',
    'Events',
    'Education',
    'Other',
  ]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

/**
 * Get all campaigns (PUBLIC)
 * GET /api/campaigns
 */
export const getAllCampaigns = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, category, limit = '10', page = '1' } = req.query;

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get campaigns with pagination
    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    // Get total count
    const total = await Campaign.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching campaigns.',
    });
  }
};

/**
 * Get active campaigns only (PUBLIC)
 * GET /api/campaigns/active
 */
export const getActiveCampaigns = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const campaigns = await Campaign.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: { campaigns },
    });
  } catch (error) {
    console.error('Get active campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching active campaigns.',
    });
  }
};

/**
 * Get single campaign by ID (PUBLIC)
 * GET /api/campaigns/:id
 */
export const getCampaignById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('Get campaign by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the campaign.',
    });
  }
};

/**
 * Create new campaign (ADMIN ONLY)
 * POST /api/campaigns
 */
export const createCampaign = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createCampaignSchema.parse(req.body);

    // Create campaign
    const campaign = await Campaign.create(validatedData);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully!',
      data: { campaign },
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

    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the campaign.',
    });
  }
};

/**
 * Update campaign (ADMIN ONLY)
 * PUT /api/campaigns/:id
 */
export const updateCampaign = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = updateCampaignSchema.parse(req.body);

    // Find and update campaign
    const campaign = await Campaign.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Campaign updated successfully!',
      data: { campaign },
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

    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the campaign.',
    });
  }
};

/**
 * Delete campaign (ADMIN ONLY)
 * DELETE /api/campaigns/:id
 */
export const deleteCampaign = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findByIdAndDelete(id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully!',
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the campaign.',
    });
  }
};
