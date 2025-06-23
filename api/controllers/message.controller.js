import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const sendMessages = async (req, res) => {
  try {
    const { message, mediaUrl, type = "text", caption = "" } = req.body; // ✅ include caption
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId),
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMutual =
      sender.following.includes(receiverId) &&
      receiver.following.includes(senderId);

    if (!isMutual) {
      return res.status(403).json({ success: false, message: "Mutual follow required" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        messages: [],
      });
    }

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message,
      type,
      mediaUrl: mediaUrl || null,
      caption: caption || "", // ✅ save caption
      conversation: conversation._id,
    });

    conversation.messages.push(newMessage._id);
    conversation.lastMessage = newMessage._id;
    await conversation.save();

    const fullMessage = {
      _id: newMessage._id,
      message: newMessage.message,
      caption: newMessage.caption, // ✅ send caption in response
      createdAt: newMessage.createdAt,
      type: newMessage.type,
      mediaUrl: newMessage.mediaUrl,
      sender: {
        _id: sender._id,
        fullName: sender.fullName,
        userName: sender.userName,
        profilePic: sender.profilePic,
      },
      receiver: {
        _id: receiver._id,
        fullName: receiver.fullName,
        userName: receiver.userName,
        profilePic: receiver.profilePic,
      },
    };

    const ws = req.app.get("wss");
    const clients = req.app.get("clients");
    const receiverSocket = clients.get(receiverId.toString());

    if (receiverSocket && receiverSocket.readyState === 1) {
      receiverSocket.send(
        JSON.stringify({
          type: "receive_message",
          payload: {
            message: fullMessage,
          },
        })
      );
    }

    res.status(200).json({ success: true, message: fullMessage });
  } catch (error) {
    console.error("❌ Error in sendMessages:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate({
      path: "messages",
      populate: { path: "sender", select: "fullName userName profilePic" },
      options: { sort: { createdAt: 1 } },
    });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        messages: [],
        participants: [senderId, receiverId],
      });
    }

    res.status(200).json({
      success: true,
      messages: conversation.messages,
      participants: conversation.participants,
    });
  } catch (error) {
    console.error("❌ Error in getMessages:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    const userId = req.user._id; // 🛡️ Assume auth middleware adds this

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (!message.reactions) message.reactions = [];

    // Find if user already reacted
    const existingReaction = message.reactions.find(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // ✅ Same emoji again → remove
        message.reactions = message.reactions.filter(
          (r) => r.userId.toString() !== userId.toString()
        );
      } else {
        // 🔁 Change emoji
        message.reactions = message.reactions.filter(
          (r) => r.userId.toString() !== userId.toString()
        );
        message.reactions.push({ emoji, userId });
      }
    } else {
      // ➕ First time reaction
      message.reactions.push({ emoji, userId });
    }

    await message.save();

    // Optional: populate sender info if needed
    await message.populate("sender", "fullName profilePic userName");

    // Optional WebSocket Emit to message receiver
    req.io?.to(message.receiver?.toString()).emit("reaction_update", {
      messageId: message._id,
      reactions: message.reactions,
    });

    res.status(200).json({ message });
  } catch (err) {
    console.error("❌ Reaction error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

export const getConversationsWithLastMessage = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "fullName userName profilePic")
      .populate({
        path: "lastMessage",
        select: "message createdAt",
      })
      .sort({ updatedAt: -1 });

    const result = conversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      return {
        _id: otherUser._id,
        fullName: otherUser.fullName,
        userName: otherUser.userName,
        profilePic: otherUser.profilePic,
        lastMessageAt: conv.lastMessage?.createdAt || null,
        lastMessage: conv.lastMessage?.message || "",
      };
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error in getConversationsWithLastMessage:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { type } = req.query;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (type === "for_me") {
      console.log("🧹 Deleting message for me:", messageId);

      if (!message.deletedFor) message.deletedFor = [];

      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
        console.log("✅ Message marked deleted for user:", userId);
      } else {
        console.log("⚠️ Message already deleted for user:", userId);
      }

      return res.status(200).json({ success: true, message: "Message deleted for you" });
    }

    if (type === "for_everyone") {

      if (String(message.sender) !== String(userId)) {
        console.log("⛔ Unauthorized delete attempt by user:", userId);
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }

     message.message = "This message was deleted.";
     message.type = "text";
     message.reactions = [];
     await message.save();
      return res.status(200).json({ success: true, message: "Message deleted for everyone" });
    }

    console.log("❌ Invalid delete type received:", type);
    return res.status(400).json({ success: false, message: "Invalid delete type" });

  } catch (err) {
    console.error("❌ Delete Message Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};





