import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";

// Shared by the super admin and recruiter delete actions, so removing data
// never leaves broken references behind.

// remove applications and keep each job's applications list in sync
export const deleteApplications = async (filter) => {
  const apps = await Application.find(filter).select("_id job");
  if (!apps.length) return 0;
  const ids = apps.map((a) => a._id);
  await Job.updateMany(
    { _id: { $in: [...new Set(apps.map((a) => a.job.toString()))] } },
    { $pull: { applications: { $in: ids } } }
  );
  await Application.deleteMany({ _id: { $in: ids } });
  return ids.length;
};

// remove jobs together with their applications and anyone's saved copies
export const deleteJobs = async (filter) => {
  const jobIds = await Job.find(filter).distinct("_id");
  if (!jobIds.length) return { jobs: 0, applications: 0 };
  const applications = await Application.deleteMany({ job: { $in: jobIds } });
  await User.updateMany(
    { savedJobs: { $in: jobIds } },
    { $pull: { savedJobs: { $in: jobIds } } }
  );
  await Job.deleteMany({ _id: { $in: jobIds } });
  return { jobs: jobIds.length, applications: applications.deletedCount };
};
