import express from "express";

import authenticateToken from "../middleware/isAuthenticated.js";
import requireRole from "../middleware/requireRole.js";
import {
  getAdminJobs,
  getAllJobs,
  getJobById,
  getRecommendedJobs,
  postJob,
} from "../controllers/job.controller.js";

const router = express.Router();

router
  .route("/post")
  .post(authenticateToken, requireRole("Recruiter"), postJob);
// public - anyone can browse jobs without logging in
router.route("/get").get(getAllJobs);
router
  .route("/getadminjobs")
  .get(authenticateToken, requireRole("Recruiter"), getAdminJobs);
router.route("/get/:id").get(getJobById);
router.route("/recommendations/:id").get(getRecommendedJobs);
export default router;
