import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import {sendEmail} from "../utils/resend.js"
import {generateToken} from "../utils/generateToken.js"
import {VERIFICATION_EMAIL_TEMPLATE,PASSWORD_RESET_REQUEST_TEMPLATE} from "../utils/templete.js"
import crypto from "crypto";

export const Signup = async(req,res) => {
   try {
   const { fullName, userName, email, password} = req.body;

   if (!fullName || !userName || !email || !password ) {
      return res.status(400).json({ success: false, message: "All fields are required" });
   }

   if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
   }

   const regexEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
   if (!regexEmail.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
   }

   const existEmail = await User.findOne({ email });
   if (existEmail) {
      return res.status(400).json({ success: false, message: "Email already exists" });
   }

   const existUserName = await User.findOne({ userName });
   if (existUserName || !/^[a-zA-Z0-9_]+$/.test(userName)) {
      return res.status(400).json({
         success: false,
         message: existUserName
            ? "Username already exists"
            : "Invalid username",
      });
   }

   const salt = await bcrypt.genSalt(10);
   const hashedPassword = await bcrypt.hash(password, salt);

   const verifyToken = Math.floor(100000 + Math.random() * 900000).toString();

   const user = await User.create({
      fullName,
      userName,
      email,
      password: hashedPassword,
      verifyToken,
      verifyTokenExpiry: Date.now() + 1 * 60 * 60 * 1000,
   });

   await user.save();

   await sendEmail(user.email, "Verify your email", VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verifyToken));

   res.status(201).json({ success: true, message: "User created successfully", data: user });

 } catch (error) {
   console.log("Error in signup", error.message);
   res.status(500).json({ success: false, message:"Something went wrong" });
 }

}

export const VerifyEmail = async(req, res) => {
    const {code} = req.body;
    try {

        const user = await User.findOne({verifyToken: code,verifyTokenExpiry: {$gt: Date.now()}});
        
        if(!user){
            return res.status(400).json({success:false, message:"Invalid verification code"})
        }
        user.isVerified = true;
        user.verifyToken = undefined;
        user.verifyTokenExpiry = undefined;
        
        await user.save();

        const token = generateToken(res,user._id)

        const { password:any, ...userData } = user.toObject();

        return res.status(200).json({success:true, message:"Email verified successfully", data: userData, token})
        
    } catch (error) {
        console.log("Error in verifyEmail controller", error.message);
        res.status(500).json({success:false, message:"Internal server error in verifyEmail controller"})
    }
}

export const OnBoard = async(req,res)=>{
   try {
      const {bio, profilePic,gender} = req.body;
      const user = await User.findById(req.user._id);
      if(!user){
         return res.status(404).json({success:false, message:"User not found"})
      }
      user.bio = bio;
      user.profilePic = profilePic;
      user.gender = gender;
      await user.save();
      return res.status(200).json({success:true, message:"User onBoard successfully"})
   } catch (error) {
      console.log("error in onBoard controller", error.message);
      res.status(500).json({success:false, message:"Internal server error in onBoard controller"})
   }
}

export const Login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validate input
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email/Username and password are required" });
    }

    // Find user by email or username based on input
    const user = identifier.includes("@")
      ? await User.findOne({ email: identifier })
      : await User.findOne({ userName: identifier });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateToken(res, user._id);

    const { password:any, ...userData } = user.toObject();

    return res.status(200).json({ success: true, message: "Login successful",data: userData , token });
  } catch (error) {
    console.error("Error in login:", error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const Logout = async(req,res) => {
   try {
      res.clearCookie("token")
      res.status(200).json({success:true,message:"Logout successfully"})
   } catch (error) {
      console.log('Error in logout',error.message);
      res.status(500).json({success:false,message:error.message})
   }
}

export const ForgotPassword = async(req,res) => {
   try {
      const {email} = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: "Invalid email" });

        const randomToken = crypto.randomBytes(20).toString("hex");
        user.resetPasswordToken = randomToken;
        user.resetPasswordTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        await sendEmail(user.email, "Reset your password", PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", `${process.env.CLIENT_URL}/reset-password/${randomToken}`));

        return res.status(200).json({success:true, message:"Reset password link sent successfully", })
   } catch (error) {
      console.log("Error in forgot password");
      res.status(500).json({success:false,message:error.message})
   }
}

export const ResetPassword = async(req,res) => {
   try {
        const {token} = req.params;
        const {password} = req.body;

        const user = await User.findOne({ resetPasswordToken: token,resetPasswordTokenExpiry: {$gt: Date.now()}});
        
        if(!user){
            return res.status(400).json({success:false, message:"Invalid reset token"})
        }
        
        const hasedPassword = await bcrypt.hash(password, 10);
        user.password = hasedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpiry = undefined;
        
        await user.save();
        return res.status(200).json({success:true, message:"Password reset successfully", })
   } catch (error) {
      console.log("Error in ");
      res.status(500).json({success:false,message:error.message})
   }
}

export const CheckAuth = async(req,res) => {
   try {
		const user = await User.findById(req.user).select("-password");
		res.status(200).json({ success: true, data: user });
   } catch (error) {
      console.log("Error in check auth controller", error.message);
      res.status(500).json({success:false, message:"Internal server error in check auth controller"})
   }
}