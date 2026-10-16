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
    ]
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resetToken;
    delete ret.resetTokens;
    delete ret.resetTokenExpiry;
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
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);