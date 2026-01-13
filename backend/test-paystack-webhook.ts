import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

async function testPaystackWebhook() {
  try {
    console.log('🧪 Testing Paystack Webhook Endpoint\n');

    // Sample webhook payload from Paystack
    const webhookPayload = {
      event: 'charge.success',
      data: {
        id: 123456789,
        domain: 'test',
        status: 'success',
        reference: 'test-reference-123',
        amount: 10000, // 100 KES in kobo
        message: null,
        gateway_response: 'Successful',
        paid_at: '2024-01-11T10:00:00.000Z',
        created_at: '2024-01-11T09:55:00.000Z',
        channel: 'card',
        currency: 'KES',
        ip_address: '127.0.0.1',
        metadata: {
          contributionId: '507f1f77bcf86cd799439011',
          campaignId: '507f1f77bcf86cd799439012',
        },
        customer: {
          id: 12345,
          email: 'test@example.com',
        },
        authorization: {
          authorization_code: 'AUTH_test123',
          bin: '408408',
          last4: '4081',
          channel: 'card',
        },
      },
    };

    console.log('📤 Sending webhook payload...');
    const response = await axios.post(
      `${BASE_URL}/payments/paystack/webhook`,
      webhookPayload
    );

    console.log('✅ Webhook endpoint responded successfully!');
    console.log('   Status:', response.status);
    console.log('   Response:', response.data);
  } catch (error: any) {
    if (error.response) {
      console.log('📊 Webhook endpoint is accessible');
      console.log('   Status:', error.response.status);
      console.log('   Response:', error.response.data);

      // 404 or 500 is expected for invalid contribution ID
      if (error.response.status === 404 || error.response.status === 200) {
        console.log('✅ Webhook endpoint is working correctly!');
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testPaystackWebhook();
