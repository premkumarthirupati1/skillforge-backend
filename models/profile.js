const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    bio: {
        type: String,
        maxLength: 500
    },
    socials: {

        twitter: {
            type: String,
            default: "",
        },
        github: {
            type: String,
            default: "",
        },
        linkedin: {
            type: String,
            default: ""
        }
    },
    public:
    {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true
});
module.exports = mongoose.model("Profile", ProfileSchema);