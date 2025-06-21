import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  groupPic: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  }
}, { timestamps: true });

const Group = mongoose.model("Group", groupSchema);
export default Group;
