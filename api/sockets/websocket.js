import jwt from "jsonwebtoken";
import url from "url";
import User from "../models/user.model.js";
import { v4 as uuidv4 } from "uuid"; 

const clients = new Map();

export default function setupWebSocket(wss) {
  // 🔁 Heartbeat ping every 30 seconds
  const interval = setInterval(() => {
    for (const [userId, ws] of clients.entries()) {
      if (ws.isAlive === false) {
        clients.delete(userId);
        ws.terminate();

        // Clean up DB and notify others
        User.findByIdAndUpdate(userId, { isOnline: false }).catch(console.error);
        broadcastExcept(userId, {
          type: "user_offline",
          payload: { userId },
        });

        continue;
      }

      ws.isAlive = false;
      ws.ping(); // ⬅️ Send ping
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  wss.on("connection", async (ws, req) => {
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  const { query } = url.parse(req.url, true);
  const token = query.token;

  if (!token) {
    console.log("❌ No token provided");
    ws.close();
    return;
  }

  try {
    const userData = jwt.verify(token, process.env.JWT_SECRET);

    const userId = userData.Id;
    if (!userId) {
      console.log("❌ Invalid token payload");
      ws.close();
      return;
    }

    ws.userId = userId;
    clients.set(userId, ws);
    console.log(`✅ User ${userId} connected`);

    await User.findByIdAndUpdate(userId, { isOnline: true });

    broadcastExcept(userId, {
      type: "user_online",
      payload: { userId },
    });

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        handleEvent(data, ws);
      } catch (err) {
        console.error("❌ Invalid JSON:", msg);
      }
    });

    ws.on("close", async () => {
      clients.delete(ws.userId);
      console.log(`🚫 User ${ws.userId} disconnected`);

      await User.findByIdAndUpdate(ws.userId, { isOnline: false });

      broadcastExcept(ws.userId, {
        type: "user_offline",
        payload: { userId: ws.userId },
      });
    });

  } catch (err) {
    console.log("❌ WebSocket auth error:", err.message);
    ws.close();
  }
});
}

// ✅ Event handler
function handleEvent(data, ws) {
  const { type, payload } = data;

  switch (type) {
    
case "send_message": {
  const receiver = clients.get(payload.to);

  const message = {
    _id: uuidv4(),
    sender: { _id: ws.userId },
    message: payload.content || "",
    mediaUrl: payload.mediaUrl || null,
    mediaType: payload.mediaType || null,
    type: payload.mediaUrl ? "media" : "text",
    createdAt: new Date().toISOString(),
    replyTo: payload.replyTo || null, // ✅ add this
  };

  const responsePayload = {
    type: "receive_message",
    payload: { message },
  };

  if (receiver && receiver.readyState === receiver.OPEN) {
    receiver.send(JSON.stringify(responsePayload));
  }

  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(responsePayload));
  }

  break;
}


    case "typing": {
      const receiver = clients.get(payload.to);
      if (receiver && receiver.readyState === receiver.OPEN) {
        receiver.send(
          JSON.stringify({
            type: "user_typing",
            payload: {
              userId: ws.userId,
            },
          })
        );
      }
      break;
    }

    case "stop_typing": {
  const receiver = clients.get(payload.to);
  if (receiver && receiver.readyState === receiver.OPEN) {
    receiver.send(
      JSON.stringify({
        type: "stop_typing",
        payload: {
          userId: ws.userId,
        },
      })
    );
  }
  break;
  }


    case "react_message": {
  const { messageId, emoji } = payload;

  // Broadcast to receiver
  const receiverSocket = clients.get(payload.to); // assuming payload.to is receiver ID

  if (receiverSocket && receiverSocket.readyState === receiverSocket.OPEN) {
    receiverSocket.send(JSON.stringify({
      type: "message_reacted",
      payload: {
        messageId,
        emoji,
        userId: ws.userId,
      },
    }));
  }

  break;
    }

    case "seen_message": {
  const { messageId, to } = payload;

  const receiverSocket = clients.get(to); // original sender
  if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
    receiverSocket.send(
      JSON.stringify({
        type: "message_seen",
        payload: {
          messageId,
          seenBy: ws.userId,
        },
      })
    );
    console.log(`👁️ Message ${messageId} seen by ${ws.userId}`);
  } else {
    console.log("❌ Receiver not connected or socket not open");
  }
  break;
}




    case "delete_message": {
  const { messageId, type, to } = payload;

  const deletionPayload = {
    type: "message_deleted",
    payload: {
      messageId,
      deleteType: type === "for_everyone" ? "everyone" : "me",
      userId: ws.userId,
    },
  };

  if (type === "for_everyone") {
    // ✅ Send to RECEIVER
    const receiver = clients.get(to);
    if (receiver && receiver.readyState === WebSocket.OPEN) {
      receiver.send(JSON.stringify(deletionPayload));
      console.log("📤 Sent to receiver", to);
    } else {
      console.log("⚠️ Receiver not connected", to);
    }

    // ✅ Send to SENDER
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(deletionPayload));
      console.log("📤 Sent to sender", ws.userId);
    }
  }

  if (type === "me") {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(deletionPayload));
      console.log("📤 Sent delete for_me to", ws.userId);
    }
  }

  break;
    }

  case "clear_chat": {
  const { userId } = payload;

  const deletionPayload = {
    type: "chat_cleared",
    payload: {
      userId: ws.userId, // jinhone clear kiya
    },
  };
    if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(deletionPayload));
    }
    break;
    }




    default:
      ws.send(
        JSON.stringify({
          type: "error",
          payload: "❌ Unknown event type",
        })
      );
  }
}

// ✅ Helper to broadcast to all except sender
function broadcastExcept(excludeId, data) {
  for (const [id, socket] of clients.entries()) {
    if (id !== excludeId && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }
}

export { clients };
