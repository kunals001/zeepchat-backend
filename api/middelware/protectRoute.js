import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import "dotenv/config";

export const protectRoute = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.Id);
    req.user = user;
    next();
  } catch (error) {
    console.log("Error in verifyToken ", error);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
