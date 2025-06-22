import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // For 1-to-1
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // For group
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    // ✅ Message text (optional for media)
    message: {
      type: String,
      default: "",
    },

    // ✅ Type of message
    type: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
    },

    // ✅ Media URL (if any)
    mediaUrl: {
      type: String,
      default: null,
    },

    // ✅ Caption for image/video (NEW)
    caption: {
      type: String,
      default: "",
    },

    // ✅ Reactions
    reactions: [
      {
        emoji: { type: String },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    deletedFor: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
