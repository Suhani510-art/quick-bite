import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    priceAtPurchase: {
      type: Number,       // snapshot of the dynamic price at time of order
      required: true,
    },
  },
  { _id: false }          // no separate _id for sub-documents
);

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'Order must have at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
     deliveryType: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup',
    },
    deliveryAddress: {
      type: String,
      default: '',
    },
    pickupTime: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: '',
    },
    // Existing fields ke baad add karo
deliveryType: {
  type: String,
  enum: ['pickup', 'delivery'],
  default: 'pickup',
},
buyerAddress: {
  type: String,
  default: '',
},
pickupTime: {
  type: String,
  default: '',
},
estimatedDeliveryMinutes: {
  type: Number,
  default: 0,
},
  },
  {
    timestamps: true,
  }
);


// ── Index for buyer's order history queries ────────────────────
orderSchema.index({ buyer: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;