import mongoose from "mongoose";

export const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🚀 Connected to MongoDB");
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error);
    }
};