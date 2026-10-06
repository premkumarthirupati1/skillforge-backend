const express = require("express");
const reviewController = require("../controllers/review");
const { protect } = require("../middlewares/protect");

const router = express.Router();

router.post("/:courseId", protect, reviewController.addReview);
router.get("/:courseId", reviewController.getCourseReviews);
router.delete("/:reviewId", protect, reviewController.deleteReview);

module.exports = router;
