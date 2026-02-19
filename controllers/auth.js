const authService = require('../services/authService');
exports.Login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = authService.loginUser({
            email,
            password
        });

        res.status(200).json({
            success: true,
            message: 'Login Successful',
            data: result
        });
    }
    catch (err) {
        next(err);
    }
}