import { Request, Response } from 'express';
import Contribution from '../models/Contribution';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all contributions made by the authenticated donor
 */
export const getMyContributions = async (req: Request, res: Response): Promise<void> => {
  try {
    const donorId = (req as AuthRequest).user?._id;

    if (!donorId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Fetch all contributions by this donor, sorted by most recent first
    const contributions = await Contribution.find({ userId: donorId })
      .populate('campaignId', 'title imageUrl category')
      .sort({ createdAt: -1 });

    // Format response to match frontend expectation (campaign instead of campaignId)
    const formattedContributions = contributions.map((c) => {
      const obj = c.toObject();
      return {
        ...obj,
        campaign: obj.campaignId,
        campaignId: undefined,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        contributions: formattedContributions,
        count: formattedContributions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching user contributions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contributions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get contribution statistics for the authenticated donor
 */
export const getMyContributionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const donorId = (req as AuthRequest).user?._id;

    if (!donorId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    // Get all successful contributions
    const contributions = await Contribution.find({
      userId: donorId,
      paymentStatus: 'success',
    });

    // Calculate statistics
    const totalAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
    const totalContributions = contributions.length;
    const averageContribution = totalContributions > 0 ? totalAmount / totalContributions : 0;

    // Get unique campaigns
    const uniqueCampaigns = new Set(contributions.map((c) => c.campaignId.toString()));
    const campaignsSupported = uniqueCampaigns.size;

    res.status(200).json({
      success: true,
      data: {
        totalAmount,
        totalContributions,
        averageContribution,
        campaignsSupported,
      },
    });
  } catch (error) {
    console.error('Error fetching contribution stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contribution statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get a single contribution by ID
 */
export const getContributionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const donorId = (req as AuthRequest).user?._id;

    if (!donorId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const contribution = await Contribution.findOne({
      _id: id,
      userId: donorId,
    }).populate('campaignId', 'title description imageUrl category goalAmount currentAmount');

    if (!contribution) {
      res.status(404).json({
        success: false,
        message: 'Contribution not found',
      });
      return;
    }

    // Format response to match frontend expectation
    const obj = contribution.toObject();
    const formattedContribution = {
      ...obj,
      campaign: obj.campaignId,
      campaignId: undefined,
    };

    res.status(200).json({
      success: true,
      data: formattedContribution,
    });
  } catch (error) {
    console.error('Error fetching contribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contribution',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
