import axios from 'axios';

// API base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || 'An error occurred';
      return Promise.reject({ ...error.response.data, status: error.response.status });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({ message: 'No response from server', status: 0 });
    } else {
      // Something else happened
      return Promise.reject({ message: error.message, status: 0 });
    }
  }
);

// Auth API
export const authAPI = {
  register: (data: { name: string; email: string; phone: string; password: string }) =>
    apiClient.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
};

// Campaign API
export const campaignAPI = {
  getAll: (params?: { status?: string; category?: string; limit?: number; page?: number }) =>
    apiClient.get('/campaigns', { params }),

  getActive: () =>
    apiClient.get('/campaigns/active'),

  getById: (id: string) =>
    apiClient.get(`/campaigns/${id}`),
};

// Payment API
export const paymentAPI = {
  // MPESA
  initiateMPESA: (data: {
    campaignId: string;
    amount: number;
    phoneNumber: string;
    isAnonymous?: boolean;
    guestEmail?: string;
    guestName?: string;
  }) => apiClient.post('/payments/mpesa/initiate', data),

  checkMPESAStatus: (contributionId: string) =>
    apiClient.get(`/payments/mpesa/status/${contributionId}`),

  // Paystack
  initiatePaystack: (data: {
    campaignId: string;
    amount: number;
    isAnonymous?: boolean;
    guestEmail?: string;
    guestName?: string;
  }) => apiClient.post('/payments/paystack/initiate', data),

  verifyPaystack: (reference: string) =>
    apiClient.get(`/payments/paystack/verify/${reference}`),

  // Get user's contributions
  getMyContributions: () =>
    apiClient.get('/contributions/my-contributions'),
};

// Types
export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isVerified: boolean;
}

export interface Campaign {
  _id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  currency: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  category: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  completionPercentage?: number;
  remainingAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface CampaignsResponse {
  success: boolean;
  data: {
    campaigns: Campaign[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalCampaigns: number;
      limit: number;
    };
  };
}

export interface CampaignResponse {
  success: boolean;
  data: Campaign;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data: any;
}
