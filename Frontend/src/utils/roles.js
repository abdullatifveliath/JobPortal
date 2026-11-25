// Stored role value -> what people see (matches Backend/utils/roles.js)
export const ROLE_LABELS = {
  JobSeeker: "Job Seeker",
  Recruiter: "Recruiter",
  Admin: "Admin",
};

export const roleLabel = (role) => ROLE_LABELS[role] || role;
