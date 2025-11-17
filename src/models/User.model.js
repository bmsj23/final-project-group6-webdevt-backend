import mongoose from 'mongoose';
import config from '../config/config.js';

// user schema definition
const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: [true, 'Google ID is required'],
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email) {
          // validate email ends with @dlsl.edu.ph
          return email.endsWith(config.allowedEmailDomain);
        },
        message: 'Only @dlsl.edu.ph email addresses are allowed',
      },
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    username: {
      type: String,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'],
    },

    profilePicture: {
      type: String,
      trim: true,
      default: '',
      },

    contactNumber: {
      type: String,
      trim: true,
    },


    campusAddress: {
      type: String,
      trim: true,
      default: '',
    },

    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
    },

    isSeller: {
      type: Boolean,
      default: false,
    },

    sellerInfo: {
      bio: {
        type: String,
        default: '',
        maxlength: [500, 'Bio cannot exceed 500 characters'],
      },
      allowsShipping: {
        type: Boolean,
        default: true,
      },
      totalSales: {
        type: Number,
        default: 0,
        min: [0, 'Total sales cannot be negative'],
      },
      averageRating: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot exceed 5'],
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspensionReason: {
      type: String,
      default: null,
    },

    suspendedAt: {
      type: Date,
    },

    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },

  {
    timestamps: true, // automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// indexes for faster queries
userSchema.index({ studentNumber: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

// middleware to check if this is the first user (make them admin)
userSchema.pre('save', async function(next) {
  // only run on new user creation
  if (!this.isNew) {
    return next();
  }

  try {
    // count existing users
    const userCount = await mongoose.model('User').countDocuments();

    // if this is the first user, make them admin
    if (userCount === 0) {
      this.role = 'admin';
      console.log('First user created - assigned admin role');
    }

    next();
  } catch (error) {
    next(error);
  }
});

// middleware to update lastLogin on save
userSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.lastLogin = Date.now();
  }
  next();
});

// instance method: get public profile (hide sensitive info)
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    email: this.email,
    profilePicture: this.profilePicture,
    campusAddress: this.campusAddress,
    sellerInfo: {
      bio: this.sellerInfo.bio,
      allowsShipping: this.sellerInfo.allowsShipping,
      totalSales: this.sellerInfo.totalSales,
      averageRating: this.sellerInfo.averageRating,
    },
    createdAt: this.createdAt,
  };
};

// instance method: get full profile (for user's own data)
userSchema.methods.getFullProfile = function() {
  return {
    _id: this._id,
    googleId: this.googleId,
    email: this.email,
    name: this.name,
    username: this.username,
    studentNumber: this.studentNumber,
    contactNumber: this.contactNumber,
    profilePicture: this.profilePicture,
    campusAddress: this.campusAddress,
    role: this.role,
    isSeller: this.isSeller,
    sellerInfo: this.sellerInfo,
    isActive: this.isActive,
    isSuspended: this.isSuspended,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
  };
};

// instance method: suspend user account
userSchema.methods.suspend = function(reason) {
  this.isSuspended = true;
  this.isActive = false;
  this.suspensionReason = reason || 'Suspended by admin';
  this.suspendedAt = new Date();
  return this.save();
};

// instance method: activate user account
userSchema.methods.activate = function() {
  this.isSuspended = false;
  this.isActive = true;
  this.suspensionReason = null;
  this.suspendedAt = null;
  return this.save();
};

// instance method: update seller rating
userSchema.methods.updateSellerRating = async function(newRating) {
  // this will be called when a new review is added
  // you'll calculate average from all reviews in the Review model
  this.sellerInfo.averageRating = newRating;
  return this.save();
};

// instance method: increment total sales
userSchema.methods.incrementSales = function(amount = 1) {
  this.sellerInfo.totalSales += amount;
  return this.save();
};

// static method: find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// static method: find by google id
userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

// static method: find active users only
userSchema.statics.findActive = function() {
  return this.find({ isActive: true, isSuspended: false });
};

// static method: find all admins
userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin' });
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;