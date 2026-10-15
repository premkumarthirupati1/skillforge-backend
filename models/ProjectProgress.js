const mongoose = require('mongoose');

const ProjectProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    projectId: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    projectTitle: {
        type: String,
        default: ""
    },
    track: {
        type: String,
        default: ""
    },
    currentMilestone: {
        type: Number,
        default: 1
    },
    verifiedMilestones: {
        type: [Number],
        default: []
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'active'],
        default: 'in_progress'
    },
    percent: {
        type: Number,
        default: 0
    },
    secondsElapsed: {
        type: Number,
        default: 0
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure a user only has one progress document per project
ProjectProgressSchema.index({ userId: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model('ProjectProgress', ProjectProgressSchema);
