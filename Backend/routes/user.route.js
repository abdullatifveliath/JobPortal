import express from "express";
import {
  forgotPassword,
  getResume,
  getSavedJobs,
  toggleSavedJob,
  login,
  logout,
  register,
  resendOtp,
  resetPassword,
  updateProfile,
  verifyOtp,
} from "../controllers/user.controller.js";
import authenticateToken from "../middleware/isAuthenticated.js";
import { singleUpload, profileUpload } from "../middleware/multer.js";
import { authLimiter, emailLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

router.route("/register").post(emailLimiter, singleUpload, register);
router.route("/verify-otp").post(authLimiter, verifyOtp);
router.route("/resend-otp").post(emailLimiter, resendOtp);
router.route("/forgot-password").post(emailLimiter, forgotPassword);
router.route("/reset-password").post(authLimiter, resetPassword);
router.route("/login").post(authLimiter, login);
router.route("/logout").post(logout);
router
  .route("/profile/update")
  .post(authenticateToken, profileUpload, updateProfile);
router.route("/saved-jobs").get(authenticateToken, getSavedJobs);
router.route("/saved-jobs/:jobId").post(authenticateToken, toggleSavedJob);
router.route("/:id/resume").get(authenticateToken, getResume);

export default router;
