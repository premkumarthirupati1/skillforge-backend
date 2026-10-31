const User = require('../models/user');
const Profile = require('../models/profile');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/review');
const bcrypt = require('bcrypt');
const { logSecurityEvent } = require('../middlewares/security/auditLogger');

const DEFAULT_SETTINGS = {
    editor: {
        theme: "skillforge-dark",
        fontSize: 13.5,
        fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        tabSize: 4,
        wordWrap: "on",
        minimap: true,
        lineNumbers: "on"
    },
    ai: {
        copilotAutoSuggest: true,
        socraticMode: true,
        verbosity: "balanced"
    },
    notifications: {
        emailAnnouncements: true,
        milestoneCompletions: true,
        trackReleases: true,
        securityAdvisories: true
    },
    privacy: {
        publicProfile: true,
        showProgress: true,
        showBadges: true
    }
};

/**
 * Fetch user settings with safe fallback defaults
 */
const getUserSettings = async (userId) => {
    const user = await User.findById(userId).select('settings email role name username');
    if (!user) {
        throw new Error("User not found");
    }

    const currentSettings = user.settings ? user.settings.toObject?.() || user.settings : {};

    return {
        editor: { ...DEFAULT_SETTINGS.editor, ...(currentSettings.editor || {}) },
        ai: { ...DEFAULT_SETTINGS.ai, ...(currentSettings.ai || {}) },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(currentSettings.notifications || {}) },
        privacy: { ...DEFAULT_SETTINGS.privacy, ...(currentSettings.privacy || {}) }
    };
};

/**
 * Update user settings (deep merge)
 */
const updateUserSettings = async (userId, updatePayload = {}) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    if (!user.settings) {
        user.settings = { ...DEFAULT_SETTINGS };
    }

    if (updatePayload.editor && typeof updatePayload.editor === 'object') {
        user.settings.editor = {
            ...(user.settings.editor?.toObject?.() || user.settings.editor || DEFAULT_SETTINGS.editor),
            ...updatePayload.editor
        };
    }

    if (updatePayload.ai && typeof updatePayload.ai === 'object') {
        user.settings.ai = {
            ...(user.settings.ai?.toObject?.() || user.settings.ai || DEFAULT_SETTINGS.ai),
            ...updatePayload.ai
        };
    }

    if (updatePayload.notifications && typeof updatePayload.notifications === 'object') {
        user.settings.notifications = {
            ...(user.settings.notifications?.toObject?.() || user.settings.notifications || DEFAULT_SETTINGS.notifications),
            ...updatePayload.notifications,
            // Security advisories must always remain true for platform security
            securityAdvisories: true
        };
    }

    if (updatePayload.privacy && typeof updatePayload.privacy === 'object') {
        user.settings.privacy = {
            ...(user.settings.privacy?.toObject?.() || user.settings.privacy || DEFAULT_SETTINGS.privacy),
            ...updatePayload.privacy
        };
    }

    user.markModified('settings');
    await user.save();

    return user.settings;
};

/**
 * Export full user data archive (GDPR & Data Portability compliance)
 */
const exportUserData = async (userId) => {
    const user = await User.findById(userId)
        .select('-password -otpHash -otpExpiry -otpAttempts -refreshTokens -resetToken -resetTokens');
    
    if (!user) {
        throw new Error("User not found");
    }

    const profile = await Profile.findOne({ userId }).lean();
    const enrollments = await Enrollment.find({ userId }).populate('courseId', 'title description difficulty tags').lean();
    const reviews = await Review.find({ user: userId }).populate('course', 'title').lean();

    return {
        exportedAt: new Date().toISOString(),
        platform: "SkillForge Engineering Hub",
        account: {
            id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            isEmailVerified: user.isEmailVerified
        },
        profile: profile || null,
        settings: user.settings || DEFAULT_SETTINGS,
        enrollments: (enrollments || []).map(e => ({
            id: e._id,
            courseTitle: e.courseId?.title || "Unknown Course",
            difficulty: e.courseId?.difficulty || "Intermediate",
            progress: e.progress || 0,
            enrolledAt: e.createdAt,
            completedLessons: e.completedLessons || []
        })),
        reviews: (reviews || []).map(r => ({
            id: r._id,
            courseTitle: r.course?.title || "Unknown Course",
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt
        }))
    };
};

/**
 * Permanently Delete Account (Requires Password Confirmation)
 */
const deleteAccount = async (userId, password, ip = 'unknown', userAgent = 'unknown') => {
    if (!password) {
        throw new Error("Password confirmation is required to delete your account.");
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
        throw new Error("User not found.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        logSecurityEvent({
            event: 'ACCOUNT_DELETION_FAILED_WRONG_PASSWORD',
            userId,
            email: user.email,
            ip,
            userAgent,
            status: 400
        });
        throw new Error("Incorrect password. Account deletion aborted.");
    }

    // Cascade delete related user assets
    await Profile.deleteOne({ userId });
    await Enrollment.deleteMany({ userId });
    await Review.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    logSecurityEvent({
        event: 'ACCOUNT_DELETED_PERMANENTLY',
        userId,
        email: user.email,
        ip,
        userAgent,
        status: 200
    });

    return { success: true, message: "Account and associated workspace data have been permanently deleted." };
};

module.exports = {
    DEFAULT_SETTINGS,
    getUserSettings,
    updateUserSettings,
    exportUserData,
    deleteAccount
};
