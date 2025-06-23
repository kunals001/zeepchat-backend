import express from "express";
const router = express.Router();

import {protectRoute} from "../middelware/protectRoute.js"

import {sendMessages,getMessages,addReaction,getConversationsWithLastMessage, deleteMessage, clearChatForMe} from "../controllers/message.controller.js"

router.post("/react",protectRoute,addReaction);
router.get("/:id",protectRoute,getMessages);
router.post("/send/:id",protectRoute,sendMessages);
router.get("/last",protectRoute,getConversationsWithLastMessage);
router.delete("/message/:messageId", protectRoute, deleteMessage);
router.delete("/clear/:userId", protectRoute, clearChatForMe);

export default router