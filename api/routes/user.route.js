import express from "express";
const router = express.Router();

import {UserFollow,UserUnFollow,GetFollowRequest,GetFollowingUsers,GetUsers,UpdateProfile,acceptFollowRequest} from "../controllers/user.controller.js"

import {protectRoute} from "../middelware/protectRoute.js"


router.post("/send-follow-request",protectRoute,UserFollow)
router.post("/unfollow",protectRoute,UserUnFollow)
router.post('/accept-follow-request', protectRoute, acceptFollowRequest);

router.get("/get-follow-requests",protectRoute,GetFollowRequest)
router.get("/get-following-users",protectRoute,GetFollowingUsers)
router.get("/get-users",protectRoute,GetUsers)
router.put("/update-profile",protectRoute,UpdateProfile)


export default router