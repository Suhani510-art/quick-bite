import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Deal name is required'],
      trim: true,
      maxlength: [100, 'Deal name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    category: {
      type: String,
      enum: ['meal', 'snack', 'beverage', 'dessert', 'grocery', 'other'],
      default: 'other',
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    quantitySold: {
      type: Number,
      default: 0,
    },
    expiryTime: {
      type: Date,
      required: [true, 'Expiry time is required'],
    },
    image: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    restaurantAddress: {
  type: String,
  trim: true,
  required: [true, 'Restaurant address is required'],
},
location: {
  type: String,
  trim: true,
  default: '',
},
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },   // include virtuals when converting to JSON
    toObject: { virtuals: true },
  }
);

// ── Virtual: remaining quantity ────────────────────────────────
dealSchema.virtual('quantityRemaining').get(function () {
  return this.quantity - this.quantitySold;
});

// ── Virtual: is this deal expired right now? ───────────────────
dealSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiryTime;
});

// ── Virtual: minutes until expiry ─────────────────────────────
dealSchema.virtual('minutesUntilExpiry').get(function () {
  const diff = this.expiryTime - new Date();
  return Math.max(0, Math.floor(diff / 60000));
});

// ── Indexes for common query patterns ─────────────────────────
dealSchema.index({ seller: 1 });
dealSchema.index({ isActive: 1, expiryTime: 1 });
dealSchema.index({ category: 1 });
dealSchema.index({ originalPrice: 1 });

const Deal = mongoose.model('Deal', dealSchema);
export default Deal;