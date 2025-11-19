import mongoose from 'mongoose';

// product schema definition
const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },

    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [1000, 'Product description cannot exceed 1000 characters'],
    },

    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [1, 'Product price must be at least 1'],
    },

    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: [0, 'Product stock cannot be negative'],
      default: 0,
    },

    images: {
      type: [String],
      validate: {
        validator: function(images) {
          return images.length >= 1 && images.length <= 5;
        },
        message: 'At least 1 image is required and no more than 5 images are allowed',
      },
      required: [true, 'At least one product image is required'],
    },

    category: {
      type: String,
      enum: {
        values: [
          // School Supplies subcategories
          'Notebooks',
          'Pens & Pencils',
          'Paper',
          'Binders',
          'Other Supplies',
          // Electronics subcategories
          'Laptops',
          'Phones',
          'Accessories',
          'Chargers',
          'Other Electronics',
          // Books subcategories
          'Textbooks',
          'Novels',
          'Study Guides',
          'Reference',
          'Other Books',
          // Clothing subcategories
          'Shirts',
          'Pants',
          'Shorts',
          'Shoes',
          'Other Clothing',
          // Food & Drinks subcategories
          'Snacks',
          'Drinks',
          'Meal Prep',
          'Other Food',
          // Sports Equipment subcategories
          'Gym Equipment',
          'Sports Gear',
          'Outdoor',
          'Other Sports',
          // Beauty & Wellness subcategories
          'Skincare',
          'Makeup',
          'Hair Care',
          'Health & Fitness',
          'Other Wellness',
          // Furniture & Decor subcategories
          'Furniture',
          'Bedding',
          'Room Decor',
          'Storage',
          'Other Decor',
          // Musical Instruments subcategories
          'Guitars',
          'Keyboards',
          'Drums',
          'Strings & Wind',
          'Other Instruments',
          // Gaming & Hobbies subcategories
          'Video Games',
          'Board Games',
          'Collectibles',
          'Art Supplies',
          'Other Hobbies',
          // Pet Supplies subcategories
          'Pet Food',
          'Pet Toys',
          'Pet Accessories',
          'Pet Care',
          'Other Pet Supplies',
          // Others
          'Other',
        ],
        message: '{VALUE} is not a valid category. Must be a valid subcategory.',
      },
      required: [true, 'Product category is required'],
    },

    condition: {
      type: String,
      enum: {
        values: ['New', 'Like New', 'Good', 'Fair'],
        message: '{VALUE} is not a valid condition',
      },
      required: [true, 'Product condition is required'],
    },

    shippingAvailable: {
      type: Boolean,
      default: false,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: [0, 'Shipping fee cannot be negative'],
    },

    status: {
      type: String,
      enum: {
        values: ['active', 'paused', 'sold', 'deleted'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
      index: true,
    },

    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },

    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'Total reviews cannot be negative'],
    },

    totalSales: {
      type: Number,
      default: 0,
      min: [0, 'Total sales cannot be negative'],
    },

    embedding: {
      type: [Number],
      default: null,
      select: false,
    },

    wishlistCount: {
      type: Number,
      default: 0,
      min: [0, 'wishlist count cannot be negative'],
    },

    orderCount: {
      type: Number,
      default: 0,
      min: [0, 'Order count cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// indexes for faster queries
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ status: 1, stock: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ createdAt: -1 });

// instance method: increment views
productSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// instance method: update rating
productSchema.methods.updateRating = async function() {
  const Review = mongoose.model('Review');
  const result = await Review.getAverageRating(this._id);

  this.averageRating = result.averageRating;
  this.totalReviews = result.totalReviews;

  return this.save();
};

// instance method: decrement stock
productSchema.methods.decrementStock = function(quantity) {
  if (this.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;

  // auto-mark as sold if stock reaches 0
  if (this.stock === 0) {
    this.status = 'sold';
  }

  return this.save();
};

// instance method: increment stock
productSchema.methods.incrementStock = function(quantity) {
  this.stock += quantity;

  // reactivate if product was sold
  if (this.status === 'sold' && this.stock > 0) {
    this.status = 'active';
  }

  return this.save();
};

// instance method: increment views
productSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// instance method: mark as sold
productSchema.methods.markAsSold = function() {
  this.status = 'sold';
  this.totalSales += 1;
  return this.save();
};

// static method: find active products
productSchema.statics.findActive = function(options = {}) {
  const { limit = 20, skip = 0, category = null } = options;

  const query = { status: 'active', stock: { $gt: 0 } };
  if (category) query.category = category;

  return this.find(query)
    .populate('seller', 'name profilePicture sellerInfo')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// static method: find by seller
productSchema.statics.findBySeller = function(sellerId, status = null) {
  const query = { seller: sellerId };
  if (status) query.status = status;

  return this.find(query).sort({ createdAt: -1 });
};

// static method: search products
productSchema.statics.searchProducts = function(searchTerm, options = {}) {
  const { limit = 20, skip = 0, category = null, minPrice = null, maxPrice = null } = options;

  const query = {
    status: 'active',
    $text: { $search: searchTerm },
  };

  if (category) query.category = category;
  if (minPrice !== null) query.price = { ...query.price, $gte: minPrice };
  if (maxPrice !== null) query.price = { ...query.price, $lte: maxPrice };

  return this.find(query)
    .populate('seller', 'name profilePicture')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip(skip);
};

// static method: get low stock products
productSchema.statics.findLowStock = function(threshold = 5) {
  return this.find({
    status: 'active',
    stock: { $lte: threshold, $gt: 0 },
  })
    .populate('seller', 'name email')
    .sort({ stock: 1 });
};

// virtual: is in stock
productSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// virtual: is low stock
productSchema.virtual('isLowStock').get(function() {
  return this.stock > 0 && this.stock <= 5;
});

// pre-save hook: auto-reactivate if stock > 0 and status is sold
productSchema.pre('save', function(next) {
  if (this.stock > 0 && this.status === 'sold') {
    this.status = 'active';
  }
  next();
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;