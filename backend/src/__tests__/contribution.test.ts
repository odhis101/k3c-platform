import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import Donor from '../models/Donor';
import Campaign from '../models/Campaign';
import Contribution from '../models/Contribution';
import { generateToken } from '../utils/jwt';

describe('Contribution Routes', () => {
  let donorToken: string;
  let donorId: string;
  let campaignId: string;
  let contributionId: string;

  beforeAll(async () => {
    // Create a test donor
    const donor = await Donor.create({
      name: 'Test Contributor',
      email: 'contributor@test.com',
      phone: '254712345678',
      password: 'password123',
      isVerified: true,
    });
    donorId = donor._id.toString();
    donorToken = generateToken(donorId, 'donor');

    // Create a test campaign
    const campaign = await Campaign.create({
      title: 'Test Campaign for Contributions',
      description: 'Testing contribution tracking',
      goalAmount: 50000,
      currentAmount: 0,
      currency: 'KES',
      status: 'active',
      category: 'Education',
      startDate: new Date(),
    });
    campaignId = campaign._id.toString();

    // Create test contributions
    const contribution1 = await Contribution.create({
      campaign: campaignId,
      donor: donorId,
      amount: 1000,
      paymentMethod: 'mpesa',
      paymentStatus: 'success',
      mpesaReceiptNumber: 'ABC123XYZ',
      isAnonymous: false,
    });
    contributionId = contribution1._id.toString();

    await Contribution.create({
      campaign: campaignId,
      donor: donorId,
      amount: 2000,
      paymentMethod: 'card',
      paymentStatus: 'success',
      paystackReference: 'ref_456xyz',
      isAnonymous: true,
    });

    await Contribution.create({
      campaign: campaignId,
      donor: donorId,
      amount: 500,
      paymentMethod: 'mpesa',
      paymentStatus: 'pending',
      isAnonymous: false,
    });
  });

  afterAll(async () => {
    await Donor.deleteMany({});
    await Campaign.deleteMany({});
    await Contribution.deleteMany({});
  });

  describe('GET /api/contributions/my-contributions', () => {
    it('should get all contributions for authenticated donor', async () => {
      const response = await request(app)
        .get('/api/contributions/my-contributions')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contributions).toBeInstanceOf(Array);
      expect(response.body.data.contributions.length).toBe(3);
      expect(response.body.data.count).toBe(3);

      // Verify contribution structure
      const contribution = response.body.data.contributions[0];
      expect(contribution).toHaveProperty('amount');
      expect(contribution).toHaveProperty('paymentMethod');
      expect(contribution).toHaveProperty('paymentStatus');
      expect(contribution).toHaveProperty('campaign');
      expect(contribution.campaign).toHaveProperty('title');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/contributions/my-contributions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return contributions sorted by most recent first', async () => {
      const response = await request(app)
        .get('/api/contributions/my-contributions')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      const contributions = response.body.data.contributions;

      // Check that dates are in descending order
      for (let i = 0; i < contributions.length - 1; i++) {
        const date1 = new Date(contributions[i].createdAt);
        const date2 = new Date(contributions[i + 1].createdAt);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });

  describe('GET /api/contributions/stats', () => {
    it('should get contribution statistics for authenticated donor', async () => {
      const response = await request(app)
        .get('/api/contributions/stats')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAmount');
      expect(response.body.data).toHaveProperty('totalContributions');
      expect(response.body.data).toHaveProperty('averageContribution');
      expect(response.body.data).toHaveProperty('campaignsSupported');

      // Only successful contributions should be counted (1000 + 2000 = 3000)
      expect(response.body.data.totalAmount).toBe(3000);
      expect(response.body.data.totalContributions).toBe(2);
      expect(response.body.data.averageContribution).toBe(1500);
      expect(response.body.data.campaignsSupported).toBe(1);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/contributions/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/contributions/:id', () => {
    it('should get a single contribution by ID', async () => {
      const response = await request(app)
        .get(`/api/contributions/${contributionId}`)
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('amount', 1000);
      expect(response.body.data).toHaveProperty('paymentMethod', 'mpesa');
      expect(response.body.data).toHaveProperty('mpesaReceiptNumber', 'ABC123XYZ');
      expect(response.body.data).toHaveProperty('campaign');
      expect(response.body.data.campaign).toHaveProperty('title');
    });

    it('should return 404 if contribution not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/contributions/${fakeId}`)
        .set('Authorization', `Bearer ${donorToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contribution not found');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get(`/api/contributions/${contributionId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not allow access to another donor\'s contribution', async () => {
      // Create another donor
      const otherDonor = await Donor.create({
        name: 'Other Donor',
        email: 'other@test.com',
        phone: '254787654321',
        password: 'password123',
        isVerified: true,
      });
      const otherToken = generateToken(otherDonor._id.toString(), 'donor');

      const response = await request(app)
        .get(`/api/contributions/${contributionId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contribution not found');

      // Cleanup
      await Donor.findByIdAndDelete(otherDonor._id);
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for donor with no contributions', async () => {
      // Create a new donor with no contributions
      const newDonor = await Donor.create({
        name: 'New Donor',
        email: 'new@test.com',
        phone: '254700000000',
        password: 'password123',
        isVerified: true,
      });
      const newToken = generateToken(newDonor._id.toString(), 'donor');

      const response = await request(app)
        .get('/api/contributions/my-contributions')
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contributions).toEqual([]);
      expect(response.body.data.count).toBe(0);

      // Cleanup
      await Donor.findByIdAndDelete(newDonor._id);
    });

    it('should return zero stats for donor with no successful contributions', async () => {
      // Create a new donor with only pending/failed contributions
      const newDonor = await Donor.create({
        name: 'No Success Donor',
        email: 'nosuccess@test.com',
        phone: '254711111111',
        password: 'password123',
        isVerified: true,
      });
      const newToken = generateToken(newDonor._id.toString(), 'donor');

      await Contribution.create({
        campaign: campaignId,
        donor: newDonor._id,
        amount: 1000,
        paymentMethod: 'mpesa',
        paymentStatus: 'failed',
        isAnonymous: false,
      });

      const response = await request(app)
        .get('/api/contributions/stats')
        .set('Authorization', `Bearer ${newToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAmount).toBe(0);
      expect(response.body.data.totalContributions).toBe(0);
      expect(response.body.data.averageContribution).toBe(0);
      expect(response.body.data.campaignsSupported).toBe(0);

      // Cleanup
      await Donor.findByIdAndDelete(newDonor._id);
      await Contribution.deleteMany({ donor: newDonor._id });
    });
  });
});
