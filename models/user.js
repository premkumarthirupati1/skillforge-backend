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

module.exports = mongoose.model("User", userSchema);