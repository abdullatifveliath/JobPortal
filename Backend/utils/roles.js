// The account types. The value is what's stored in the database,
// the label is what people see.
export const ROLES = {
  JOB_SEEKER: "JobSeeker",
  RECRUITER: "Recruiter",
  ADMIN: "Admin",
};

export const ROLE_LABELS = {
  JobSeeker: "Job Seeker",
  Recruiter: "Recruiter",
  Admin: "Admin",
};

// "Student" was the old name for JobSeeker. A browser still running the old
// page may send it for a while, so treat it as JobSeeker.
export const normalizeRole = (role) => (role === "Student" ? ROLES.JOB_SEEKER : role);

// One-time rename of existing accounts from "Student" to "JobSeeker".
// Runs on every server start; once done it matches nothing, so it's a no-op.
export const migrateStudentRole = async (User) => {
  try {
    const { modifiedCount } = await User.collection.updateMany(
      { role: "Student" },
      { $set: { role: ROLES.JOB_SEEKER } }
    );
    if (modifiedCount) console.log(`Renamed ${modifiedCount} Student account(s) to JobSeeker`);
  } catch (error) {
    // don't stop the server over this - it tries again on the next start
    console.error("Could not rename Student accounts:", error.message);
  }
};
