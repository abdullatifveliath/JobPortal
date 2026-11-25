import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    // select: false = never returned by queries unless asked for with
    // .select("+password"), so it can't leak through populate() etc.
    password: {
      type: String,
      required: true,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    // wrong guesses for the current OTP - the OTP is wiped after 5
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    // jobs the user bookmarked with "Save For Later" (kept on the account,
    // so they follow the user across devices and disappear on logout)
    savedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
      },
    ],
    // set by an admin - a blocked user can't log in or use their account
    isBlocked: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      // "Admin" can't be picked at sign-up - see scripts/makeAdmin.js
      enum: ["JobSeeker", "Recruiter", "Admin"],
      default: "JobSeeker",
      required: true,
    },
    profile: {
      bio: {
        type: String,
      },
      skills: [{ type: String }],
      resume: {
        type: String, // URL to resume file
      },
      resumeOriginalName: {
        type: String, // file name shown to users, e.g. "Jane_CV.pdf"
      },
      resumePublicId: {
        type: String, // Cloudinary id of the private resume file (served via GET /api/user/:id/resume)
      },
      company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
        profilePhoto: {
          type: String, // URL to profile photo file
          default: "",
        },
      },
      termsAcceptedAt: {
        type: Date,
      },
    },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
