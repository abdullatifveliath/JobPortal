import express from "express";
import authenticateToken from "../middleware/isAuthenticated.js";
import requireRole from "../middleware/requireRole.js";
import {
  deleteCompany,
  deleteJob,
  deleteUser,
  getCompanies,
  getJobs,
  getStats,
  getUsers,
  setUserBlocked,
} from "../controllers/admin.controller.js";

const router = express.Router();

// every admin route needs a logged-in Admin
router.use(authenticateToken, requireRole("Admin"));

router.get("/stats", getStats);
router.get("/users", getUsers);
router.patch("/users/:id/block", setUserBlocked);
router.delete("/users/:id", deleteUser);
router.get("/jobs", getJobs);
router.delete("/jobs/:id", deleteJob);
router.get("/companies", getCompanies);
router.delete("/companies/:id", deleteCompany);

export default router;
