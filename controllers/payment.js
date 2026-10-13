const Razorpay = require('razorpay');
const crypto = require('crypto');
const Course = require('../models/course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/payment');
const { invalidateCache } = require('../utils/cacheHelper');

const getRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        console.warn("WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in .env");
    }

    return new Razorpay({
        key_id: keyId || 'rzp_test_placeholder',
        key_secret: keySecret || 'placeholder_secret'
    });
};

/**
 * 1. Create Razorpay Order
 */
exports.createOrder = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        // Verify course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        if (Number(course.price) === 0) {
            return res.status(400).json({ message: "This course is free. Please use direct enrollment." });
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({ userId, courseId });
        if (existingEnrollment) {
            return res.status(400).json({ message: "You are already enrolled in this course." });
        }

        const razorpay = getRazorpayInstance();

        // Amount in paise (1 INR = 100 paise)
        const amountInPaise = Math.round(course.price * 100);
        const receipt = `rcpt_${Date.now().toString().slice(-8)}_${userId.toString().slice(-4)}`;

        const orderOptions = {
            amount: amountInPaise,
            currency: "INR",
            receipt: receipt,
            notes: {
                courseId: course._id.toString(),
                userId: userId.toString(),
                courseTitle: course.title.substring(0, 40)
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        // Save pending payment record in DB
        await Payment.create({
            userId,
            courseId,
            amount: course.price,
            currency: 'INR',
            razorpayOrderId: order.id,
            status: 'pending'
        });

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
            course: {
                id: course._id,
                title: course.title,
                price: course.price
            }
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ message: "Failed to initialize Razorpay order", error: error.message });
    }
};

/**
 * 2. Verify Razorpay Payment Signature & Enroll User
 */
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            courseId
        } = req.body;

        const userId = req.user.id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing Razorpay payment verification details." });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        // Verify HMAC SHA256 Signature
        const expectedSignature = crypto
            .createHmac('sha256', keySecret || 'placeholder_secret')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const isSignatureValid = expectedSignature === razorpay_signature;

        if (!isSignatureValid) {
            // Update payment record as failed
            await Payment.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { status: 'failed' }
            );
            return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
        }

        // Signature is valid! Ensure enrollment
        let targetCourseId = courseId;
        if (!targetCourseId) {
            const paymentRecord = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
            if (paymentRecord) {
                targetCourseId = paymentRecord.courseId;
            }
        }

        let enrollment = await Enrollment.findOne({ userId, courseId: targetCourseId });
        if (!enrollment) {
            enrollment = new Enrollment({
                userId,
                courseId: targetCourseId,
                progress: 0,
                completedLessons: []
            });
            await enrollment.save();
        }

        // Update payment record to completed
        await Payment.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: 'completed'
            }
        );

        // Invalidate Redis cache so dashboard updates instantly
        await invalidateCache(`enrollments:${userId}`);

        return res.status(200).json({
            success: true,
            message: "Payment successfully verified and course unlocked!",
            courseId: targetCourseId
        });
    } catch (error) {
        console.error("Error verifying Razorpay payment:", error);
        res.status(500).json({ message: "Failed to verify Razorpay payment", error: error.message });
    }
};

/**
 * 3. Retrieve User's Purchase History
 */
exports.getMyPurchases = async (req, res) => {
    try {
        const userId = req.user.id;
        const purchases = await Payment.find({ userId, status: 'completed' })
            .populate('courseId', 'title thumbnail price')
            .sort({ createdAt: -1 });

        res.status(200).json(purchases);
    } catch (error) {
        console.error("Error fetching purchases:", error);
        res.status(500).json({ message: "Failed to retrieve purchase history" });
    }
};

/**
 * 4. Get Razorpay Public Key ID
 */
exports.getPublicKey = async (req, res) => {
    res.status(200).json({
        keyId: process.env.RAZORPAY_KEY_ID || ''
    });
};
