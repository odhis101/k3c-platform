import { Router } from 'express';
import {
  initiateMPESAPayment,
  handleMPESACallback,
  checkMPESAPaymentStatus,
  initiatePaystackPayment,
  verifyPaystackPayment,
  handlePaystackWebhook,
} from '../controllers/payment.controller';
import { authenticateUser, optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/payments/mpesa/initiate
 * @desc    Initiate MPESA STK Push payment
 * @access  Public (Optional auth - can donate as guest)
 */
router.post('/mpesa/initiate', optionalAuth, initiateMPESAPayment);

/**
 * @route   POST /api/payments/mpesa/callback
 * @desc    Handle MPESA payment callback from Safaricom
 * @access  Public (Called by Safaricom servers)
 */
router.post('/mpesa/callback', handleMPESACallback);

/**
 * @route   GET /api/payments/mpesa/status/:contributionId
 * @desc    Check MPESA payment status
 * @access  Public (Optional auth)
 */
router.get('/mpesa/status/:contributionId', optionalAuth, checkMPESAPaymentStatus);

// ===== PAYSTACK ROUTES =====

/**
 * @route   POST /api/payments/paystack/initiate
 * @desc    Initiate Paystack card payment
 * @access  Public (Optional auth - can donate as guest)
 */
router.post('/paystack/initiate', optionalAuth, initiatePaystackPayment);

/**
 * @route   GET /api/payments/paystack/verify/:reference
 * @desc    Verify Paystack payment
 * @access  Public (Optional auth)
 */
router.get('/paystack/verify/:reference', optionalAuth, verifyPaystackPayment);

/**
 * @route   POST /api/payments/paystack/webhook
 * @desc    Handle Paystack payment webhook
 * @access  Public (Called by Paystack servers)
 */
router.post('/paystack/webhook', handlePaystackWebhook);

export default router;
