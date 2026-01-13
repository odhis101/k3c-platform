import axios from 'axios';
import { env } from '../config/env';

interface InitializeTransactionRequest {
  email: string;
  amount: number;
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    fees: number;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

interface WebhookPayload {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    customer: any;
    authorization: any;
  };
}

/**
 * Paystack Service for card payment integration
 */
class PaystackService {
  private baseURL: string;
  private secretKey: string;

  constructor() {
    this.baseURL = 'https://api.paystack.co';
    this.secretKey = env.PAYSTACK_SECRET_KEY!;
  }

  /**
   * Get authorization headers
   */
  private getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a transaction
   */
  async initializeTransaction(
    data: InitializeTransactionRequest
  ): Promise<InitializeTransactionResponse['data']> {
    try {
      // Convert amount to kobo (Paystack uses smallest currency unit)
      const amountInKobo = Math.round(data.amount * 100);

      const requestBody = {
        email: data.email,
        amount: amountInKobo,
        reference: data.reference,
        callback_url: data.callback_url || `${env.FRONTEND_URL}/payment/callback`,
        metadata: data.metadata || {},
        currency: 'KES', // Kenyan Shilling
      };

      console.log('Paystack Initialize Request:', {
        ...requestBody,
        amount: `KES ${data.amount} (${amountInKobo} kobo)`,
      });

      const response = await axios.post<InitializeTransactionResponse>(
        `${this.baseURL}/transaction/initialize`,
        requestBody,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to initialize transaction');
      }

      console.log('Paystack Initialize Response:', response.data.data);

      return response.data.data;
    } catch (error: any) {
      console.error('Paystack initialize error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to initialize Paystack transaction'
      );
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<VerifyTransactionResponse['data']> {
    try {
      console.log('Verifying Paystack transaction:', reference);

      const response = await axios.get<VerifyTransactionResponse>(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to verify transaction');
      }

      console.log('Paystack Verify Response:', {
        reference: response.data.data.reference,
        status: response.data.data.status,
        amount: response.data.data.amount / 100,
        currency: response.data.data.currency,
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Paystack verify error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to verify Paystack transaction'
      );
    }
  }

  /**
   * Process webhook payload
   */
  processWebhook(payload: WebhookPayload): {
    event: string;
    success: boolean;
    reference: string;
    amount: number;
    status: string;
    paidAt?: string;
    customer: any;
    authorization: any;
  } {
    return {
      event: payload.event,
      success: payload.data.status === 'success',
      reference: payload.data.reference,
      amount: payload.data.amount / 100, // Convert from kobo to KES
      status: payload.data.status,
      paidAt: payload.data.paid_at,
      customer: payload.data.customer,
      authorization: payload.data.authorization,
    };
  }

  /**
   * Verify webhook signature (for security)
   */
  verifyWebhookSignature(signature: string, payload: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }
}

export default new PaystackService();
