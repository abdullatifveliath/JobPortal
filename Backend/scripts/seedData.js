// Seed demo companies and jobs.
//
//   node scripts/seedData.js                  -> add data (safe to re-run)
//   node scripts/seedData.js --owner a@b.com  -> use a specific recruiter
//   node scripts/seedData.js --remove         -> remove what this script added
//
// - Makes sure every company in COMPANIES exists (existing ones are kept as-is).
// - Tops every company owned by the recruiter up to JOBS_PER_COMPANY jobs.
// - Re-running never duplicates: jobs are matched by company + title.
// - The data is varied on purpose so every Jobs-page filter has matches.

import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";

dotenv.config({ quiet: true });

const JOBS_PER_COMPANY = 10;

// name -> details. The first three already exist in the DB and are left untouched.
const COMPANIES = [
  { name: "Google", offices: ["Bengaluru", "Hyderabad", "Gurugram", "Pune"] },
  { name: "Microsoft", offices: ["Hyderabad", "Bengaluru", "Noida", "Remote"] },
  { name: "Amazon", offices: ["Bengaluru", "Hyderabad", "Chennai", "Delhi"] },
  {
    name: "Infosys",
    description: "Global leader in next-generation digital services and consulting.",
    website: "https://www.infosys.com",
    location: "Bengaluru, Karnataka",
    offices: ["Pune", "Bengaluru", "Chennai", "Hyderabad", "Kolhapur"],
  },
  {
    name: "Tata Consultancy Services",
    description: "IT services, consulting and business solutions organisation.",
    website: "https://www.tcs.com",
    location: "Mumbai, Maharashtra",
    offices: ["Mumbai", "Pune", "Chennai", "Delhi", "Kolhapur"],
  },
  {
    name: "Flipkart",
    description: "India's leading e-commerce marketplace.",
    website: "https://www.flipkart.com",
    location: "Bengaluru, Karnataka",
    offices: ["Bengaluru", "Delhi", "Remote"],
  },
  {
    name: "Zoho",
    description: "Cloud software suite for businesses, built in India.",
    website: "https://www.zoho.com",
    location: "Chennai, Tamil Nadu",
    offices: ["Chennai", "Remote", "Pune"],
  },
  {
    name: "Swiggy",
    description: "On-demand food and grocery delivery platform.",
    website: "https://www.swiggy.com",
    location: "Bengaluru, Karnataka",
    offices: ["Bengaluru", "Hyderabad", "Mumbai"],
  },
  {
    name: "Razorpay",
    description: "Full-stack financial solutions and payments platform for businesses.",
    website: "https://razorpay.com",
    location: "Bengaluru, Karnataka",
    offices: ["Bengaluru", "Remote", "Mumbai"],
  },
  {
    name: "Freshworks",
    description: "SaaS customer and employee engagement software.",
    website: "https://www.freshworks.com",
    location: "Chennai, Tamil Nadu",
    offices: ["Chennai", "Hyderabad", "Remote"],
  },
];

