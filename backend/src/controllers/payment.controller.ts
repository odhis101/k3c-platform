import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import Contribution from '../models/Contribution';
import Transaction from '../models/Transaction';
import Campaign from '../models/Campaign';
import mpesaService from '../services/mpesa.service';
import paystackService from '../services/paystack.service';
import socketService from '../services/socket.service';
import User from '../models/User';

// Validation schemas
const initiateMPESAPaymentSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  amount: z.number().min(10, 'Minimum amount is KES 10'),
  phoneNumber: z
    .string()
    .regex(/^(\+?254|0)[17]\d{8}$/, 'Invalid Kenyan phone number'),
  isAnonymous: z.boolean().optional().default(false),
  guestEmail: z.string().email('Invalid email').optional(),
  guestName: z.string().min(1, 'Name is required for guest donations').optional(),
});

/**
 * Initiate MPESA STK Push payment
 * POST /api/payments/mpesa/initiate
 */
export const initiateMPESAPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = initiateMPESAPaymentSchema.parse(req.body);
    const userId = req.user?._id;

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
      paymentMethod: 'mpesa',
      paymentStatus: 'pending',
      paymentReference: `MPESA-${Date.now()}`,
      isAnonymous: validatedData.isAnonymous,
      guestEmail: validatedData.guestEmail,
      guestName: validatedData.guestName,
    });

    // Initiate MPESA STK Push
    const mpesaResponse = await mpesaService.initiateSTKPush({
      phoneNumber: validatedData.phoneNumber,
      amount: validatedData.amount,
      accountReference: contribution._id.toString(),
      transactionDesc: `Donation to ${campaign.title}`,
    });

    // Create transaction record
    await Transaction.create({
      contributionId: contribution._id,
      provider: 'mpesa',
      transactionReference: mpesaResponse.CheckoutRequestID,
      amount: validatedData.amount,
      status: mpesaResponse.ResponseCode === '0' ? 'pending' : 'failed',
      providerResponse: mpesaResponse,
    });

    // Update contribution with checkout request ID
    contribution.paymentReference = mpesaResponse.CheckoutRequestID;
    await contribution.save();

    res.status(200).json({
      success: true,
      message: mpesaResponse.CustomerMessage || 'Payment initiated successfully!',
      data: {
        contributionId: contribution._id,
        checkoutRequestID: mpesaResponse.CheckoutRequestID,
        merchantRequestID: mpesaResponse.MerchantRequestID,
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

    console.error('Initiate MPESA payment error:', error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to initiate payment.',
    });
  }
};

/**
 * Handle MPESA callback
 * POST /api/payments/mpesa/callback
 */
export const handleMPESACallback = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log('MPESA Callback received:', JSON.stringify(req.body, null, 2));

    // Process callback data
    const callbackResult = mpesaService.processCallback(req.body);

    // Find transaction by CheckoutRequestID
    const transaction = await Transaction.findOne({
      transactionReference: callbackResult.checkoutRequestID,
    }).populate('contributionId');

    if (!transaction) {
      console.error('Transaction not found for CheckoutRequestID:', callbackResult.checkoutRequestID);
      res.status(404).json({
        ResultCode: 1,
        ResultDesc: 'Transaction not found',
      });
      return;
    }

    // Update transaction
    transaction.status = callbackResult.success ? 'success' : 'failed';
    transaction.callbackData = req.body;
    if (!callbackResult.success) {
      transaction.errorMessage = callbackResult.resultDescription;
    }
    await transaction.save();

    // Update contribution
    const contribution = await Contribution.findById(transaction.contributionId);
    if (contribution) {
      contribution.paymentStatus = callbackResult.success ? 'success' : 'failed';
      if (callbackResult.mpesaReceiptNumber) {
        contribution.mpesaReceiptNumber = callbackResult.mpesaReceiptNumber;
      }
      await contribution.save();

      // If payment successful, update campaign amount
      if (callbackResult.success) {
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
            paymentMethod: 'mpesa',
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

    // Respond to Safaricom
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  } catch (error) {
    console.error('MPESA callback error:', error);
    res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Internal server error',
    });
  }
};

/**
 * Check payment status
 * GET /api/payments/mpesa/status/:contributionId
 */
export const checkMPESAPaymentStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { contributionId } = req.params;

    // Find contribution
    const contribution = await Contribution.findById(contributionId);
    if (!contribution) {
      res.status(404).json({
        success: false,
        message: 'Contribution not found.',
      });
      return;
    }

    // Check if user owns this contribution (only if both user and contribution.userId exist)
    if (req.user && contribution.userId) {
      if (contribution.userId.toString() !== req.user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied.',
        });
        return;
      }
    }
    // For guest donations (no userId), allow anyone to check with the contribution ID

    // Find associated transaction
    const transaction = await Transaction.findOne({
      contributionId: contribution._id,
    });

    res.status(200).json({
      success: true,
      data: {
        contributionId: contribution._id,
        paymentStatus: contribution.paymentStatus,
        amount: contribution.amount,
        mpesaReceiptNumber: contribution.mpesaReceiptNumber,
        transaction: transaction
          ? {
              status: transaction.status,
              transactionReference: transaction.transactionReference,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status.',
    });
  }
};

export * from './payment.controller.paystack';
