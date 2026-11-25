import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { migrateStudentRole } from "./roles.js";

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected...");
    // rename old "Student" accounts to "JobSeeker" (does nothing once done)
    await migrateStudentRole(User);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
