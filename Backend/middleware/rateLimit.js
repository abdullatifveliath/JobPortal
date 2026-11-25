import rateLimit from "express-rate-limit";

const limitResponse = (message) => ({ message, success: false });

// Login / OTP verification / password reset - slows down guessing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limitResponse("Too many attempts. Please try again in 15 minutes."),
});

// Chatbot - every message costs an AI API call.
export const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limitResponse("You're sending messages too fast. Please wait a few minutes."),
});

// Endpoints that send an email - stops someone spamming a mailbox
// (and burning your Gmail sending quota).
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limitResponse("Too many emails requested. Please try again later."),
});
