import mongoose, { Schema, Document } from 'mongoose';

export interface IContribution extends Document {
  userId?: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'mpesa' | 'card';
  paymentStatus: 'pending' | 'success' | 'failed';
  paymentReference: string;
  transactionId?: string;
  mpesaReceiptNumber?: string;
  isAnonymous: boolean;
  message?: string;
  guestEmail?: string;
  guestName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContributionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
      default: null,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [10, 'Minimum contribution is KES 10'],
    },
    currency: {
      type: String,
      default: 'KES',
      uppercase: true,
      enum: ['KES', 'USD', 'EUR'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['mpesa', 'card'],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    paymentReference: {
      type: String,
      required: [true, 'Payment reference is required'],
      unique: true,
      index: true,
    },
    transactionId: {
      type: String,
      default: null,
    },
    mpesaReceiptNumber: {
      type: String,
      default: null,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: null,
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    guestName: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indexes
ContributionSchema.index({ userId: 1, createdAt: -1 });
ContributionSchema.index({ campaignId: 1, paymentStatus: 1 });
ContributionSchema.index({ paymentStatus: 1, createdAt: -1 });

const Contribution = mongoose.model<IContribution>('Contribution', ContributionSchema);

export default Contribution;
