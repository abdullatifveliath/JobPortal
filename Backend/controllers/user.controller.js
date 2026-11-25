import { User } from "../models/user.model.js";
import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloud.js";
import { sendOtpEmail } from "../utils/mailer.js";
import crypto from "crypto";
import { isValidResume, resumeExtension } from "../middleware/multer.js";
import { normalizeRole } from "../utils/roles.js";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

// cryptographically secure random 6 digit OTP (Math.random is predictable)
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// we only store a hash of the OTP, like a password
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

// gives the user a fresh OTP (and resets the wrong-guess counter).
// returns the plain OTP so it can be emailed. caller must save the user.
const setNewOtp = (user) => {
  const otp = generateOtp();
  user.otp = hashOtp(otp);
  user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  return otp;
};

const clearOtp = (user) => {
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;
};

// checks an OTP guess. returns an error message, or null if it is correct.
// user must be loaded with .select("+otp +otpExpiry +otpAttempts")
const checkOtp = async (user, otp) => {
  if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
    return "OTP has expired. Please request a new one.";
  }

  const expected = Buffer.from(user.otp, "hex");
  const given = Buffer.from(hashOtp(otp), "hex");
  if (crypto.timingSafeEqual(expected, given)) {
    return null;
  }

  // wrong guess - count it, and kill the OTP after too many
  user.otpAttempts = (user.otpAttempts || 0) + 1;
  if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    clearOtp(user);
    await user.save();
    return "Too many wrong attempts. Please request a new OTP.";
  }
  await user.save();
  return `Invalid OTP. ${MAX_OTP_ATTEMPTS - user.otpAttempts} attempt(s) left.`;
};

const OTP_FIELDS = "+otp +otpExpiry +otpAttempts";

// login cookie settings. secure = only sent over HTTPS (on in production).
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "Strict",
  secure: process.env.NODE_ENV === "production",
});

export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, termsAcceptedAt } = req.body;
    const role = normalizeRole(req.body.role);

    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(404).json({
        message: "Missing required fields",
        success: false,
      });
    }
    if (!["JobSeeker", "Recruiter"].includes(role)) {
      return res.status(400).json({ message: "Invalid role", success: false });
    }

    // check duplicates BEFORE uploading, so we don't waste Cloudinary uploads
    const existing = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existing) {
      return res.status(400).json({
        message:
          existing.email === email
            ? "Email already exists"
            : "Phone number already exists",
        success: false,
      });
    }

    // profile photo is optional on the signup form
    let profilePhoto = "";
    if (req.file) {
      const fileUri = getDataUri(req.file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
      profilePhoto = cloudResponse?.secure_url || "";
    }
    //convert passwords to hashes
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      termsAcceptedAt,
      isVerified: false,
      profile:{
        profilePhoto,
      }
    });

    // generate an OTP, valid for 10 minutes
    const otp = setNewOtp(newUser);
    await newUser.save();

    // send the OTP email - if this fails, remove the user so they can retry
    try {
      await sendOtpEmail(email, otp);
    } catch (mailError) {
      console.error("Failed to send OTP email:", mailError);
      await User.deleteOne({ _id: newUser._id });
      return res.status(500).json({
        message: "Could not send verification email. Please try again.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "OTP sent to your email. Please verify to continue.",
      email,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error registering user",
      success: false,
    });
  }
};

// Verify the OTP the user received on email
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
        success: false,
      });
    }

    const user = await User.findOne({ email }).select(OTP_FIELDS);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email is already verified. Please login.",
        success: false,
      });
    }

    const otpError = await checkOtp(user, otp);
    if (otpError) {
      return res.status(400).json({ message: otpError, success: false });
    }

    user.isVerified = true;
    clearOtp(user);
    await user.save();

    // log the user in right away so they don't have to login again
    const token = await jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const safeUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        ...cookieOptions(),
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Email verified successfully.",
        user: safeUser,
        success: true,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error verifying OTP", success: false });
  }
};

