const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    }
}, { timestamps: true });

// Prevent user from submitting more than one review per course
reviewSchema.index({ user: 1, course: 1 }, { unique: true });

// Static method to calculate average rating
reviewSchema.statics.calcAverageRating = async function (courseId) {
    const stats = await this.aggregate([
        {
            $match: { course: courseId }
        },
        {
            $group: {
                _id: "$course",
                avgRating: { $avg: "$rating" },
                nReviews: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await mongoose.model("Course").findByIdAndUpdate(courseId, {
            averageRating: stats[0].avgRating,
            reviewCount: stats[0].nReviews
        });
    } else {
        await mongoose.model("Course").findByIdAndUpdate(courseId, {
            averageRating: 0,
            reviewCount: 0
        });
    }
};

// Call calcAverageRating after save
reviewSchema.post("save", function () {
    this.constructor.calcAverageRating(this.course);
});

// Call calcAverageRating before remove/delete
reviewSchema.post(/^findOneAnd/, async function (doc) {
    if (doc) {
        await doc.constructor.calcAverageRating(doc.course);
    }
});

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);
