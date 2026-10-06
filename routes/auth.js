const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

router.post('/signup', authController.signUpController);
router.post('/login', authController.loginController);
router.post('/refresh', authController.refreshController);
router.post('/logout', authController.logoutController);
router.post('/forgot-password', authController.forgotPasswordController);
router.post('/forgot-password/:token/:email', authController.forgotPasswordTokenCheckController);
router.post("/reset-password/:email", authController.resetPasswordController);
module.exports = router;