// Send an OTP to reset the password (used by both "forgot password" and
// the "change password" option in the profile).
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required", success: false });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "No account found with this email",
        success: false,
      });
    }

    const otp = setNewOtp(user);
    await user.save();

    await sendOtpEmail(email, otp);

    return res.status(200).json({
      message: "OTP sent to your email.",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error sending OTP", success: false });
  }
};

// Verify the OTP and set the new password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required", success: false });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
        success: false,
      });
    }

    const user = await User.findOne({ email }).select(OTP_FIELDS);
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const otpError = await checkOtp(user, otp);
    if (otpError) {
      return res.status(400).json({ message: otpError, success: false });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    clearOtp(user);
    user.isVerified = true; // a successful reset also confirms the email
    await user.save();

    return res.status(200).json({
      message: "Password changed successfully. Please login.",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error resetting password", success: false });
  }
};

// Resend a fresh OTP if the old one expired or got lost
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required", success: false });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email is already verified. Please login.",
        success: false,
      });
    }

    const otp = setNewOtp(user);
    await user.save();

    await sendOtpEmail(email, otp);

    return res.status(200).json({
      message: "A new OTP has been sent to your email.",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error resending OTP", success: false });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const role = normalizeRole(req.body.role);

    if (!email || !password || !role) {
      return res.status(404).json({
        message: "Missing required fields",
        success: false,
      });
    }
    // password is hidden by default (select: false), ask for it explicitly
    let user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({
        message: "Incorrect email or password",
        success: false,
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(404).json({
        message: "Incorrect email or password",
        success: false,
      });
    }
    // block login until the email is verified via OTP
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        needVerification: true,
        success: false,
      });
    }
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
        success: false,
      });
    }
    //check role correctly or not (admins can log in with either option selected)
    if (user.role !== role && user.role !== "Admin") {
      return res.status(403).json({
        message: "You don't have the necessary role to access this resource",
        success: false,
      });
    }

    //generate token
    const tokenData = {
      userId: user._id,
    };
    const token = await jwt.sign(tokenData, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res
      .status(200)
      .cookie("token", token, {
        ...cookieOptions(),
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: `Welcome back ${user.fullname}`,
        user,
        success: true,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error login failed",
      success: false,
    });
  }
};

export const logout = async (req, res) => {
  // clear with the same options it was set with, or some browsers keep it
  return res.status(200).clearCookie("token", cookieOptions()).json({
    message: "Logged out successfully.",
    success: true,
  });
};




export const updateProfile = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, bio, skills } = req.body;
    const photoFile = req.files?.file?.[0];
    const resumeFile = req.files?.resume?.[0];
    const userId = req.id; // set by authentication middleware

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // email is the verified login identity - changing it here would skip
    // OTP verification, so it can't be changed from the profile form.
    if (email && email !== user.email) {
      return res.status(400).json({
        message: "Email can't be changed from your profile",
        success: false,
      });
    }
    // phone is unique - give a clear error instead of a crash
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      if (await User.exists({ phoneNumber, _id: { $ne: userId } })) {
        return res.status(400).json({
          message: "That phone number is already used by another account",
          success: false,
        });
      }
    }

    // the extension says PDF/DOC/DOCX - make sure the content really is
    if (resumeFile && !isValidResume(resumeFile)) {
      return res.status(400).json({
        message: "Resume must be a PDF, DOC or DOCX file",
        success: false,
      });
    }

    //cloudinary upload if file exists (after validation, so no wasted uploads)
    let cloudResponse;
    if (photoFile) {
      const fileUri = getDataUri(photoFile);
      cloudResponse = await cloudinary.uploader.upload(fileUri.content);
    }

    // resumes are uploaded as private "raw" files. Cloudinary refuses to deliver
    // PDFs from public links by default, and resumes are personal anyway, so they
    // are only opened through getResume below, which checks who is asking.
    // the extension must be part of the public_id for raw files.
    let resumeResponse;
    const oldResumeId = user.profile.resumePublicId;
    if (resumeFile) {
      const ext = resumeExtension(resumeFile.originalname);
      resumeResponse = await cloudinary.uploader.upload(getDataUri(resumeFile).content, {
        resource_type: "raw",
        type: "private",
        folder: "resumes",
        public_id: `${userId}-${Date.now()}${ext}`,
      });
    }

    // Process skills if provided
    let skillsArray;
    if (skills) {
      skillsArray = skills.split(",");
    }

    // Update user profile
    if (fullname) {
      user.fullname = fullname;
    }
    if (phoneNumber) {
      user.phoneNumber = phoneNumber;
    }
    if (bio) {
      user.profile.bio = bio;
    }
    if (skills) {
      user.profile.skills = skillsArray;
    }
    if (resumeResponse) {
      user.profile.resume = resumeResponse.secure_url;
      user.profile.resumePublicId = resumeResponse.public_id;
      // keep only a safe, short display name
      user.profile.resumeOriginalName = resumeFile.originalname
        .replace(/[^\w.\- ()]/g, "_")
        .slice(-100);
    }

    //profile photo
    if (cloudResponse) {
      user.profile.profilePhoto = cloudResponse.secure_url;
    }

    // Save updated user
    await user.save();

    // the new resume is saved - remove the replaced file (best effort)
    if (resumeResponse && oldResumeId) {
      cloudinary.uploader
        .destroy(oldResumeId, { resource_type: "raw", type: "private" })
        .catch((err) => console.error("Could not delete old resume:", err.message));
    }

    user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile,
    };

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error updating profile",
      success: false,
    });
  }
};

