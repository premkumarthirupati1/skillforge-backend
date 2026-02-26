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
courseSchema.pre(/^find/, function () {
    console.log("Query:", this.getQuery());
    console.log("Options:", this.getOptions());

    if (!this.getOptions().includeDeleted) {
        console.log("Applying filter");
        this.where({ isDeleted: false });
    } else {
        console.log("Bypassing filter");
    }
});
courseSchema.index(
    { title: 1, instructorId: 1 },
    { unique: true }
);
module.exports = mongoose.model("Course", courseSchema);