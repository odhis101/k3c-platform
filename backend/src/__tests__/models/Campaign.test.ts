import Campaign, { ICampaign } from '../../models/Campaign';

describe('Campaign Model Tests', () => {
  const validCampaignData = {
    title: 'Church Building Fund',
    description: 'Help us build a new sanctuary for our growing congregation',
    goalAmount: 500000,
    category: 'Building',
    startDate: new Date(),
  };

  describe('Campaign Creation', () => {
    it('should create a valid campaign', async () => {
      const campaign = await Campaign.create(validCampaignData);

      expect(campaign).toBeDefined();
      expect(campaign.title).toBe(validCampaignData.title);
      expect(campaign.description).toBe(validCampaignData.description);
      expect(campaign.goalAmount).toBe(validCampaignData.goalAmount);
      expect(campaign.currentAmount).toBe(0);
      expect(campaign.currency).toBe('KES');
      expect(campaign.status).toBe('draft');
      expect(campaign.category).toBe(validCampaignData.category);
    });

    it('should set default values correctly', async () => {
      const campaign = await Campaign.create(validCampaignData);

      expect(campaign.currentAmount).toBe(0);
      expect(campaign.currency).toBe('KES');
      expect(campaign.status).toBe('draft');
    });
  });

  describe('Campaign Validation', () => {
    it('should fail without required fields', async () => {
      const campaign = new Campaign({});

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.goalAmount).toBeDefined();
      // Note: category has default value 'General', so won't fail when missing
    });

    it('should fail with short title', async () => {
      const campaign = new Campaign({
        ...validCampaignData,
        title: 'Ab', // Too short
      });

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
    });

    it('should fail with short description', async () => {
      const campaign = new Campaign({
        ...validCampaignData,
        description: 'Short', // Too short
      });

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.description).toBeDefined();
    });

    it('should fail with goal amount less than minimum', async () => {
      const campaign = new Campaign({
        ...validCampaignData,
        goalAmount: 50, // Less than 100
      });

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.goalAmount).toBeDefined();
    });

    it('should accept valid category values', async () => {
      const categories = [
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
      ];

      for (const category of categories) {
        const campaign = await Campaign.create({
          ...validCampaignData,
          title: `${category} Fund`,
          category,
        });

        expect(campaign.category).toBe(category);
      }
    });

    it('should fail with invalid category', async () => {
      const campaign = new Campaign({
        ...validCampaignData,
        category: 'InvalidCategory',
      });

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    it('should fail with invalid status', async () => {
      const campaign = new Campaign({
        ...validCampaignData,
        status: 'invalid' as any,
      });

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    it('should fail if end date is before start date', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before

      const campaign = new Campaign({
        ...validCampaignData,
        startDate,
        endDate,
      });

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.endDate).toBeDefined();
    });
  });

  describe('Campaign Virtuals', () => {
    it('should calculate completion percentage correctly', async () => {
      const campaign = await Campaign.create({
        ...validCampaignData,
        goalAmount: 1000,
        currentAmount: 250,
      });

      const campaignWithVirtuals = campaign.toJSON();
      expect(campaignWithVirtuals.completionPercentage).toBe(25);
    });

    it('should cap completion percentage at 100%', async () => {
      const campaign = await Campaign.create({
        ...validCampaignData,
        goalAmount: 1000,
        currentAmount: 1500, // More than goal
      });

      const campaignWithVirtuals = campaign.toJSON();
      expect(campaignWithVirtuals.completionPercentage).toBe(100);
    });

    it('should calculate remaining amount correctly', async () => {
      const campaign = await Campaign.create({
        ...validCampaignData,
        goalAmount: 1000,
        currentAmount: 250,
      });

      const campaignWithVirtuals = campaign.toJSON();
      expect(campaignWithVirtuals.remainingAmount).toBe(750);
    });

    it('should return 0 remaining when goal is exceeded', async () => {
      const campaign = await Campaign.create({
        ...validCampaignData,
        goalAmount: 1000,
        currentAmount: 1500,
      });

      const campaignWithVirtuals = campaign.toJSON();
      expect(campaignWithVirtuals.remainingAmount).toBe(0);
    });
  });

  describe('Campaign Updates', () => {
    it('should update currentAmount when contribution is made', async () => {
      const campaign = await Campaign.create(validCampaignData);

      expect(campaign.currentAmount).toBe(0);

      campaign.currentAmount += 5000;
      await campaign.save();

      const updated = await Campaign.findById(campaign._id);
      expect(updated?.currentAmount).toBe(5000);
    });

    it('should update status', async () => {
      const campaign = await Campaign.create(validCampaignData);

      expect(campaign.status).toBe('draft');

      campaign.status = 'active';
      await campaign.save();

      const updated = await Campaign.findById(campaign._id);
      expect(updated?.status).toBe('active');
    });

    it('should not allow negative currentAmount', async () => {
      const campaign = await Campaign.create(validCampaignData);

      campaign.currentAmount = -100;

      let error;
      try {
        await campaign.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.currentAmount).toBeDefined();
    });
  });
});