// GET /api/user/:id/resume - opens a user's resume.
// Allowed for the user themself, and for recruiters the user has applied to.
// Redirects to a short-lived signed link, so stored files are never public.
export const getResume = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Resume not found", success: false });
    }

    if (id !== req.id) {
      // has this user applied to one of the requester's jobs?
      const applications = await Application.find({ applicant: id })
        .populate({ path: "job", select: "created_by" })
        .select("job");
      const allowed = applications.some((a) => a.job?.created_by?.toString() === req.id);
      if (!allowed) {
        return res.status(403).json({
          message: "You can only view resumes of people who applied to your jobs",
          success: false,
        });
      }
    }

    const user = await User.findById(id).select("profile.resume profile.resumePublicId");
    const { resume, resumePublicId } = user?.profile || {};

    if (resumePublicId) {
      const url = cloudinary.utils.private_download_url(resumePublicId, undefined, {
        resource_type: "raw",
        type: "private",
        expires_at: Math.floor(Date.now() / 1000) + 5 * 60, // link works for 5 minutes
      });
      return res.redirect(url);
    }
    // older accounts saved a resume link typed in by the user
    if (resume && /^https?:\/\//i.test(resume)) {
      return res.redirect(resume);
    }
    return res.status(404).json({ message: "Resume not found", success: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not open resume", success: false });
  }
};

// the user's saved jobs, newest saved first, ready for the job cards
const loadSavedJobs = async (userId) => {
  const user = await User.findById(userId)
    .select("savedJobs")
    .populate({ path: "savedJobs", populate: { path: "company", select: "name logo" } });
  // a saved job may have been deleted since - skip it
  return (user?.savedJobs || []).filter(Boolean).reverse();
};

// GET /api/user/saved-jobs
export const getSavedJobs = async (req, res) => {
  try {
    return res.status(200).json({ savedJobs: await loadSavedJobs(req.id), success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load saved jobs", success: false });
  }
};

// POST /api/user/saved-jobs/:jobId - saves the job, or unsaves it if already saved
export const toggleSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId) || !(await Job.exists({ _id: jobId }))) {
      return res.status(404).json({ message: "Job not found", success: false });
    }
    // only remove if it's there, otherwise add - each in one atomic update
    const removed = await User.updateOne(
      { _id: req.id, savedJobs: jobId },
      { $pull: { savedJobs: jobId } }
    );
    const saved = removed.modifiedCount === 0;
    if (saved) {
      await User.updateOne({ _id: req.id }, { $addToSet: { savedJobs: jobId } });
    }
    return res.status(200).json({
      message: saved ? "Job saved" : "Job removed from saved jobs",
      saved,
      savedJobs: await loadSavedJobs(req.id),
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update saved jobs", success: false });
  }
};
