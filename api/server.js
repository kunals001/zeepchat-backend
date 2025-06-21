import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import setupWebSocket, { clients } from "./sockets/websocket.js"; 

import uploadRoutes from './routes/upload.js';

const PORT = process.env.PORT;

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Database connection
import { connectDb } from "./utils/connectDb.js";
connectDb();

// Routes
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";

app.use("/api", uploadRoutes);

app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users",userRoutes);

// Create HTTP server
const server = http.createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// 🔥 Make wss and clients available inside controllers
app.set("wss", wss);
app.set("clients", clients);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
