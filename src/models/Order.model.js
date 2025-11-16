import mongoose from 'mongoose';

// order schema definition
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer is required'],
      index: true,
    },

    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
      },
      productName: {
        type: String,
        required: true,
      },
      productImage: {
        type: String,
      },
    }],

    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: [0, 'Shipping fee cannot be negative'],
    },

    deliveryMethod: {
      type: String,
      enum: {
        values: ['meetup', 'shipping'],
        message: '{VALUE} is not a valid delivery method',
      },
      required: [true, 'Delivery method is required'],
    },

    meetupLocation: {
      type: String,
    },

    deliveryAddress: {
      fullAddress: {
        type: String,
      },
      contactNumber: {
        type: String,
      },
      specialInstructions: {
        type: String,
      },
    },

    paymentMethod: {
      type: String,
      enum: {
        values: ['cash_on_meetup', 'cash_on_delivery', 'gcash', 'maya'],
        message: '{VALUE} is not a valid payment method',
      },
      required: [true, 'Payment method is required'],
    },

    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'failed', 'refunded'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
    },

    status: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'ready', 'shipped', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid order status',
      },
      default: 'pending',
      index: true,
    },

    statusHistory: [{
      status: {
        type: String,
        required: true,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      note: {
        type: String,
      },
    }],

    cancellationReason: {
      type: String,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    cancelledAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    buyerConfirmed: {
      type: Boolean,
      default: false,
    },

    buyerConfirmationDeadline: {
      type: Date,
    },

    autoConfirmedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// indexes for faster queries
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ 'items.seller': 1, status: 1 });
orderSchema.index({ createdAt: -1 });

// middleware to generate unique order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    // generate order number: ORD-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `ORD-${dateStr}-${randomNum}`;
  }
  next();
});

// middleware to add initial status to history
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: 'Order created',
    });
  }
  next();
});

// instance method: update order status
orderSchema.methods.updateStatus = function(newStatus, updatedBy, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    updatedBy,
    timestamp: new Date(),
    note,
  });

  if (newStatus === 'completed') {
    this.completedAt = new Date();
  }

  return this.save();
};

// instance method: cancel order
orderSchema.methods.cancelOrder = function(cancelledBy, reason) {
  this.status = 'cancelled';
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;

  this.statusHistory.push({
    status: 'cancelled',
    updatedBy: cancelledBy,
    timestamp: new Date(),
    note: reason,
  });

  return this.save();
};

// instance method: check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  const nonCancellableStatuses = ['completed', 'cancelled'];
  return !nonCancellableStatuses.includes(this.status);
};

// instance method: get seller from items
orderSchema.methods.getSeller = function() {
  // assuming all items have the same seller (multi-seller split logic)
  return this.items.length > 0 ? this.items[0].seller : null;
};

// static method: find orders by buyer
orderSchema.statics.findByBuyer = function(buyerId, status = null) {
  const query = { buyer: buyerId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

// static method: find orders by seller
orderSchema.statics.findBySeller = function(sellerId, status = null) {
  const query = { 'items.seller': sellerId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

// static method: get order statistics
orderSchema.statics.getOrderStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
      },
    },
  ]);
  return stats;
};

// virtual: is order completed
orderSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// virtual: is order cancelled
orderSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

// virtual: days until auto confirm
orderSchema.virtual('daysUntilAutoConfirm').get(function() {
  if (!this.buyerConfirmationDeadline || this.buyerConfirmed) {
    return null;
  }
  const now = new Date();
  const deadline = new Date(this.buyerConfirmationDeadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// create and export model
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;