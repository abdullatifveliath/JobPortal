import { Company } from "../models/company.model.js";
import getDataUri from "../utils/datauri.js";
import cloudinary from '../utils/cloud.js';
import mongoose from "mongoose";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { deleteJobs } from "../utils/cleanup.js";

const serverError = (res, error) => {
  console.error(error);
  return res.status(500).json({ message: "Server error", success: false });
};

export const registerCompany = async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName) {
      return res.status(400).json({
        message: "Company name is required",
        success: false,
      });
    }
    let company = await Company.findOne({ name: companyName });
    if (company) {
      return res.status(400).json({
        message: "Company already exists",
        success: false,
      });
    }
    company = await Company.create({
      name: companyName,
      userId: req.id,
    });
    return res.status(201).json({
      message: "Company registered successfully.",
      company,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

export const getAllCompanies = async (req, res) => {
  try {
    const userId = req.id; // loggedin user id
    const companies = await Company.find({ userId });
    return res.status(200).json({
      companies,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};

//get company by id - only the recruiter who owns it
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      userId: req.id,
    });
    if (!company) {
      return res
        .status(404)
        .json({ message: "Company not found", success: false });
    }
    return res.status(200).json({ company, success: true });
  } catch (error) {
    return serverError(res, error);
  }
};

//update company details - only the recruiter who owns it
export const updateCompany = async (req, res) => {
  try {
    const { name, description, website, location } = req.body;
    const updateData = { name, description, website, location };

    // logo is optional - only upload when a new file is sent
    if (req.file) {
      const fileUri = getDataUri(req.file);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
      updateData.logo = cloudResponse.secure_url;
    }

    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, userId: req.id },
      updateData,
      { returnDocument: "after" }
    );
    if (!company) {
      return res
        .status(404)
        .json({ message: "Company not found", success: false });
    }
    return res
      .status(200)
      .json({ message: "Company updated", company, success: true });
  } catch (error) {
    return serverError(res, error);
  }
};

// DELETE /api/company/:id            -> delete a company with no jobs
// DELETE /api/company/:id?withJobs=1 -> also delete its jobs (none applied to)
// Only the recruiter who owns it. Companies whose jobs have applications are
// kept, so job seekers don't silently lose their application history.
export const deleteCompany = async (req, res) => {
  try {
    const notFound = () =>
      res.status(404).json({ message: "Company not found", success: false });
    if (!mongoose.isValidObjectId(req.params.id)) return notFound();

    // owner check is part of the query: someone else's company is "not found"
    const company = await Company.findOne({ _id: req.params.id, userId: req.id }).select("name");
    if (!company) return notFound();

    const jobIds = await Job.find({ company: company._id }).distinct("_id");
    const applications = jobIds.length
      ? await Application.countDocuments({ job: { $in: jobIds } })
      : 0;

    if (applications > 0) {
      return res.status(409).json({
        message: `${company.name} can't be deleted: its jobs have ${applications} application(s) from job seekers. Contact an admin if it really needs to go.`,
        jobs: jobIds.length,
        applications,
        success: false,
      });
    }

    // has jobs: the page must confirm deleting them too
    if (jobIds.length > 0 && req.query.withJobs !== "1") {
      return res.status(409).json({
        message: `${company.name} has ${jobIds.length} job(s). They will be deleted too.`,
        jobs: jobIds.length,
        applications: 0,
        needsConfirm: true,
        success: false,
      });
    }

    const removed = await deleteJobs({ company: company._id });
    await Company.deleteOne({ _id: company._id });

    return res.status(200).json({
      message: `${company.name} has been deleted`,
      removed,
      success: true,
    });
  } catch (error) {
    return serverError(res, error);
  }
};
