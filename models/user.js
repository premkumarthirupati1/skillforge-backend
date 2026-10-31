const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ""
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    courses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          required: true
        }
      }
    ],
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student"
    },
    userProgress: {
      type: Number,
      default: 0
    },
    Bio: {
      type: String,
    },
    passwordChangedAt: {
      type: Date
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Date,
      select: false
    },
    refreshTokens: {
      type: [
        {
          tokenHash: { type: String, required: true },
          family: { type: String, required: true },
          userAgent: { type: String, default: "" },
          ip: { type: String, default: "" },
          expiresAt: { type: Date, required: true },
          isRevoked: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      select: false
    },
    lastLoginAt: {
      type: Date
    },
    lastLoginIp: {
      type: String
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
    resetTokens: [
      {
        tokenHash: String,
        expiry: Date
      }
    ],
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    otpHash: {
      type: String,
      select: false
    },
    otpExpiry: {
      type: Date,
      select: false
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    otpLastSentAt: {
      type: Date,
      select: false
    },
    settings: {
      editor: {
        theme: { type: String, default: "skillforge-dark" },
        fontSize: { type: Number, default: 13.5 },
        fontFamily: { type: String, default: "'Geist Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace" },
        fontLigatures: { type: Boolean, default: true },
        tabSize: { type: Number, default: 4 },
        wordWrap: { type: String, default: "on" },
        minimap: { type: Boolean, default: true },
        lineNumbers: { type: String, default: "on" }
      },
      ai: {
        copilotAutoSuggest: { type: Boolean, default: true },
        socraticMode: { type: Boolean, default: true },
        verbosity: { type: String, enum: ["concise", "balanced", "detailed"], default: "balanced" }
      },
      notifications: {
        emailAnnouncements: { type: Boolean, default: true },
        milestoneCompletions: { type: Boolean, default: true },
        trackReleases: { type: Boolean, default: true },
        securityAdvisories: { type: Boolean, default: true }
      },
      privacy: {
        publicProfile: { type: Boolean, default: true },
        showProgress: { type: Boolean, default: true },
        showBadges: { type: Boolean, default: true }
      }
    }
  },
  { timestamps: true }
);

// Helper method to check if user account is currently locked
userSchema.methods.isLocked = function() {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

// Helper method to verify if password was changed after a JWT token was issued
userSchema.methods.hasPasswordChangedAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resetToken;
    delete ret.resetTokens;
    delete ret.resetTokenExpiry;
    delete ret.otpHash;
    delete ret.otpExpiry;
    delete ret.otpAttempts;
    delete ret.otpLastSentAt;
    delete ret.refreshTokens;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  }
});

userSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resetToken;
    delete ret.resetTokens;
    delete ret.resetTokenExpiry;
    delete ret.otpHash;
    delete ret.otpExpiry;
    delete ret.otpAttempts;
    delete ret.otpLastSentAt;
    delete ret.refreshTokens;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);
