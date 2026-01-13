import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  currency: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  imageUrl?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual properties
  completionPercentage?: number;
  remainingAmount?: number;
}

const CampaignSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Campaign description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    goalAmount: {
      type: Number,
      required: [true, 'Goal amount is required'],
      min: [100, 'Goal amount must be at least KES 100'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'KES',
      uppercase: true,
      enum: ['KES', 'USD', 'EUR'],
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft',
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (this: ICampaign, value: Date) {
          return !value || value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    imageUrl: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: [
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
      ],
      default: 'General',
    },
  },
  {
    timestamps: true,
  }
);

// Calculate completion percentage
CampaignSchema.virtual('completionPercentage').get(function (this: ICampaign) {
  if (this.goalAmount === 0) return 0;
  return Math.min(Math.round((this.currentAmount / this.goalAmount) * 100), 100);
});

// Calculate remaining amount
CampaignSchema.virtual('remainingAmount').get(function (this: ICampaign) {
  return Math.max(this.goalAmount - this.currentAmount, 0);
});

// Include virtuals in JSON
CampaignSchema.set('toJSON', { virtuals: true });
CampaignSchema.set('toObject', { virtuals: true });

// Create indexes
CampaignSchema.index({ status: 1 });
CampaignSchema.index({ category: 1 });
CampaignSchema.index({ startDate: 1 });
CampaignSchema.index({ createdAt: -1 });

const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);

export default Campaign;
