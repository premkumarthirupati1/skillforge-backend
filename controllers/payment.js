const Stripe = require('stripe');
// Provide a default test key just so it doesn't crash on boot, 
// but it will fail if it's not a real key when trying to create a session.
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51O1234567890abcdef'); 
const Course = require('../models/course');
const Enrollment = require('../models/Enrollment');

exports.createCheckoutSession = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id; // from protect middleware

        // 1. Fetch course details
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // If course is free, shouldn't be here, but handle just in case
        if (Number(course.price) === 0) {
            return res.status(400).json({ message: "Course is free, use standard enrollment." });
        }

        // 2. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: course.title,
                            images: course.thumbnail ? [`http://localhost:3000/${course.thumbnail.replace(/\\/g, "/")}`] : [],
                        },
                        unit_amount: Math.round(course.price * 100), // Stripe expects amounts in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // Pass metadata to easily identify the transaction later
            metadata: {
                courseId: course._id.toString(),
                userId: userId.toString(),
            },
            success_url: `http://localhost:5173/payment/success?session_id={CHECKOUT_SESSION_ID}&course_id=${course._id}`,
            cancel_url: `http://localhost:5173/course/${course._id}`,
        });

        res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        console.error("Error creating stripe session:", error);
        res.status(500).json({ message: "Failed to initialize payment gateway", error: error.message });
    }
};

exports.verifySession = async (req, res) => {
    try {
        const { session_id } = req.body;
        
        // 1. Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        // 2. Check if payment was successful
        if (session.payment_status === 'paid') {
            const courseId = session.metadata.courseId;
            const userId = session.metadata.userId;

            // 3. Ensure they aren't already enrolled
            const existingEnrollment = await Enrollment.findOne({ userId, courseId });
            
            if (!existingEnrollment) {
                // 4. Create enrollment
                const newEnrollment = new Enrollment({
                    userId,
                    courseId,
                    progress: 0,
                    completedLessons: []
                });
                await newEnrollment.save();
            }
            
            return res.status(200).json({ message: "Payment verified and enrolled successfully!", courseId });
        } else {
            return res.status(400).json({ message: "Payment not completed." });
        }
    } catch (error) {
        console.error("Error verifying session:", error);
        res.status(500).json({ message: "Failed to verify payment", error: error.message });
    }
};
