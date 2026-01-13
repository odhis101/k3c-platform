import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import Contribution from '../models/Contribution';
import Transaction from '../models/Transaction';
import Campaign from '../models/Campaign';
import paystackService from '../services/paystack.service';
import socketService from '../services/socket.service';
import User from '../models/User';

// Validation schema for Paystack payment
const initiatePaystackPaymentSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  amount: z.number().min(10, 'Minimum amount is KES 10'),
  isAnonymous: z.boolean().optional().default(false),
  guestEmail: z.string().email('Invalid email').optional(),
  guestName: z.string().min(1, 'Name is required for guest donations').optional(),
});

/**
 * Initiate Paystack card payment
 * POST /api/payments/paystack/initiate
 */
export const initiatePaystackPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = initiatePaystackPaymentSchema.parse(req.body);
    const userId = req.user?._id;
    const userEmail = req.user?.email || validatedData.guestEmail;

    // For guest donations, require email and name
    if (!userId && (!validatedData.guestEmail || !validatedData.guestName)) {
      res.status(400).json({
        success: false,
        message: 'Guest donations require email and name.',
      });
      return;
    }

    // Check if campaign exists
    const campaign = await Campaign.findById(validatedData.campaignId);
    if (!campaign) {
      res.status(404).json({
        success: false,
        message: 'Campaign not found.',
      });
      return;
    }

    // Check if campaign is active
    if (campaign.status !== 'active') {
      res.status(400).json({
        success: false,
        message: 'Campaign is not active.',
      });
      return;
    }

    // Create contribution record
    const contribution = await Contribution.create({
      userId: userId || undefined,
      campaignId: validatedData.campaignId,
      amount: validatedData.amount,
      paymentMethod: 'card',
      paymentStatus: 'pending',
      paymentReference: `PAYSTACK-${Date.now()}`,
      isAnonymous: validatedData.isAnonymous,
      guestEmail: validatedData.guestEmail,
      guestName: validatedData.guestName,
    });

    // Initialize Paystack transaction
    const paystackResponse = await paystackService.initializeTransaction({
      email: userEmail!,
      amount: validatedData.amount,
      reference: contribution._id.toString(),
      metadata: {
        contributionId: contribution._id.toString(),
        campaignId: validatedData.campaignId,
        campaignTitle: campaign.title,
        userId: userId?.toString() || 'guest',
      },
    });

    // Create transaction record
    await Transaction.create({
      contributionId: contribution._id,
      provider: 'paystack',
      transactionReference: paystackResponse.reference,
      amount: validatedData.amount,
      status: 'initiated',
      providerResponse: paystackResponse,
    });

    // Update contribution with paystack reference
    contribution.paymentReference = paystackResponse.reference;
    await contribution.save();

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully!',
      data: {
        contributionId: contribution._id,
        authorization_url: paystackResponse.authorization_url,
        access_code: paystackResponse.access_code,
        reference: paystackResponse.reference,
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

    console.error('Initiate Paystack payment error:', error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to initiate payment.',
    });
  }
};

/**
 * Verify Paystack payment
 * GET /api/payments/paystack/verify/:reference
 */
