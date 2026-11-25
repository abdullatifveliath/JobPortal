import express from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import { chatLimiter } from "../middleware/rateLimit.js";
import { chat } from "../controllers/chat.controller.js";

const router = express.Router();

// open to visitors; answers are personalised when a login cookie is sent
router.post("/", chatLimiter, optionalAuth, chat);

export default router;
