import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

// Test user credentials
const TEST_USER = {
  email: 'testdonor@example.com',
  password: 'Test1234!',
  name: 'Test Donor',
  phone: '254703757369',
};

// Test campaign data
const TEST_CAMPAIGN = {
  title: 'Test Campaign for Paystack',
  description: 'Testing Paystack card payment integration',
  goalAmount: 10000,
  category: 'education',
  imageUrl: 'https://example.com/image.jpg',
};

async function testPaystackIntegration() {
  try {
    console.log('🧪 Testing Paystack Integration\n');

    // Step 1: Register or login user
    console.log('1️⃣  Authenticating user...');
    let authToken: string;
    let userId: string;

    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
      authToken = registerResponse.data.data.token;
      userId = registerResponse.data.data.user._id;
      console.log('✅ User registered successfully');
    } catch (error: any) {
      if (error.response?.data?.message?.includes('already registered')) {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: TEST_USER.email,
          password: TEST_USER.password,
        });
        authToken = loginResponse.data.data.token;
        userId = loginResponse.data.data.user._id;
        console.log('✅ User logged in successfully');
      } else {
        throw error;
      }
    }

    // Step 2: Get existing campaigns or create one
    console.log('\n2️⃣  Getting campaign...');
    const campaignsResponse = await axios.get(`${BASE_URL}/campaigns`, {
      params: { status: 'active', limit: 1 },
    });

    let campaignId: string;

    if (campaignsResponse.data.data.campaigns.length > 0) {
      campaignId = campaignsResponse.data.data.campaigns[0]._id;
      console.log('✅ Using existing campaign:', campaignsResponse.data.data.campaigns[0].title);
    } else {
      console.log('No active campaigns found. Please create one manually.');
      return;
    }

    // Step 3: Initiate Paystack payment
    console.log('\n3️⃣  Initiating Paystack payment...');
    const paymentData = {
      campaignId: campaignId,
      amount: 100, // KES 100
      isAnonymous: false,
    };

    const initiateResponse = await axios.post(
      `${BASE_URL}/payments/paystack/initiate`,
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    console.log('✅ Paystack payment initiated successfully!');
    console.log('\n📋 Payment Details:');
    console.log('   Contribution ID:', initiateResponse.data.data.contributionId);
    console.log('   Reference:', initiateResponse.data.data.reference);
    console.log('   Access Code:', initiateResponse.data.data.access_code);
    console.log('\n🌐 Payment URL:');
    console.log('   ', initiateResponse.data.data.authorization_url);
    console.log('\n💡 To complete the payment:');
    console.log('   1. Open the payment URL in your browser');
    console.log('   2. Use test card: 4084084084084081');
    console.log('   3. CVV: 408, Expiry: Any future date, PIN: 0000');
    console.log('   4. OTP: 123456');

    // Step 4: Wait for user to complete payment
    console.log('\n⏳ Waiting 60 seconds for payment completion...');
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Step 5: Verify payment
    console.log('\n4️⃣  Verifying payment...');
    const verifyResponse = await axios.get(
      `${BASE_URL}/payments/paystack/verify/${initiateResponse.data.data.reference}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    console.log('✅ Payment verification response:');
    console.log('   Status:', verifyResponse.data.data.status);
    console.log('   Amount:', verifyResponse.data.data.amount, 'KES');
    console.log('   Paid At:', verifyResponse.data.data.paid_at || 'Not paid yet');

    if (verifyResponse.data.data.status === 'success') {
      console.log('\n🎉 Payment successful! Campaign updated.');
    } else {
      console.log('\n⚠️  Payment not completed yet or failed.');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testPaystackIntegration();
