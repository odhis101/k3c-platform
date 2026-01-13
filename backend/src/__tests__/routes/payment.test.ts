import request from 'supertest';
import app from '../../app';
import User from '../../models/User';
import Campaign from '../../models/Campaign';
import Contribution from '../../models/Contribution';
import Transaction from '../../models/Transaction';
import mpesaService from '../../services/mpesa.service';

// Mock the MPESA service
jest.mock('../../services/mpesa.service');

describe('Payment Routes - MPESA', () => {
  let userToken: string;
  let userId: string;
  let campaignId: string;

  const validUserData = {
    name: 'Test Donor',
    email: 'donor@test.com',
    phone: '+254712345678',
    password: 'SecurePass123!',
  };

  const validCampaignData = {
    title: 'Test Campaign',
    description: 'Help us build a new sanctuary for our growing congregation',
    goalAmount: 100000,
    category: 'Building',
    status: 'active',
  };

  beforeAll(async () => {
    // Create user and get token
    const user = await User.create(validUserData);
    userId = user._id.toString();

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: validUserData.email,
      password: validUserData.password,
    });

    userToken = loginResponse.body.data.token;

    // Create active campaign
    const campaign = await Campaign.create(validCampaignData);
    campaignId = campaign._id.toString();
  });

  describe('POST /api/payments/mpesa/initiate', () => {
    const validPaymentData = {
      campaignId: '',
      amount: 1000,
      phoneNumber: '+254712345678',
      isAnonymous: false,
    };

    beforeEach(() => {
      validPaymentData.campaignId = campaignId;

      // Mock successful MPESA response
      (mpesaService.initiateSTKPush as jest.Mock).mockResolvedValue({
        MerchantRequestID: 'mock-merchant-123',
        CheckoutRequestID: 'mock-checkout-456',
        ResponseCode: '0',
        ResponseDescription: 'Success. Request accepted for processing',
        CustomerMessage: 'Success. Request accepted for processing',
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should initiate MPESA payment successfully', async () => {
      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPaymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.checkoutRequestID).toBe('mock-checkout-456');
      expect(response.body.data.merchantRequestID).toBe('mock-merchant-123');
      expect(response.body.data.contributionId).toBeDefined();

      // Verify contribution was created
      const contribution = await Contribution.findById(
        response.body.data.contributionId
      );
      expect(contribution).toBeDefined();
      expect(contribution?.amount).toBe(1000);
      expect(contribution?.paymentMethod).toBe('mpesa');
      expect(contribution?.paymentStatus).toBe('pending');

      // Verify transaction was created
      const transaction = await Transaction.findOne({
        contributionId: contribution?._id,
      });
      expect(transaction).toBeDefined();
      expect(transaction?.provider).toBe('mpesa');
      expect(transaction?.status).toBe('pending');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .send(validPaymentData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with missing campaignId', async () => {
      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1000,
          phoneNumber: '+254712345678',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail with amount less than minimum', async () => {
      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validPaymentData,
          amount: 5,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail with invalid phone number', async () => {
      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validPaymentData,
          phoneNumber: '123456',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail with non-existent campaign', async () => {
      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validPaymentData,
          campaignId: '507f1f77bcf86cd799439011',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Campaign not found.');
    });

    it('should fail with inactive campaign', async () => {
      const inactiveCampaign = await Campaign.create({
        ...validCampaignData,
        title: 'Inactive Campaign',
        status: 'draft',
      });

      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...validPaymentData,
          campaignId: inactiveCampaign._id.toString(),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Campaign is not active.');
    });

    it('should accept different Kenyan phone formats', async () => {
      const phoneFormats = ['0712345678', '+254712345678', '254712345678'];

      for (const phone of phoneFormats) {
        const response = await request(app)
          .post('/api/payments/mpesa/initiate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            ...validPaymentData,
            phoneNumber: phone,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should handle MPESA service errors', async () => {
      (mpesaService.initiateSTKPush as jest.Mock).mockRejectedValue(
        new Error('MPESA service unavailable')
      );

      const response = await request(app)
        .post('/api/payments/mpesa/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPaymentData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('MPESA service unavailable');
    });
  });

  describe('POST /api/payments/mpesa/callback', () => {
    let contributionId: string;
    let checkoutRequestID: string;

    beforeEach(async () => {
      // Create a pending contribution and transaction
      const contribution = await Contribution.create({
        userId,
        campaignId,
        amount: 1000,
        paymentMethod: 'mpesa',
        paymentStatus: 'pending',
        paymentReference: 'test-checkout-123',
      });
      contributionId = contribution._id.toString();
      checkoutRequestID = 'test-checkout-123';

      await Transaction.create({
        contributionId: contribution._id,
        provider: 'mpesa',
        transactionReference: checkoutRequestID,
        amount: 1000,
        status: 'pending',
      });

      // Mock MPESA callback processor
      (mpesaService.processCallback as jest.Mock).mockReturnValue({
        success: true,
        merchantRequestID: 'mock-merchant-123',
        checkoutRequestID: checkoutRequestID,
        resultCode: 0,
        resultDescription: 'The service request is processed successfully.',
        amount: 1000,
        mpesaReceiptNumber: 'ABC123XYZ',
        transactionDate: '20231215120000',
        phoneNumber: '254712345678',
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should process successful payment callback', async () => {
      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mock-merchant-123',
            CheckoutRequestID: checkoutRequestID,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
                { Name: 'TransactionDate', Value: 20231215120000 },
                { Name: 'PhoneNumber', Value: 254712345678 },
              ],
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(callbackData)
        .expect(200);

      expect(response.body.ResultCode).toBe(0);
      expect(response.body.ResultDesc).toBe('Accepted');

      // Verify contribution was updated
      const contribution = await Contribution.findById(contributionId);
      expect(contribution?.paymentStatus).toBe('success');
      expect(contribution?.mpesaReceiptNumber).toBe('ABC123XYZ');

      // Verify transaction was updated
      const transaction = await Transaction.findOne({
        transactionReference: checkoutRequestID,
      });
      expect(transaction?.status).toBe('success');

      // Verify campaign was updated
      const campaign = await Campaign.findById(campaignId);
      expect(campaign?.currentAmount).toBe(1000);
    });

    it('should process failed payment callback', async () => {
      (mpesaService.processCallback as jest.Mock).mockReturnValue({
        success: false,
        merchantRequestID: 'mock-merchant-123',
        checkoutRequestID: checkoutRequestID,
        resultCode: 1,
        resultDescription: 'The balance is insufficient for the transaction',
      });

      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mock-merchant-123',
            CheckoutRequestID: checkoutRequestID,
            ResultCode: 1,
            ResultDesc: 'The balance is insufficient for the transaction',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(callbackData)
        .expect(200);

      expect(response.body.ResultCode).toBe(0);
      expect(response.body.ResultDesc).toBe('Accepted');

      // Verify contribution status is failed
      const contribution = await Contribution.findById(contributionId);
      expect(contribution?.paymentStatus).toBe('failed');

      // Verify transaction status is failed
      const transaction = await Transaction.findOne({
        transactionReference: checkoutRequestID,
      });
      expect(transaction?.status).toBe('failed');
      expect(transaction?.errorMessage).toBe(
        'The balance is insufficient for the transaction'
      );

      // Verify campaign amount was NOT updated
      const campaign = await Campaign.findById(campaignId);
      expect(campaign?.currentAmount).toBe(0);
    });

    it('should handle callback for non-existent transaction', async () => {
      (mpesaService.processCallback as jest.Mock).mockReturnValue({
        success: true,
        merchantRequestID: 'mock-merchant-999',
        checkoutRequestID: 'non-existent-checkout',
        resultCode: 0,
        resultDescription: 'Success',
      });

      const callbackData = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'mock-merchant-999',
            CheckoutRequestID: 'non-existent-checkout',
            ResultCode: 0,
            ResultDesc: 'Success',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(callbackData)
        .expect(404);

      expect(response.body.ResultCode).toBe(1);
      expect(response.body.ResultDesc).toBe('Transaction not found');
    });
  });

  describe('GET /api/payments/mpesa/status/:contributionId', () => {
    let contributionId: string;

    beforeEach(async () => {
      const contribution = await Contribution.create({
        userId,
        campaignId,
        amount: 1000,
        paymentMethod: 'mpesa',
        paymentStatus: 'success',
        paymentReference: 'test-ref-123',
        mpesaReceiptNumber: 'XYZ789',
      });
      contributionId = contribution._id.toString();

      await Transaction.create({
        contributionId: contribution._id,
        provider: 'mpesa',
        transactionReference: 'test-ref-123',
        amount: 1000,
        status: 'success',
      });
    });

    it('should get payment status successfully', async () => {
      const response = await request(app)
        .get(`/api/payments/mpesa/status/${contributionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contributionId).toBe(contributionId);
      expect(response.body.data.paymentStatus).toBe('success');
      expect(response.body.data.amount).toBe(1000);
      expect(response.body.data.mpesaReceiptNumber).toBe('XYZ789');
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.status).toBe('success');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/payments/mpesa/status/${contributionId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-existent contribution', async () => {
      const response = await request(app)
        .get('/api/payments/mpesa/status/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contribution not found.');
    });

    it('should fail when user tries to access another user contribution', async () => {
      // Create another user
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        phone: '+254712345679',
        password: 'SecurePass123!',
      });

      // Create contribution for other user
      const otherContribution = await Contribution.create({
        userId: otherUser._id,
        campaignId,
        amount: 500,
        paymentMethod: 'mpesa',
        paymentStatus: 'success',
        paymentReference: 'other-ref-456',
      });

      const response = await request(app)
        .get(`/api/payments/mpesa/status/${otherContribution._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied.');
    });
  });
});
