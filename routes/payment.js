const express = require('express');
const paymentController = require('../controllers/payment');
const { protect } = require('../middlewares/protect');

const router = express.Router();

router.post('/create-checkout-session', protect, paymentController.createCheckoutSession);
router.post('/verify-session', protect, paymentController.verifySession);

module.exports = router;
