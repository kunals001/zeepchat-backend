import express from "express" 
const router = express.Router();

import {Signup,VerifyEmail,ResetPassword,Logout,ForgotPassword,Login,CheckAuth,OnBoard} from "../controllers/auth.controller.js"

import {protectRoute} from "../middelware/protectRoute.js"

router.get("/check-auth",protectRoute,CheckAuth)
router.post("/signup",Signup)
router.post("/verify-email",VerifyEmail)
router.post("/onboard",protectRoute,OnBoard)
router.post("/login",Login)
router.post("/logout",Logout)
router.post("/forgot-password",ForgotPassword)
router.post("/reset-password/:token",ResetPassword)

export default router