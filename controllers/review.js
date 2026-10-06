const Review = require("../models/review");
const Course = require("../models/course");
const Enrollment = require("../models/Enrollment");

exports.addReview = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        // Verify the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Verify the user is enrolled in the course
        const enrollment = await Enrollment.findOne({ userId, courseId });
        if (!enrollment) {
            return res.status(403).json({ message: "You must be enrolled in this course to leave a review." });
        }

        // Check if user already reviewed
        const existingReview = await Review.findOne({ user: userId, course: courseId });
        if (existingReview) {
            existingReview.rating = rating;
            existingReview.comment = comment;
            await existingReview.save();
            return res.status(200).json({ message: "Review updated successfully", review: existingReview });
        }

        const review = new Review({
            user: userId,
            course: courseId,
            rating,
            comment
        });

        await review.save();
        res.status(201).json({ message: "Review submitted successfully", review });

    } catch (error) {
        console.error("Error adding review:", error);
        if (error.code === 11000) {
            return res.status(400).json({ message: "You have already reviewed this course." });
        }
        res.status(500).json({ message: "Failed to submit review" });
    }
};

exports.getCourseReviews = async (req, res) => {
    try {
        const { courseId } = req.params;
        const Profile = require("../models/profile");
        
        const reviews = await Review.find({ course: courseId })
            .populate("user", "email") 
            .sort("-createdAt")
            .lean();
        
        // Fetch profiles for the reviewers
        const userIds = reviews.map(r => r.user._id);
        const profiles = await Profile.find({ userId: { $in: userIds } }).lean();
        const profileMap = {};
        profiles.forEach(p => profileMap[p.userId.toString()] = p.name);

        const reviewsWithNames = reviews.map(r => ({
            ...r,
            reviewerName: profileMap[r.user._id.toString()] || r.user.email.split("@")[0]
        }));
        
        res.status(200).json({ reviews: reviewsWithNames });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        // Check ownership or admin
        if (review.user.toString() !== req.user.id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to delete this review" });
        }

        await Review.findByIdAndDelete(reviewId);
        res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).json({ message: "Failed to delete review" });
    }
};
