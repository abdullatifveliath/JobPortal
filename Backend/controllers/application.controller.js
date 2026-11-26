import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { escapeRegex } from "../utils/escapeRegex.js";
import { deleteApplications } from "../utils/cleanup.js";

export const applyJob = async (req, res) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;
    if (!jobId) {
      return res
        .status(400)
        .json({ message: "Invalid job id", success: false });
    }
    // check if the user already has applied for this job
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: userId,
    });
    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job",
        success: false,
      });
    }
    //check if the job exists or not
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }
    // create a new application

    const newApplication = await Application.create({
      job: jobId,
      applicant: userId,
    });
    // $addToSet + updateOne is atomic, so two requests can't clobber each other
    await Job.updateOne(
      { _id: jobId },
      { $addToSet: { applications: newApplication._id } }
    );

    return res
      .status(201)
      .json({ message: "Application submitted", success: true });
  } catch (error) {
    // duplicate key from the unique { job, applicant } index
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "You have already applied for this job",
        success: false,
      });
    }
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

export const getAppliedJobs = async (req, res) => {
  try {
    const userId = req.id;
    const application = await Application.find({ applicant: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "job",
        options: { sort: { createdAt: -1 } },
        populate: { path: "company", options: { sort: { createdAt: -1 } } },
      });
    if (!application) {
      return res
        .status(404)
        .json({ message: "No applications found", success: false });
    }

    return res.status(200).json({ application, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

export const getApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId).populate({
      path: "applications",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "applicant",
        // only what the recruiter's applicants table needs
        select: "fullname email phoneNumber profile createdAt",
        options: { sort: { createdAt: -1 } },
      },
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }
    // only the recruiter who posted the job can see its applicants
    if (job.created_by?.toString() !== req.id) {
      return res.status(403).json({
        message: "You can only view applicants for your own jobs",
        success: false,
      });
    }

    return res.status(200).json({ job, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

const PAGE_SIZE = 20;
const STATUSES = ["pending", "accepted", "rejected"];

// GET /api/application/recruiter?status=&job=&search=&page=
// Every application to every job this recruiter posted, newest first,
// so they don't have to open each job one by one.
export const getRecruiterApplications = async (req, res) => {
  try {
    const { status, job, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    // only this recruiter's jobs - also used for the "filter by job" dropdown
    const jobs = await Job.find({ created_by: req.id })
      .select("title company")
      .populate("company", "name")
      .sort({ createdAt: -1 })
      .lean();
    const ownJobIds = jobs.map((j) => j._id);

    // a job filter must be one of their own jobs, anything else matches nothing
    const jobIds =
      job && mongoose.isValidObjectId(job)
        ? ownJobIds.filter((id) => id.equals(job))
        : ownJobIds;

    const filter = { job: { $in: jobIds } };

    // search by applicant name or email
    if (search && String(search).trim()) {
      const pattern = new RegExp(escapeRegex(String(search).trim()), "i");
      const applicantIds = await Application.find({ job: { $in: jobIds } }).distinct("applicant");
      filter.applicant = {
        $in: await User.find({
          _id: { $in: applicantIds },
          $or: [{ fullname: pattern }, { email: pattern }],
        }).distinct("_id"),
      };
    }

    // counts per status (before the status filter, for the tabs)
    const grouped = await Application.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = { all: 0, pending: 0, accepted: 0, rejected: 0 };
    for (const g of grouped) {
      counts[g._id] = g.count;
      counts.all += g.count;
    }

    if (STATUSES.includes(status)) filter.status = status;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate("applicant", "fullname email phoneNumber profile.resume profile.resumeOriginalName profile.skills")
        .populate({ path: "job", select: "title company", populate: { path: "company", select: "name" } })
        .lean(),
      Application.countDocuments(filter),
    ]);

    return res.status(200).json({
      applications,
      jobs: jobs.map((j) => ({ _id: j._id, title: j.title, company: j.company?.name })),
      counts,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const applicationId = req.params.id;
    if (!status) {
      return res.status(400).json({
        message: "status is required",
        success: false,
      });
    }

    const newStatus = String(status).toLowerCase();
    if (!["pending", "accepted", "rejected"].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status", success: false });
    }

    // find the application, with its job so we can check who posted it
    const application = await Application.findById(applicationId).populate({
      path: "job",
      select: "created_by",
    });
    if (!application) {
      return res.status(404).json({
        message: "Application not found.",
        success: false,
      });
    }
    // only the recruiter who posted the job can change its applications
    if (application.job?.created_by?.toString() !== req.id) {
      return res.status(403).json({
        message: "You can only update applications for your own jobs",
        success: false,
      });
    }

    // update the status
    application.status = newStatus;
    await application.save();

    return res
      .status(200)
      .json({ message: "Application status updated", success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

// DELETE /api/application/:id - a job seeker withdraws their own application.
// Only while it's still pending: once the recruiter has accepted or rejected
// it, the decision stays on record. After withdrawing they can apply again.
export const withdrawApplication = async (req, res) => {
  try {
    const notFound = () =>
      res.status(404).json({ message: "Application not found", success: false });
    if (!mongoose.isValidObjectId(req.params.id)) return notFound();

    // owner check is part of the query: someone else's application is "not found"
    const application = await Application.findOne({ _id: req.params.id, applicant: req.id })
      .populate("job", "title");
    if (!application) return notFound();

    if (application.status !== "pending") {
      return res.status(409).json({
        message: `This application was already ${application.status}, so it can't be withdrawn.`,
        success: false,
      });
    }

    await deleteApplications({ _id: application._id }); // also updates the job's list
    return res.status(200).json({
      message: application.job?.title
        ? `Application for "${application.job.title}" withdrawn`
        : "Application withdrawn",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", success: false });
  }
};
