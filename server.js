/**
 * DesignIQ AI — Express Backend Server
 * All AI processing routes, file handling, and OpenRouter integration
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

// ── Routes ──────────────────────────────────────────────────
const vectorizeRouter  = require("./routes/vectorize");
const removeBgRouter   = require("./routes/removeBg");
const upscaleRouter    = require("./routes/upscale");
const enhanceRouter    = require("./routes/enhance");
const svgOptRouter     = require("./routes/svgOptimize");
const compressRouter   = require("./routes/compress");
const paletteRouter    = require("./routes/palette");
const convertRouter    = require("./routes/convert");
const qrRouter         = require("./routes/qr");
const aiRouter         = require("./routes/ai");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Ensure upload dir exists ─────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Security ─────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: "Too many requests. Please try again later." },
});
app.use("/api/", limiter);

// ── Middleware ────────────────────────────────────────────────
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "DesignIQ AI Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use("/api/ai",             aiRouter);
app.use("/api/vectorize",      vectorizeRouter);
app.use("/api/remove-bg",      removeBgRouter);
app.use("/api/upscale",        upscaleRouter);
app.use("/api/enhance-logo",   enhanceRouter);
app.use("/api/optimize-svg",   svgOptRouter);
app.use("/api/compress-image", compressRouter);
app.use("/api/color-palette",  paletteRouter);
app.use("/api/convert-image",  convertRouter);
app.use("/api/qr",             qrRouter);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 DesignIQ AI Backend running on http://localhost:${PORT}`);
  console.log(`   ENV:   ${process.env.NODE_ENV || "development"}`);
  console.log(`   Model: ${process.env.OPENROUTER_MODEL || "not set"}\n`);
});

module.exports = app;
