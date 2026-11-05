import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "./config/db.js";
import api from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads", "profiles");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const port = Number(process.env.PORT || 5000);

if (process.env.NODE_ENV === "production") {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required in production.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === "replace-this-with-a-long-random-secret") {
    throw new Error("Set JWT_SECRET to a unique value with at least 32 characters in production.");
  }
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  if (req.is("multipart/form-data") || req.path.includes("/photo")) {
    return next();
  }
  if (["POST", "PUT", "PATCH"].includes(req.method) && (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) {
    return res.status(400).json({ error: "Send a JSON object in the request body." });
  }
  next();
});

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
const healthCheck = (_req, res) => {
  const databaseStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const database = process.env.MONGODB_URI
    ? databaseStates[mongoose.connection.readyState] || "unknown"
    : "demo-mode";

  res.json({
    status: "ok",
    database,
    sms: process.env.TWILIO_VERIFY_SERVICE_SID ? "configured" : "local-demo"
  });
};
app.get("/api", healthCheck);
app.get("/api/health", healthCheck);
app.use("/api", api);

app.use((error, _req, res, _next) => {
  console.error("API error:", error.message);
  res.status(error.response?.status || error.statusCode || 500).json({
    error: error.response ? "An external data provider could not complete the request." : error.message || "Unexpected server error."
  });
});

try {
  await connectDatabase();
  app.listen(port, () => console.log(`Namma Krishi API listening at http://localhost:${port}`));
} catch (error) {
  console.error("Unable to start Namma Krishi API because MongoDB could not connect:", error.message);
  process.exitCode = 1;
}
