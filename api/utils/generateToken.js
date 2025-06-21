import jwt from "jsonwebtoken";
import "dotenv/config";

export const generateToken = (res,Id) => {
    const token = jwt.sign({ Id }, process.env.JWT_SECRET, {
        expiresIn: "10d",
    });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "strict",
        maxAge: 10 * 24 * 60 * 60 * 1000,
    });

    return token;
};
