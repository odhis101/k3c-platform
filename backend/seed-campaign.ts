import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Campaign from './src/models/Campaign';

dotenv.config();

async function seedCampaign() {
  try {
    console.log('📦 Seeding test campaign...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    // Check if test campaign already exists
    const existing = await Campaign.findOne({ title: 'Test Campaign for Paystack' });

    if (existing) {
      console.log('✅ Test campaign already exists:');
      console.log('   ID:', existing._id);
      console.log('   Title:', existing.title);
      console.log('   Status:', existing.status);
      await mongoose.disconnect();
      return;
    }

    // Create test campaign
    const campaign = await Campaign.create({
      title: 'Test Campaign for Paystack',
      description: 'This is a test campaign to validate Paystack card payment integration. All donations will go towards improving the K3C Smart Giving Platform.',
      goalAmount: 10000,
      currentAmount: 0,
      category: 'Education',
      imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });

    console.log('✅ Test campaign created successfully!');
    console.log('   ID:', campaign._id);
    console.log('   Title:', campaign.title);
    console.log('   Goal Amount: KES', campaign.goalAmount);
    console.log('   Status:', campaign.status);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding campaign:', error);
    process.exit(1);
  }
}

seedCampaign();
