import express from "express";
const router = express.Router();

import {protectRoute} from "../middelware/protectRoute.js"

import {sendMessages,getMessages} from "../controllers/message.controller.js"

router.get("/:id",protectRoute,getMessages);
router.post("/send/:id",protectRoute,sendMessages);

export default router