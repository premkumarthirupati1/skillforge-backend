const express = require('express');
const paymentController = require('../controllers/payment');
const { protect } = require('../middlewares/protect');
const { paymentLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/create-order', protect, paymentLimiter, paymentController.createOrder);
router.post('/verify-payment', protect, paymentLimiter, paymentController.verifyPayment);
router.get('/my-purchases', protect, paymentController.getMyPurchases);
router.get('/key', protect, paymentController.getPublicKey);

module.exports = router;
