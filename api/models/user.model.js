import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true,
        unique: true,
        trim: true 
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true, 
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"]
    },
    profilePic: {
        type: String,
        default: "https://zeechat-kunal-singh-2025.s3.ap-south-1.amazonaws.com/User.webp"
    },
    bio: {
        type: String,
        default: "Hey there! I'm using ZeeChat."
    },
    followers: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'User',
        default: []
    },
    following: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: []
    },
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groups: [{
     type: mongoose.Schema.Types.ObjectId,
     ref: "Group"
    }],

    verifyToken: {
        type: String
    },
    verifyTokenExpiry: {
        type: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordTokenExpiry: {
        type: Date
    },
    isOnline: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const User = mongoose.model("User", userSchema)
export default User
