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
    reviews: [{
        milestoneIndex: { type: Number, default: 0 },
        milestoneTitle: { type: String, default: "" },
        score: { type: Number, default: 0 },
        grade: { type: String, default: "B" },
        summary: { type: String, default: "" },
        complexity: {
            time: { type: String, default: "O(N)" },
            space: { type: String, default: "O(1)" },
            analysis: { type: String, default: "" }
        },
        categories: {
            architecture: { score: { type: Number, default: 85 }, feedback: { type: String, default: "" } },
            performance: { score: { type: Number, default: 85 }, feedback: { type: String, default: "" } },
            safety: { score: { type: Number, default: 85 }, feedback: { type: String, default: "" } }
        },
        praise: [{ type: String }],
        suggestions: [{
            file: { type: String, default: "" },
            line: { type: Number, default: 1 },
            severity: { type: String, default: "improvement" },
            title: { type: String, default: "" },
            explanation: { type: String, default: "" },
            currentCode: { type: String, default: "" },
            suggestedCode: { type: String, default: "" }
        }],
        submittedAt: { type: Date, default: Date.now }
    }],
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
