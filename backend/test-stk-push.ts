import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY!;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET!;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE!;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY!;
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox';

const baseURL =
  MPESA_ENVIRONMENT === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

/**
 * Generate OAuth token
 */
async function generateToken(): Promise<string> {
  try {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');

    const response = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    console.log('✅ OAuth token generated successfully');
    return response.data.access_token;
  } catch (error: any) {
    console.error('❌ Token generation error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate timestamp
 */
function generateTimestamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * Generate password
 */
function generatePassword(timestamp: string): string {
  const data = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(data).toString('base64');
}

/**
 * Format phone number
 */
function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

  if (formatted.startsWith('+254')) {
    formatted = formatted.substring(1);
  } else if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  } else if (!formatted.startsWith('254')) {
    formatted = '254' + formatted;
  }

  return formatted;
}

/**
 * Send STK Push
 */
async function sendSTKPush(phoneNumber: string, amount: number) {
  try {
    console.log('\n🚀 Initiating STK Push...');
    console.log('📱 Phone:', phoneNumber);
    console.log('💰 Amount: KES', amount);
    console.log('🏢 Environment:', MPESA_ENVIRONMENT);

    const token = await generateToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);
    const formattedPhone = formatPhoneNumber(phoneNumber);

    const requestBody = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: 'https://example.com/callback', // This would be your actual callback URL
      AccountReference: 'K3C-TEST-' + Date.now(),
      TransactionDesc: 'Test Donation - K3C Platform',
    };

    console.log('\n📤 Request Details:');
    console.log('  - Formatted Phone:', formattedPhone);
    console.log('  - Timestamp:', timestamp);
    console.log('  - Account Reference:', requestBody.AccountReference);

    const response = await axios.post(
      `${baseURL}/mpesa/stkpush/v1/processrequest`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ STK Push initiated successfully!');
    console.log('📋 Response:');
    console.log('  - Merchant Request ID:', response.data.MerchantRequestID);
    console.log('  - Checkout Request ID:', response.data.CheckoutRequestID);
    console.log('  - Response Code:', response.data.ResponseCode);
    console.log('  - Customer Message:', response.data.CustomerMessage);

    console.log('\n📱 Check your phone for the M-PESA prompt!');

    return response.data;
  } catch (error: any) {
    console.error('\n❌ STK Push failed:');
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
const phoneNumber = '0703757369'; // Your phone number
const amount = 1; // KES 1 for testing

sendSTKPush(phoneNumber, amount)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });
