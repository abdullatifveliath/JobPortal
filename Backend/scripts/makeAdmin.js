// Give (or take away) super admin access. Nobody can choose "Admin" at sign-up,
// so this script is the only way to create one.
//
//   npm run make-admin -- you@example.com            -> make this account an Admin
//   npm run make-admin -- you@example.com --demote   -> back to Job Seeker
//   npm run make-admin -- you@example.com --demote --role Recruiter
//   npm run make-admin -- --list                     -> show all admins
//
// Register and verify the account on the website first, like any other user.
// Best practice: use a separate account for admin work. Promoting a recruiter
// who has companies or a job seeker who has applications needs --force, because
// an Admin can't use the recruiter or job seeker pages.

import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Application } from "../models/application.model.js";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

dotenv.config({ quiet: true });

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const email = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--role");

const fail = async (message) => {
  console.error(message);
  await mongoose.disconnect();
  process.exit(1);
};

await mongoose.connect(process.env.MONGO_URI);

if (flag("--list")) {
  const admins = await User.find({ role: "Admin" }).select("fullname email isBlocked");
  console.log(admins.length ? "Admins:" : "There are no admins yet.");
  admins.forEach((a) => console.log(`  ${a.fullname} <${a.email}>${a.isBlocked ? " (blocked)" : ""}`));
  await mongoose.disconnect();
  process.exit(0);
}

if (!email) await fail("Usage: npm run make-admin -- you@example.com [--demote [--role JobSeeker|Recruiter]] [--force]");

const user = await User.findOne({ email: email.trim() });
if (!user) await fail(`No account with the email ${email}. Register it on the website first.`);

if (flag("--demote")) {
  const role = normalizeRole(option("--role") || "JobSeeker");
  if (!["JobSeeker", "Recruiter"].includes(role)) await fail("--role must be JobSeeker or Recruiter");
  if (user.role !== "Admin") await fail(`${user.email} is not an Admin (they are a ${ROLE_LABELS[user.role] || user.role}).`);
  const otherAdmins = await User.countDocuments({ role: "Admin", _id: { $ne: user._id } });
  if (!otherAdmins && !flag("--force")) {
    await fail("This is the last admin. Add another admin first, or pass --force.");
  }
  await User.updateOne({ _id: user._id }, { role });
  console.log(`${user.fullname} <${user.email}> is now a ${ROLE_LABELS[role]}.`);
} else {
  if (user.role === "Admin") await fail(`${user.email} is already an Admin.`);
  if (!user.isVerified) await fail(`${user.email} hasn't verified their email yet. Verify it first.`);

  // an Admin can't use recruiter/job seeker pages, so warn before hiding their data
  const owns =
    user.role === "Recruiter"
      ? `${await Company.countDocuments({ userId: user._id })} companies`
      : `${await Application.countDocuments({ applicant: user._id })} applications`;
  if (!owns.startsWith("0 ") && !flag("--force")) {
    await fail(
      `${user.email} is a ${user.role} with ${owns}. As an Admin they can no longer manage these.\n` +
        "Use a separate account for admin work, or pass --force to continue anyway."
    );
  }
  await User.updateOne({ _id: user._id }, { role: "Admin", isBlocked: false });
  console.log(`${user.fullname} <${user.email}> is now an Admin. Log in and open /super-admin.`);
}

await mongoose.disconnect();
