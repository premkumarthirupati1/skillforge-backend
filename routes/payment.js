const express = require('express');
const paymentController = require('../controllers/payment');
const { protect } = require('../middlewares/protect');

const router = express.Router();

router.post('/create-order', protect, paymentController.createOrder);
router.post('/verify-payment', protect, paymentController.verifyPayment);
router.get('/my-purchases', protect, paymentController.getMyPurchases);
router.get('/key', protect, paymentController.getPublicKey);

module.exports = router;
