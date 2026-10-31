const settingsService = require('../services/settingsService');

const getClientMeta = (req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return { ip, userAgent };
};

/**
 * GET /user/settings
 */
exports.getSettings = async (req, res, next) => {
    try {
        const settings = await settingsService.getUserSettings(req.user._id);
        return res.status(200).json({
            success: true,
            settings
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to retrieve user settings"
        });
    }
};

/**
 * PUT /user/settings
 */
exports.updateSettings = async (req, res, next) => {
    try {
        const updated = await settingsService.updateUserSettings(req.user._id, req.body);
        return res.status(200).json({
            success: true,
            message: "Settings updated successfully",
            settings: updated
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message || "Failed to update settings"
        });
    }
};

/**
 * GET /user/settings/export
 */
exports.exportData = async (req, res, next) => {
    try {
        const archive = await settingsService.exportUserData(req.user._id);
        const filename = `skillforge-data-export-${req.user.username || req.user._id}-${Date.now()}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(JSON.stringify(archive, null, 2));
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to generate data export"
        });
    }
};

/**
 * DELETE /user/account
 */
exports.deleteAccount = async (req, res, next) => {
    const { password } = req.body;
    const { ip, userAgent } = getClientMeta(req);

    try {
        const result = await settingsService.deleteAccount(req.user._id, password, ip, userAgent);
        
        const isProd = process.env.NODE_ENV === 'production';
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax'
        });

        return res.status(200).json(result);
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message || "Failed to delete account"
        });
    }
};
