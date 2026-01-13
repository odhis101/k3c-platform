import axios from 'axios';
import { env } from '../config/env';

interface MPESATokenResponse {
  access_token: string;
  expires_in: string;
}

interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface STKPushCallbackResponse {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

/**
 * MPESA Service for Daraja API integration
 */
class MPESAService {
  private baseURL: string;
  private authURL: string;

  constructor() {
    this.baseURL =
      env.MPESA_ENVIRONMENT === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';
    this.authURL = `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`;
  }

  /**
   * Generate OAuth access token
   */
  private async generateToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`
      ).toString('base64');

      const response = await axios.get<MPESATokenResponse>(this.authURL, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      return response.data.access_token;
    } catch (error: any) {
      console.error('MPESA token generation error:', error.response?.data || error.message);
      throw new Error('Failed to generate MPESA access token');
    }
  }

  /**
   * Generate timestamp in the format required by MPESA (YYYYMMDDHHmmss)
   */
  private generateTimestamp(): string {
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
   * Generate password for STK Push
   */
  private generatePassword(timestamp: string): string {
    const data = `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Format phone number to MPESA format (254XXXXXXXXX)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces or special characters
    let formatted = phoneNumber.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

    // Handle different formats
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
   * Initiate STK Push (Lipa Na M-PESA Online)
   */
  async initiateSTKPush(data: STKPushRequest): Promise<STKPushResponse> {
    try {
      const token = await this.generateToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const phoneNumber = this.formatPhoneNumber(data.phoneNumber);

      const requestBody = {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(data.amount),
        PartyA: phoneNumber,
        PartyB: env.MPESA_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: `${env.BACKEND_URL}/api/payments/mpesa/callback`,
        AccountReference: data.accountReference,
        TransactionDesc: data.transactionDesc,
      };

      console.log('MPESA STK Push Request:', {
        ...requestBody,
        Password: '[REDACTED]',
      });

      const response = await axios.post<STKPushResponse>(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('MPESA STK Push Response:', response.data);

      return response.data;
    } catch (error: any) {
      console.error('MPESA STK Push error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.errorMessage || 'Failed to initiate MPESA payment'
      );
    }
  }

  /**
   * Query STK Push transaction status
   */
  async querySTKPushStatus(checkoutRequestID: string): Promise<any> {
    try {
      const token = await this.generateToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const requestBody = {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('MPESA query error:', error.response?.data || error.message);
      throw new Error('Failed to query MPESA transaction status');
    }
  }

  /**
   * Process MPESA callback
   */
  processCallback(callbackData: STKPushCallbackResponse): {
    success: boolean;
    merchantRequestID: string;
    checkoutRequestID: string;
    resultCode: number;
    resultDescription: string;
    amount?: number;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    phoneNumber?: string;
  } {
    const { stkCallback } = callbackData.Body;

    const result: any = {
      success: stkCallback.ResultCode === 0,
      merchantRequestID: stkCallback.MerchantRequestID,
      checkoutRequestID: stkCallback.CheckoutRequestID,
      resultCode: stkCallback.ResultCode,
      resultDescription: stkCallback.ResultDesc,
    };

    // Extract callback metadata if payment was successful
    if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
      const items = stkCallback.CallbackMetadata.Item;

      items.forEach((item) => {
        switch (item.Name) {
          case 'Amount':
            result.amount = item.Value;
            break;
          case 'MpesaReceiptNumber':
            result.mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            result.transactionDate = item.Value;
            break;
          case 'PhoneNumber':
            result.phoneNumber = item.Value;
            break;
        }
      });
    }

    return result;
  }
}

export default new MPESAService();
