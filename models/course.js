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
    }
});
courseSchema.pre(/^find/, function (next) {
    this.where({ isDeleted: false });
    next();
});
courseSchema.index(
    { title: 1, instructorId: 1 },
    { unique: true }
);
module.exports = mongoose.model("Course", courseSchema);