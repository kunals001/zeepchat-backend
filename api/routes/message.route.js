import express from "express";
const router = express.Router();

import {protectRoute} from "../middelware/protectRoute.js"

import {sendMessages,getMessages,addReaction,getConversationsWithLastMessage} from "../controllers/message.controller.js"

router.post("/react",protectRoute,addReaction);
router.get("/:id",protectRoute,getMessages);
router.post("/send/:id",protectRoute,sendMessages);
router.get("/last",protectRoute,getConversationsWithLastMessage);

export default router