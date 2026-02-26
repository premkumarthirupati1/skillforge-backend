const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true,
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    completedLessons: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lesson"
        }
    ],
    lastAccessedLesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson"
    },
    isDeleted: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true,
})
enrollmentSchema.pre(/^find/, function (next) {
    if (this.getQuery().includeDeleted) {
        delete this.getQuery().includeDeleted;
        return next();
    }
    this.where({ isDeleted: false });
    next();
});
enrollmentSchema.index(
    { userId: 1, courseId: 1 },
    { unique: true }
);
module.exports = mongoose.model('Enrollment', enrollmentSchema);