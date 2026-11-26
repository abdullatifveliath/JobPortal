import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import { Application } from "../models/application.model.js";
import cloudinary from "../utils/cloud.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { deleteApplications, deleteJobs } from "../utils/cleanup.js";

// Super admin actions. Every route here is behind requireRole("Admin").

const PAGE_SIZE = 20;

// ?page=2 -> { skip: 20, limit: 20, page: 2 }
const paging = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  return { page, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE };
};

// case-insensitive "contains" search, safe for input like "C++"
const contains = (text) => new RegExp(escapeRegex(String(text).trim()), "i");

const notFound = (res, what) =>
  res.status(404).json({ message: `${what} not found`, success: false });

const serverError = (res, error) => {
  console.error(error);
  return res.status(500).json({ message: "Server error", success: false });
};

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const [usersByRole, blockedUsers, jobs, companies, appsByStatus, recentUsers] =
      await Promise.all([
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        User.countDocuments({ isBlocked: true }),
        Job.countDocuments(),
        Company.countDocuments(),
        Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        User.find()
          .select("fullname email role isVerified isBlocked createdAt")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    const roles = Object.fromEntries(usersByRole.map((r) => [r._id, r.count]));
    const statuses = Object.fromEntries(appsByStatus.map((s) => [s._id, s.count]));

    return res.status(200).json({
      stats: {
        users: {
          total: Object.values(roles).reduce((a, b) => a + b, 0),
          jobSeekers: roles.JobSeeker || 0,
          recruiters: roles.Recruiter || 0,
          admins: roles.Admin || 0,
          blocked: blockedUsers,
        },
        jobs,
        companies,
        applications: {
          total: Object.values(statuses).reduce((a, b) => a + b, 0),
          pending: statuses.pending || 0,
          accepted: statuses.accepted || 0,
          rejected: statuses.rejected || 0,
        },
        recentUsers,
      },
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// GET /api/admin/users?search=&role=&page=
export const getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const { page, skip, limit } = paging(req.query);
    const filter = {};
    if (search?.trim()) {
      filter.$or = [{ fullname: contains(search) }, { email: contains(search) }];
    }
    if (["JobSeeker", "Recruiter", "Admin"].includes(role)) filter.role = role;
    if (role === "Blocked") filter.isBlocked = true;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("fullname email phoneNumber role isVerified isBlocked createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);
    return res.status(200).json({
      users,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// checks shared by block and delete: the id exists, isn't you, isn't an admin
const findManageableUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    notFound(res, "User");
    return null;
  }
  if (id === req.id) {
    res.status(400).json({ message: "You can't do this to your own account", success: false });
    return null;
  }
  const user = await User.findById(id).select("fullname role isBlocked profile.resumePublicId");
  if (!user) {
    notFound(res, "User");
    return null;
  }
  if (user.role === "Admin") {
    res.status(400).json({
      message: "Admin accounts can't be blocked or deleted here",
      success: false,
    });
    return null;
  }
  return user;
};

// PATCH /api/admin/users/:id/block   body: { blocked: true | false }
export const setUserBlocked = async (req, res) => {
  try {
    if (typeof req.body.blocked !== "boolean") {
      return res.status(400).json({ message: "blocked must be true or false", success: false });
    }
    const user = await findManageableUser(req, res);
    if (!user) return;
    const blocked = req.body.blocked;
    await User.updateOne({ _id: user._id }, { isBlocked: blocked });
    return res.status(200).json({
      message: `${user.fullname} has been ${blocked ? "blocked" : "unblocked"}`,
      user: { _id: user._id, isBlocked: blocked },
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// DELETE /api/admin/users/:id
// Job seekers: their applications and resume go too.
// Recruiters: their companies, jobs and those jobs' applications go too.
export const deleteUser = async (req, res) => {
  try {
    const user = await findManageableUser(req, res);
    if (!user) return;

    const removed = { applications: 0, jobs: 0, companies: 0 };
    if (user.role === "JobSeeker") {
      removed.applications = await deleteApplications({ applicant: user._id });
    } else {
      const companyIds = await Company.find({ userId: user._id }).distinct("_id");
      const result = await deleteJobs({
        $or: [{ created_by: user._id }, { company: { $in: companyIds } }],
      });
      removed.jobs = result.jobs;
      removed.applications = result.applications;
      removed.companies = (await Company.deleteMany({ _id: { $in: companyIds } })).deletedCount;
    }
    await User.deleteOne({ _id: user._id });

    // the account is gone - remove the private resume file too (best effort)
    if (user.profile?.resumePublicId) {
      cloudinary.uploader
        .destroy(user.profile.resumePublicId, { resource_type: "raw", type: "private" })
        .catch((err) => console.error("Could not delete resume:", err.message));
    }

    return res.status(200).json({
      message: `${user.fullname} has been deleted`,
      removed,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// GET /api/admin/jobs?search=&page=
export const getJobs = async (req, res) => {
  try {
    const { search } = req.query;
    const { page, skip, limit } = paging(req.query);
    const filter = {};
    if (search?.trim()) {
      const companyIds = await Company.find({ name: contains(search) }).distinct("_id");
      filter.$or = [{ title: contains(search) }, { company: { $in: companyIds } }];
    }
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .select("title location salary jobType company created_by applications createdAt")
        .populate("company", "name")
        .populate("created_by", "fullname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);
    return res.status(200).json({
      jobs: jobs.map((j) => {
        const { applications, ...job } = j.toObject();
        return { ...job, applicationCount: applications?.length || 0 };
      }),
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// DELETE /api/admin/jobs/:id
export const deleteJob = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, "Job");
    const job = await Job.findById(req.params.id).select("title");
    if (!job) return notFound(res, "Job");
    const removed = await deleteJobs({ _id: job._id });
    return res.status(200).json({
      message: `"${job.title}" has been deleted`,
      removed,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// GET /api/admin/companies?search=&page=
export const getCompanies = async (req, res) => {
  try {
    const { search } = req.query;
    const { page, skip, limit } = paging(req.query);
    const filter = search?.trim() ? { name: contains(search) } : {};
    const [companies, total] = await Promise.all([
      Company.find(filter)
        .select("name location website logo userId createdAt")
        .populate("userId", "fullname email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(filter),
    ]);
    // how many jobs each company on this page has
    const counts = await Job.aggregate([
      { $match: { company: { $in: companies.map((c) => c._id) } } },
      { $group: { _id: "$company", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
    return res.status(200).json({
      companies: companies.map((c) => ({ ...c, jobCount: countMap.get(c._id.toString()) || 0 })),
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// DELETE /api/admin/companies/:id   (its jobs and their applications go too)
export const deleteCompany = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, "Company");
    const company = await Company.findById(req.params.id).select("name");
    if (!company) return notFound(res, "Company");
    const removed = await deleteJobs({ company: company._id });
    await Company.deleteOne({ _id: company._id });
    return res.status(200).json({
      message: `${company.name} has been deleted`,
      removed: { ...removed, companies: 1 },
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};
