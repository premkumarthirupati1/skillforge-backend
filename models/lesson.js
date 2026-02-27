const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
    {
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Module",
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        contentType: {
            type: String,
            enum: ["video", "text", "quiz"],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            min: 0
        },
        order: {
            type: Number,
            required: true,
            min: 1
        },
        isDeleted: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true
    }
);
lessonSchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.where({ isDeleted: false });
    }
});
lessonSchema.index(
    { moduleId: 1, order: 1 },
    { unique: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);
