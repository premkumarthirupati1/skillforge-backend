const express = require('express');
const authController = require('../controllers/auth');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/signup', authLimiter, authController.signUpController);
router.post('/login', authLimiter, authController.loginController);
router.post('/verify-otp', otpLimiter, authController.verifyOtpController);
router.post('/resend-otp', otpLimiter, authController.resendOtpController);
router.post('/refresh', authController.refreshController);
router.post('/logout', authController.logoutController);
router.post('/forgot-password', authLimiter, authController.forgotPasswordController);
router.post('/forgot-password/:token/:email', authLimiter, authController.forgotPasswordTokenCheckController);
router.post("/reset-password/:email", authLimiter, authController.resetPasswordController);

module.exports = router;