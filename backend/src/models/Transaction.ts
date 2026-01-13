import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  contributionId: mongoose.Types.ObjectId;
  provider: 'mpesa' | 'paystack';
  transactionReference: string;
  amount: number;
  status: 'initiated' | 'pending' | 'success' | 'failed' | 'cancelled';
  providerResponse: Record<string, any>;
  callbackData?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    contributionId: {
      type: Schema.Types.ObjectId,
      ref: 'Contribution',
      required: [true, 'Contribution ID is required'],
      index: true,
    },
    provider: {
      type: String,
      required: [true, 'Payment provider is required'],
      enum: ['mpesa', 'paystack'],
    },
    transactionReference: {
      type: String,
      required: [true, 'Transaction reference is required'],
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      required: true,
      enum: ['initiated', 'pending', 'success', 'failed', 'cancelled'],
      default: 'initiated',
    },
    providerResponse: {
      type: Schema.Types.Mixed,
      default: {},
    },
    callbackData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ provider: 1, status: 1 });

const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
