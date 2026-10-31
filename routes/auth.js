const express = require('express');
const authController = require('../controllers/auth');
const { protect } = require('../middlewares/protect');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Public Authentication Flow
router.post('/signup', authLimiter, authController.signUpController);
router.post('/login', authLimiter, authController.loginController);
router.post('/verify-otp', otpLimiter, authController.verifyOtpController);
router.post('/resend-otp', otpLimiter, authController.resendOtpController);
router.post('/refresh', authController.refreshController);
router.post('/logout', authController.logoutController);

// Password Recovery Flow (NIST/OWASP hardened)
router.post('/forgot-password', authLimiter, authController.forgotPasswordController);
router.post('/forgot-password/:token/:email', authLimiter, authController.forgotPasswordTokenCheckController);
router.post("/reset-password/:email", authLimiter, authController.resetPasswordController);

// Authenticated Account Security Operations
router.get('/me', protect, authController.meController);
router.post('/change-password', protect, authLimiter, authController.changePasswordController);
router.get('/sessions', protect, authController.getSessionsController);
router.post('/logout-all', protect, authController.logoutAllController);

module.exports = router;
