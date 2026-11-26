import express from "express";

import authenticateToken from "../middleware/isAuthenticated.js";
import requireRole from "../middleware/requireRole.js";
import {
  getAllCompanies,
  getCompanyById,
  registerCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/company.controller.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

// every company route is for recruiters managing their own companies
router.use(authenticateToken, requireRole("Recruiter"));

router.route("/register").post(registerCompany);
router.route("/get").get(getAllCompanies);
router.route("/get/:id").get(getCompanyById);
router.route("/update/:id").put(singleUpload, updateCompany);
router.route("/:id").delete(deleteCompany);

export default router;