export const verifyPaystackPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const reference = req.params.reference as string;

    // Verify transaction with Paystack
    const verificationResult = await paystackService.verifyTransaction(reference);

    // Find transaction
    const transaction = await Transaction.findOne({
      transactionReference: reference,
    }).populate('contributionId');

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
      return;
    }

    // Update transaction
    transaction.status = verificationResult.status === 'success' ? 'success' : 'failed';
    transaction.callbackData = verificationResult;
    if (verificationResult.status !== 'success') {
      transaction.errorMessage = verificationResult.gateway_response;
    }
    await transaction.save();

    // Update contribution
    const contribution = await Contribution.findById(transaction.contributionId);
    if (contribution) {
      contribution.paymentStatus = verificationResult.status === 'success' ? 'success' : 'failed';
      contribution.transactionId = verificationResult.id.toString();
      await contribution.save();

      // If payment successful, update campaign amount
      if (verificationResult.status === 'success') {
        const campaign = await Campaign.findById(contribution.campaignId);
        if (campaign) {
          campaign.currentAmount += contribution.amount;
          await campaign.save();

          // Get donor name - from user or guest
          let donorName: string | undefined;
          if (!contribution.isAnonymous) {
            if (contribution.userId) {
              const user = await User.findById(contribution.userId);
              donorName = user?.name;
            } else {
              donorName = contribution.guestName;
            }
          }

          // Emit Socket.io event for real-time update
          socketService.emitCampaignUpdate(campaign._id.toString(), {
            currentAmount: campaign.currentAmount,
            completionPercentage: campaign.toJSON().completionPercentage || 0,
            newContribution: {
              amount: contribution.amount,
              isAnonymous: contribution.isAnonymous,
              donorName,
            },
          });

          socketService.emitNewContribution(campaign._id.toString(), {
            amount: contribution.amount,
            isAnonymous: contribution.isAnonymous,
            donorName,
            paymentMethod: 'card',
          });

          // Check if campaign is completed
          if (campaign.currentAmount >= campaign.goalAmount && campaign.status !== 'completed') {
            campaign.status = 'completed';
            await campaign.save();

            const totalContributions = await Contribution.countDocuments({
              campaignId: campaign._id,
              paymentStatus: 'success',
            });

            socketService.emitCampaignCompleted(campaign._id.toString(), {
              goalAmount: campaign.goalAmount,
              currentAmount: campaign.currentAmount,
              totalContributions,
            });
          }

          console.log('Campaign updated:', {
            campaignId: campaign._id,
            newAmount: campaign.currentAmount,
            completionPercentage: campaign.toJSON().completionPercentage,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: verificationResult.status === 'success'
        ? 'Payment successful!'
        : 'Payment failed',
      data: {
        status: verificationResult.status,
        amount: verificationResult.amount / 100,
        reference: verificationResult.reference,
        paid_at: verificationResult.paid_at,
        contributionId: contribution?._id,
      },
    });
  } catch (error) {
    console.error('Verify Paystack payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment.',
    });
  }
};

/**
 * Handle Paystack webhook
 * POST /api/payments/paystack/webhook
 */
export const handlePaystackWebhook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('Paystack Webhook received:', JSON.stringify(req.body, null, 2));

    // Process webhook data
    const webhookResult = paystackService.processWebhook(req.body);

    // Only process charge.success events
    if (webhookResult.event !== 'charge.success') {
      res.status(200).json({ status: 'ignored' });
      return;
    }

    // Find transaction by reference
    const transaction = await Transaction.findOne({
      transactionReference: webhookResult.reference,
    }).populate('contributionId');

    if (!transaction) {
      console.error('Transaction not found for reference:', webhookResult.reference);
      res.status(404).json({ status: 'transaction not found' });
      return;
    }

    // Update transaction
    transaction.status = webhookResult.success ? 'success' : 'failed';
    transaction.callbackData = req.body;
    await transaction.save();

    // Update contribution
    const contribution = await Contribution.findById(transaction.contributionId);
    if (contribution) {
      contribution.paymentStatus = webhookResult.success ? 'success' : 'failed';
      await contribution.save();

      // If payment successful, update campaign amount
      if (webhookResult.success) {
        const campaign = await Campaign.findById(contribution.campaignId);
        if (campaign) {
          campaign.currentAmount += contribution.amount;
          await campaign.save();

          // Get donor name - from user or guest
          let donorName: string | undefined;
          if (!contribution.isAnonymous) {
            if (contribution.userId) {
              const user = await User.findById(contribution.userId);
              donorName = user?.name;
            } else {
              donorName = contribution.guestName;
            }
          }

          // Emit Socket.io event for real-time update
          socketService.emitCampaignUpdate(campaign._id.toString(), {
            currentAmount: campaign.currentAmount,
            completionPercentage: campaign.toJSON().completionPercentage || 0,
            newContribution: {
              amount: contribution.amount,
              isAnonymous: contribution.isAnonymous,
              donorName,
            },
          });

          socketService.emitNewContribution(campaign._id.toString(), {
            amount: contribution.amount,
            isAnonymous: contribution.isAnonymous,
            donorName,
            paymentMethod: 'card',
          });

          // Check if campaign is completed
          if (campaign.currentAmount >= campaign.goalAmount && campaign.status !== 'completed') {
            campaign.status = 'completed';
            await campaign.save();

            const totalContributions = await Contribution.countDocuments({
              campaignId: campaign._id,
              paymentStatus: 'success',
            });

            socketService.emitCampaignCompleted(campaign._id.toString(), {
              goalAmount: campaign.goalAmount,
              currentAmount: campaign.currentAmount,
              totalContributions,
            });
          }

          console.log('Campaign updated via webhook:', {
            campaignId: campaign._id,
            newAmount: campaign.currentAmount,
          });
        }
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).json({ status: 'error' });
  }
};
