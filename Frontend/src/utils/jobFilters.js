// Filter definitions + matching logic for the Jobs page.
//
// Rules:
// - Options inside the same group are OR'ed (Delhi OR Pune).
// - Groups are AND'ed (Location AND Technology AND ...).
// - Each group only looks at the job field(s) it is about.

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole-word, case-insensitive match. "java" won't match "javascript".
const hasWord = (text, word) =>
  new RegExp(`(^|[^a-z0-9])${escapeRegex(word)}($|[^a-z0-9])`, "i").test(
    text || ""
  );

const anyWord = (text, words) => words.some((w) => hasWord(text, w));

// Range check: min is inclusive, max is exclusive, so 3 lands in "3-6" not "0-3".
const inRange = (value, min, max) => {
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  return n >= min && n < max;
};

const locationOption = (label, aliases = [label]) => ({
  label,
  match: (job) => anyWord(job.location, aliases),
});

const techOption = (label, aliases, exclude = []) => ({
  label,
  match: (job) => {
    const text = [job.title, ...(job.requirements || [])].join(" | ");
    // Drop excluded phrases first (e.g. "react native" shouldn't count as React)
    const cleaned = exclude.reduce(
      (acc, phrase) => acc.replace(new RegExp(escapeRegex(phrase), "gi"), " "),
      text
    );
    return anyWord(cleaned, aliases);
  },
});

const rangeOption = (label, field, min, max = Infinity) => ({
  label,
  match: (job) => inRange(job[field], min, max),
});

export const filterData = [
  {
    filterType: "Location",
    options: [
      locationOption("Delhi", ["delhi", "new delhi"]),
      locationOption("Mumbai"),
      locationOption("Kolhapur"),
      locationOption("Pune"),
      locationOption("Bangalore", ["bangalore", "bengaluru"]),
      locationOption("Hyderabad"),
      locationOption("Chennai"),
      {
        label: "Remote",
        match: (job) =>
          hasWord(job.location, "remote") || hasWord(job.jobType, "remote"),
      },
    ],
  },
  {
    filterType: "Technology",
    options: [
      techOption("MERN", ["mern"]),
      techOption("React", ["react", "reactjs", "react.js"], ["react native"]),
      techOption("Data Scientist", ["data scientist", "data science"]),
      techOption("Fullstack", ["fullstack", "full stack", "full-stack"]),
      techOption("Node", ["node", "nodejs", "node.js"]),
      techOption("Python", ["python"]),
      techOption("Java", ["java"]),
      techOption("Frontend", ["frontend", "front end", "front-end"]),
      techOption("Backend", ["backend", "back end", "back-end"]),
      techOption("Mobile", [
        "mobile",
        "android",
        "ios",
        "react native",
        "flutter",
      ]),
      techOption("Desktop", ["desktop", "electron"]),
    ],
  },
  {
    // experienceLevel is stored as a number of years
    filterType: "Experience",
    options: [
      rangeOption("0-2 years", "experienceLevel", 0, 3),
      rangeOption("3-4 years", "experienceLevel", 3, 5),
      rangeOption("5-6 years", "experienceLevel", 5, 7),
      rangeOption("7+ years", "experienceLevel", 7),
    ],
  },
  {
    // salary is stored as a number in LPA (shown as "{salary}LPA" on job cards)
    filterType: "Salary",
    options: [
      rangeOption("Below 3 LPA", "salary", 0, 3),
      rangeOption("3-6 LPA", "salary", 3, 6),
      rangeOption("6-10 LPA", "salary", 6, 10),
      rangeOption("10+ LPA", "salary", 10),
    ],
  },
];

export const emptyFilters = () =>
  Object.fromEntries(filterData.map((group) => [group.filterType, []]));

export const hasActiveFilters = (selected) =>
  Object.values(selected).some((labels) => labels.length > 0);

// selected looks like: { Location: ["Pune"], Technology: ["React", "Node"], ... }
export const applyJobFilters = (jobs, selected) =>
  jobs.filter((job) =>
    filterData.every((group) => {
      const chosen = selected[group.filterType] || [];
      if (chosen.length === 0) return true; // group not in use
      return group.options
        .filter((opt) => chosen.includes(opt.label))
        .some((opt) => opt.match(job));
    })
  );
