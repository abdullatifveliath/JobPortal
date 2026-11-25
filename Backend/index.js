import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import chatRoute from "./routes/chat.route.js";
import adminRoute from "./routes/admin.route.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config({});
const app = express();

// Hosts like Render/Railway put a proxy in front of the app. Trusting one hop
// lets the rate limiter see each visitor's real IP instead of the proxy's
// (otherwise every user would share one limit).
// TRUST_PROXY = how many proxies sit in front (Render alone = 1; Netlify's
// /api proxy in front of Render = 2). Check with GET /api/health.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", parseInt(process.env.TRUST_PROXY, 10) || 1);
}

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5001;

 
//api's

// health check for the host (Render), also handy to wake the server up.
// "ip" is the caller's own address as the server sees it - used to check
// TRUST_PROXY is right (it should match your real public IP).
app.get("/api/health", (req, res) => res.json({ ok: true, ip: req.ip }));

app.use("/api/user", userRoute);
app.use("/api/company", companyRoute);
app.use("/api/job", jobRoute);
app.use("/api/application", applicationRoute);
app.use("/api/chat", chatRoute);
app.use("/api/admin", adminRoute);


// ----------Code for deployment--------------

// the frontend is built into Job-Portal/Frontend/dist (see "build" script).
// resolve it from this file's location, not the current working directory.
const distPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../Frontend/dist"
);

// Only when the frontend was built next to the backend (one-server setup).
// With Netlify hosting the frontend there's no dist here, so this is skipped
// and the backend only answers /api requests.
if (process.env.NODE_ENV === "production" && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5 needs a named wildcard - a bare '*' crashes on startup.
  // Unknown /api routes get a JSON 404 instead of the React page.
  app.get("/{*splat}", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "Not found", success: false });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
