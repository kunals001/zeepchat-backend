import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const sendMessages = async (req, res) => {
  try {
    const { message } = req.body;
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
      conversation: conversation._id,
    });

    conversation.messages.push(newMessage._id);
    await conversation.save();

    // Build full message with sender & receiver info
    const fullMessage = {
      _id: newMessage._id,
      message: newMessage.message,
      createdAt: newMessage.createdAt,
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

    /** ✅ REAL-TIME PUSH VIA WEBSOCKET **/
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
