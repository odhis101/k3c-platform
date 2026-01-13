import mongoose from 'mongoose';
import Contribution, { IContribution } from '../../models/Contribution';
import User from '../../models/User';
import Campaign from '../../models/Campaign';

describe('Contribution Model Tests', () => {
  let userId: mongoose.Types.ObjectId;
  let campaignId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      name: 'Test Donor',
      email: 'donor@example.com',
      phone: '+254712345678',
      password: 'Password123!',
    });
    userId = user._id as mongoose.Types.ObjectId;

    // Create a test campaign
    const campaign = await Campaign.create({
      title: 'Test Campaign',
      description: 'Test description for the campaign',
      goalAmount: 10000,
      category: 'General',
      startDate: new Date(),
    });
    campaignId = campaign._id as mongoose.Types.ObjectId;
  });

  const validContributionData = {
    amount: 1000,
    paymentMethod: 'mpesa' as const,
    paymentReference: 'MPESA-TEST-' + Date.now(),
  };

  describe('Contribution Creation', () => {
    it('should create a valid contribution', async () => {
      const contribution = await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
      });

      expect(contribution).toBeDefined();
      expect(contribution.userId.toString()).toBe(userId.toString());
      expect(contribution.campaignId.toString()).toBe(campaignId.toString());
      expect(contribution.amount).toBe(validContributionData.amount);
      expect(contribution.paymentMethod).toBe('mpesa');
      expect(contribution.paymentStatus).toBe('pending');
      expect(contribution.currency).toBe('KES');
      expect(contribution.isAnonymous).toBe(false);
    });

    it('should set default values correctly', async () => {
      const contribution = await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
      });

      expect(contribution.paymentStatus).toBe('pending');
      expect(contribution.currency).toBe('KES');
      expect(contribution.isAnonymous).toBe(false);
      expect(contribution.transactionId).toBeNull();
      expect(contribution.message).toBeNull();
    });
  });

  describe('Contribution Validation', () => {
    it('should fail without required fields', async () => {
      const contribution = new Contribution({});

      let error;
      try {
        await contribution.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.userId).toBeDefined();
      expect(error.errors.campaignId).toBeDefined();
      expect(error.errors.amount).toBeDefined();
      expect(error.errors.paymentMethod).toBeDefined();
      expect(error.errors.paymentReference).toBeDefined();
    });

    it('should fail with amount less than minimum', async () => {
      const contribution = new Contribution({
        ...validContributionData,
        userId,
        campaignId,
        amount: 5, // Less than minimum (10)
      });

      let error;
      try {
        await contribution.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.amount).toBeDefined();
    });

    it('should accept valid payment methods', async () => {
      const paymentMethods = ['mpesa', 'card'] as const;

      for (const method of paymentMethods) {
        const contribution = await Contribution.create({
          ...validContributionData,
          userId,
          campaignId,
          paymentMethod: method,
          paymentReference: `REF-${method}-${Date.now()}`,
        });

        expect(contribution.paymentMethod).toBe(method);
      }
    });

    it('should fail with invalid payment method', async () => {
      const contribution = new Contribution({
        ...validContributionData,
        userId,
        campaignId,
        paymentMethod: 'invalid' as any,
      });

      let error;
      try {
        await contribution.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.paymentMethod).toBeDefined();
    });

    it('should enforce unique payment reference', async () => {
      await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
      });

      let error;
      try {
        await Contribution.create({
          ...validContributionData,
          userId,
          campaignId,
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it('should accept valid payment statuses', async () => {
      const statuses = ['pending', 'success', 'failed'] as const;

      for (const status of statuses) {
        const contribution = await Contribution.create({
          ...validContributionData,
          userId,
          campaignId,
          paymentStatus: status,
          paymentReference: `REF-${status}-${Date.now()}`,
        });

        expect(contribution.paymentStatus).toBe(status);
      }
    });

    it('should limit message length', async () => {
      const longMessage = 'a'.repeat(501); // Exceeds 500 character limit

      const contribution = new Contribution({
        ...validContributionData,
        userId,
        campaignId,
        message: longMessage,
      });

      let error;
      try {
        await contribution.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.message).toBeDefined();
    });
  });

  describe('Contribution with References', () => {
    it('should populate user reference', async () => {
      const contribution = await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
      });

      const populated = await Contribution.findById(contribution._id).populate('userId');

      expect(populated?.userId).toBeDefined();
      expect((populated?.userId as any).name).toBe('Test Donor');
      expect((populated?.userId as any).email).toBe('donor@example.com');
    });

    it('should populate campaign reference', async () => {
      const contribution = await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
      });

      const populated = await Contribution.findById(contribution._id).populate(
        'campaignId'
      );

      expect(populated?.campaignId).toBeDefined();
      expect((populated?.campaignId as any).title).toBe('Test Campaign');
    });
  });

  describe('Contribution Payment Lifecycle', () => {
    it('should update from pending to success', async () => {
      const contribution = await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
      });

      expect(contribution.paymentStatus).toBe('pending');

      contribution.paymentStatus = 'success';
      contribution.transactionId = 'MPESA123456789';
      await contribution.save();

      const updated = await Contribution.findById(contribution._id);
      expect(updated?.paymentStatus).toBe('success');
      expect(updated?.transactionId).toBe('MPESA123456789');
    });

    it('should handle anonymous contributions', async () => {
      const contribution = await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
        isAnonymous: true,
      });

      expect(contribution.isAnonymous).toBe(true);
    });

    it('should store contribution message', async () => {
      const message = 'God bless this ministry!';
      const contribution = await Contribution.create({
        ...validContributionData,
        userId,
        campaignId,
        message,
      });

      expect(contribution.message).toBe(message);
    });
  });

  describe('Contribution Queries', () => {
    beforeEach(async () => {
      // Create multiple contributions
      for (let i = 0; i < 5; i++) {
        await Contribution.create({
          userId,
          campaignId,
          amount: 100 * (i + 1),
          paymentMethod: 'mpesa',
          paymentReference: `REF-${i}-${Date.now()}`,
          paymentStatus: i % 2 === 0 ? 'success' : 'pending',
        });
      }
    });

    it('should find contributions by user', async () => {
      const userContributions = await Contribution.find({ userId });
      expect(userContributions).toHaveLength(5);
    });

    it('should find contributions by campaign', async () => {
      const campaignContributions = await Contribution.find({ campaignId });
      expect(campaignContributions).toHaveLength(5);
    });

    it('should find successful contributions', async () => {
      const successfulContributions = await Contribution.find({
        paymentStatus: 'success',
      });
      expect(successfulContributions).toHaveLength(3);
    });

    it('should calculate total contribution amount', async () => {
      const contributions = await Contribution.find({ paymentStatus: 'success' });
      const total = contributions.reduce((sum, c) => sum + c.amount, 0);

      expect(total).toBe(900); // 100 + 300 + 500
    });
  });
});
