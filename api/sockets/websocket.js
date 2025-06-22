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
        console.log(`❌ No pong from ${userId}. Terminating.`);
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

  if (receiver && receiver.readyState === receiver.OPEN) {
    receiver.send(
      JSON.stringify({
        type: "receive_message",
        payload: {
          message: {
            _id: uuidv4(), // ✅ always unique
            sender: { _id: ws.userId },
            message: payload.content,
          },
        },
      })
    );
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
