import mongoose from "mongoose";
import { MONGO_URI } from "./env.js";

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB connected");
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    throw err;
  }
}

export async function disconnectDatabase() {
  return mongoose.disconnect();
}
