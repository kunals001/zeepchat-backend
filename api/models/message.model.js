import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Only used in 1-to-1 chat
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  // Only used in group chat
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    default: null
  },

  message: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["text", "image", "video", "file"],
    default: "text"
  },
  reactions: [
      {
        emoji: { type: String },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