// Role templates. exp = [min, max] years, pay = LPA at min experience, step = LPA per extra year.
const ROLES = [
  { title: "Frontend Developer", reqs: ["React", "JavaScript", "HTML", "CSS", "Redux"], exp: [1, 4], pay: 6, step: 2.5,
    desc: "Build fast, accessible user interfaces in React and work closely with designers to ship polished features." },
  { title: "React Developer", reqs: ["React", "TypeScript", "Tailwind CSS", "REST APIs"], exp: [2, 5], pay: 9, step: 2.5,
    desc: "Own key screens of our web app, write reusable React components and improve performance across the product." },
  { title: "Backend Developer", reqs: ["Node.js", "Express", "MongoDB", "REST APIs"], exp: [1, 5], pay: 7, step: 3,
    desc: "Design and build scalable backend services and APIs that power our products." },
  { title: "Node.js Engineer", reqs: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Docker"], exp: [3, 6], pay: 14, step: 3,
    desc: "Build high-throughput services in Node.js, own their reliability and mentor junior engineers." },
  { title: "MERN Stack Developer", reqs: ["MERN", "MongoDB", "Express", "React", "Node.js"], exp: [1, 3], pay: 5, step: 2.5,
    desc: "Work across the MERN stack to deliver end-to-end features, from database schema to UI." },
  { title: "Fullstack Engineer", reqs: ["React", "Node.js", "GraphQL", "AWS", "Fullstack"], exp: [3, 7], pay: 15, step: 3,
    desc: "Ship complete product features end to end as a fullstack engineer in a small, fast-moving team." },
  { title: "Java Developer", reqs: ["Java", "Spring Boot", "Microservices", "MySQL"], exp: [2, 6], pay: 8, step: 2.5,
    desc: "Develop and maintain Java microservices built on Spring Boot for enterprise clients." },
  { title: "Senior Java Engineer", reqs: ["Java", "Kafka", "Spring Boot", "System Design"], exp: [6, 10], pay: 26, step: 3,
    desc: "Lead the design of distributed Java systems and drive engineering best practices across teams." },
  { title: "Python Developer", reqs: ["Python", "Django", "PostgreSQL", "Celery"], exp: [1, 4], pay: 6, step: 2.5,
    desc: "Build backend features and data pipelines in Python and Django." },
  { title: "Data Scientist", reqs: ["Python", "Machine Learning", "Pandas", "SQL", "Statistics"], exp: [2, 6], pay: 12, step: 3.5,
    desc: "As a Data Scientist, build models that improve recommendations, forecasting and customer experience." },
  { title: "Senior Data Scientist", reqs: ["Python", "Deep Learning", "PyTorch", "MLOps"], exp: [6, 9], pay: 32, step: 4,
    desc: "Lead applied ML projects end to end, from problem framing to production deployment." },
  { title: "Data Analyst", reqs: ["SQL", "Excel", "Power BI", "Python"], exp: [0, 3], pay: 4, step: 2,
    desc: "Turn data into insights with dashboards and analyses that guide business decisions." },
  { title: "Android Developer", reqs: ["Kotlin", "Android", "Jetpack Compose", "Mobile"], exp: [1, 5], pay: 7, step: 3,
    desc: "Build and improve our Android app used by millions of mobile users." },
  { title: "iOS Developer", reqs: ["Swift", "iOS", "SwiftUI", "Mobile"], exp: [2, 5], pay: 9, step: 3,
    desc: "Craft smooth, reliable iOS experiences for our mobile customers." },
  { title: "React Native Developer", reqs: ["React Native", "JavaScript", "Mobile", "Redux"], exp: [1, 4], pay: 6, step: 2.5,
    desc: "Build cross-platform mobile apps with React Native for Android and iOS." },
  { title: "Desktop Application Developer", reqs: ["Electron", "C#", ".NET", "Desktop"], exp: [2, 6], pay: 8, step: 2.5,
    desc: "Develop cross-platform desktop applications used by enterprise customers." },
  { title: "DevOps Engineer", reqs: ["AWS", "Kubernetes", "Terraform", "CI/CD"], exp: [2, 6], pay: 10, step: 3,
    desc: "Automate infrastructure, improve deployment pipelines and keep production healthy." },
  { title: "Cloud Engineer", reqs: ["Azure", "Docker", "Linux", "Networking"], exp: [1, 5], pay: 7, step: 3,
    desc: "Design and operate cloud infrastructure that is secure, reliable and cost-efficient." },
  { title: "QA Automation Engineer", reqs: ["Selenium", "Java", "Cypress", "API Testing"], exp: [1, 5], pay: 5, step: 2,
    desc: "Build automated test suites that keep our releases fast and bug-free." },
  { title: "UI/UX Designer", reqs: ["Figma", "User Research", "Prototyping", "Design Systems"], exp: [1, 5], pay: 6, step: 2.5,
    desc: "Design intuitive, beautiful experiences across web and mobile, backed by user research." },
  { title: "Product Manager", reqs: ["Roadmapping", "Analytics", "Agile", "Stakeholder Management"], exp: [3, 8], pay: 18, step: 3.5,
    desc: "Own a product area, define the roadmap and work with engineering and design to deliver outcomes." },
  { title: "Cybersecurity Analyst", reqs: ["Network Security", "SIEM", "Python", "Incident Response"], exp: [2, 6], pay: 9, step: 3,
    desc: "Monitor, detect and respond to security threats across our infrastructure." },
  { title: "Machine Learning Engineer", reqs: ["Python", "TensorFlow", "Machine Learning", "MLOps"], exp: [3, 7], pay: 18, step: 3.5,
    desc: "Productionise ML models and build the platforms that serve them at scale." },
  { title: "Technical Support Engineer", reqs: ["Troubleshooting", "SQL", "Linux", "Communication"], exp: [0, 3], pay: 3.5, step: 1.5,
    desc: "Help customers resolve technical issues and feed insights back to product teams." },
  { title: "Software Engineer Intern", reqs: ["Data Structures", "JavaScript", "Python", "Git"], exp: [0, 0], pay: 2.5, step: 0,
    desc: "A 6-month internship working on real features alongside experienced engineers.", type: "Internship" },
  { title: "Frontend Intern", reqs: ["HTML", "CSS", "JavaScript", "React"], exp: [0, 0], pay: 2, step: 0,
    desc: "Learn modern frontend development by building real UI features with our web team.", type: "Internship" },
  { title: "Data Science Intern", reqs: ["Python", "Pandas", "Statistics", "SQL"], exp: [0, 0], pay: 3, step: 0,
    desc: "Work on data analysis and ML experiments with our data science team.", type: "Internship" },
  { title: "Engineering Manager", reqs: ["People Management", "System Design", "Agile", "Hiring"], exp: [8, 12], pay: 40, step: 3,
    desc: "Lead and grow a team of engineers while owning delivery of a critical product area." },
];

const JOB_TYPES = ["Full Time", "Full Time", "Full Time", "Part Time", "Contract"];

