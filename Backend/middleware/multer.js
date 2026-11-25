import multer from "multer";

const storage = multer.memoryStorage();
export const singleUpload = multer({ storage }).single("file");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// allowed resume types: extension -> the bytes every real file of that type starts with
// (checking the content stops e.g. an .html file renamed to .pdf)
const RESUME_TYPES = {
  ".pdf": Buffer.from("%PDF"),
  ".docx": Buffer.from([0x50, 0x4b, 0x03, 0x04]), // zip container
  ".doc": Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), // old Office format
};

export const resumeExtension = (filename = "") => {
  const match = filename.toLowerCase().match(/\.[a-z]+$/);
  return match && RESUME_TYPES[match[0]] ? match[0] : null;
};

// true if the uploaded resume really is a PDF / DOC / DOCX
export const isValidResume = (file) => {
  const ext = resumeExtension(file.originalname);
  return !!ext && file.buffer.subarray(0, 4).equals(RESUME_TYPES[ext]);
};

const profileMulter = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 2 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "resume" && !resumeExtension(file.originalname)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "resume"));
    }
    if (file.fieldname === "file" && !file.mimetype.startsWith("image/")) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
    }
    cb(null, true);
  },
}).fields([
  { name: "file", maxCount: 1 }, // profile photo
  { name: "resume", maxCount: 1 },
]);

// profile update: optional photo ("file") and resume ("resume").
// upload problems become a clear 400 instead of a 500.
export const profileUpload = (req, res, next) => {
  profileMulter(req, res, (err) => {
    if (!err) return next();
    let message = "File upload failed";
    if (err.code === "LIMIT_FILE_SIZE") message = "Files must be 5 MB or smaller";
    else if (err.field === "resume") message = "Resume must be a PDF, DOC or DOCX file";
    else if (err.field === "file") message = "Profile photo must be an image";
    return res.status(400).json({ message, success: false });
  });
};
