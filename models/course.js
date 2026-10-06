const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
    },
    difficulty: {
        type: String,
        required: true,
        enum: ["beginner", "intermediate", "advanced"]
    },
    tags: [
        {
            type: String,
            trim: true,
        }
    ],
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    thumbnail: {
        type: String,
    },
    averageRating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    }
});
courseSchema.index({
    title: "text",
    description: "text",
    tags: "text"
});

courseSchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.where({ isDeleted: false });
    }
});
courseSchema.index(
    { title: 1, instructorId: 1 },
    { unique: true }
);
module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);