// small deterministic PRNG, so every run picks the same data
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const hashString = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// The exact description this script writes. --remove uses it to recognise
// seeded jobs, so jobs you created by hand are never touched.
const seedDescription = (companyName, role) =>
  `${companyName} is hiring a ${role.title}. ${role.desc}`;

const buildJobs = (companyCfg, existingTitles, needed) => {
  const rand = rng(hashString(companyCfg.name));
  const pool = [...ROLES].sort(() => rand() - 0.5).filter((r) => !existingTitles.has(r.title));
  return pool.slice(0, needed).map((role) => {
    const [minExp, maxExp] = role.exp;
    const exp = minExp + Math.floor(rand() * (maxExp - minExp + 1));
    // small random bonus, scaled to the role so interns stay in the low bands
    const bonus = rand() * Math.min(2, role.pay * 0.25);
    const salary = Math.round((role.pay + (exp - minExp) * role.step + bonus) * 2) / 2; // nearest 0.5 LPA
    const location = companyCfg.offices[Math.floor(rand() * companyCfg.offices.length)];
    const jobType = role.type || (location === "Remote" ? "Remote" : JOB_TYPES[Math.floor(rand() * JOB_TYPES.length)]);
    return {
      title: role.title,
      description: seedDescription(companyCfg.name, role),
      requirements: role.reqs,
      salary: String(salary),
      experienceLevel: exp,
      location,
      jobType,
      position: 1 + Math.floor(rand() * 5),
    };
  });
};

const args = process.argv.slice(2);
const ownerArg = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : null;
const removeMode = args.includes("--remove");

await mongoose.connect(process.env.MONGO_URI);

// whose account owns the seeded data
let owner;
if (ownerArg) {
  owner = await User.findOne({ email: ownerArg, role: "Recruiter" });
  if (!owner) throw new Error(`No recruiter with email ${ownerArg}`);
} else {
  const recruiters = await User.find({ role: "Recruiter" });
  if (recruiters.length !== 1) {
    throw new Error(`Found ${recruiters.length} recruiters - pick one with --owner <email>`);
  }
  owner = recruiters[0];
}
console.log(`Owner: ${owner.fullname} <${owner.email}>`);

if (removeMode) {
  // remove only jobs this script wrote (exact seeded description), owned by
  // this recruiter, and only if nobody has applied to them
  const companies = await Company.find({ name: { $in: COMPANIES.map((c) => c.name) } });
  const seeded = companies.flatMap((co) =>
    ROLES.map((role) => ({ company: co._id, title: role.title, description: seedDescription(co.name, role) }))
  );
  const candidates = seeded.length
    ? await Job.find({ created_by: owner._id, $or: seeded })
    : [];
  let removed = 0, kept = 0;
  for (const job of candidates) {
    if (job.applications.length || (await Application.exists({ job: job._id }))) { kept++; continue; }
    await job.deleteOne(); removed++;
  }
  // remove companies this script created, if they have no jobs left
  const created = COMPANIES.filter((c) => c.description).map((c) => c.name);
  let removedCompanies = 0;
  for (const company of await Company.find({ name: { $in: created }, userId: owner._id })) {
    if (!(await Job.exists({ company: company._id }))) { await company.deleteOne(); removedCompanies++; }
  }
  console.log(`Removed ${removed} jobs (${kept} kept because they have applications) and ${removedCompanies} companies.`);
  await mongoose.disconnect();
  process.exit(0);
}

let companiesCreated = 0, jobsCreated = 0;
const now = Date.now();
for (const cfg of COMPANIES) {
  let company = await Company.findOne({ name: cfg.name });
  if (!company) {
    company = await Company.create({
      name: cfg.name, description: cfg.description, website: cfg.website,
      location: cfg.location, userId: owner._id,
    });
    companiesCreated++;
  } else if (company.userId.toString() !== owner._id.toString()) {
    console.log(`  skipping ${cfg.name}: owned by another recruiter`);
    continue;
  }

  const existing = await Job.find({ company: company._id }).select("title");
  const needed = JOBS_PER_COMPANY - existing.length;
  if (needed <= 0) { console.log(`  ${cfg.name}: already has ${existing.length} jobs`); continue; }

  const jobs = buildJobs(cfg, new Set(existing.map((j) => j.title)), needed);
  for (const [i, data] of jobs.entries()) {
    const job = new Job({ ...data, company: company._id, created_by: owner._id });
    // spread posting dates over the last ~30 days so "latest jobs" looks natural
    const postedAt = new Date(now - (jobsCreated * 7 + i * 3) * 60 * 60 * 1000);
    job.createdAt = postedAt;
    job.updatedAt = postedAt;
    await job.save({ timestamps: false });
    jobsCreated++;
  }
  console.log(`  ${cfg.name}: +${jobs.length} jobs (now ${existing.length + jobs.length})`);
}

console.log(`\nDone: ${companiesCreated} companies and ${jobsCreated} jobs added.`);
await mongoose.disconnect();
