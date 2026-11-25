import express from "express";

import authenticateToken from "../middleware/isAuthenticated.js";
import requireRole from "../middleware/requireRole.js";
import { applyJob, getApplicants, getAppliedJobs, getRecruiterApplications, updateStatus } from "../controllers/application.controller.js";

const router = express.Router();

// job seekers apply and see their own applications
// POST, not GET - it changes data (link prefetchers/crawlers fire GETs)
router.route("/apply/:id").post(authenticateToken, requireRole("JobSeeker"), applyJob);
router.route("/get").get(authenticateToken, requireRole("JobSeeker"), getAppliedJobs);
// recruiters manage applications for jobs they posted (ownership is checked in the controller)
router.route("/recruiter").get(authenticateToken, requireRole("Recruiter"), getRecruiterApplications);
router.route("/:id/applicants").get(authenticateToken, requireRole("Recruiter"), getApplicants);
router.route("/status/:id/update").post(authenticateToken, requireRole("Recruiter"), updateStatus);

export default router;
