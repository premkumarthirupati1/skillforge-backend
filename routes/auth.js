const express = require('express');
const authController = require('../controllers/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/signup', authLimiter, authController.signUpController);
router.post('/login', authLimiter, authController.loginController);
router.post('/refresh', authController.refreshController);
router.post('/logout', authController.logoutController);
router.post('/forgot-password', authLimiter, authController.forgotPasswordController);
router.post('/forgot-password/:token/:email', authLimiter, authController.forgotPasswordTokenCheckController);
router.post("/reset-password/:email", authLimiter, authController.resetPasswordController);

module.exports = router;