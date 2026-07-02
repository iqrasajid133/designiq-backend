/**
 * Multer upload middleware — shared across all routes
 */
const multer  = require("multer");
const path    = require("path");
const { v4: uuid } = require("uuid");

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 50;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_DIR || "./uploads"),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${uuid()}_${safe}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|bmp|webp|tiff|svg/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
  cb(new Error("Only image files are allowed (JPG, PNG, GIF, BMP, WebP, TIFF, SVG)"));
};

const svgFilter = (_req, file, cb) => {
  if (path.extname(file.originalname).toLowerCase() === ".svg") return cb(null, true);
  cb(new Error("Only SVG files are accepted by this endpoint"));
};

exports.uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
}).single("image");

exports.uploadSVG = multer({
  storage,
  fileFilter: svgFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
}).single("svg");

exports.uploadBatch = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
}).array("images", 20);

/** Clean up temp file after response */
exports.cleanup = (filePath) => {
  if (!filePath) return;
  const fs = require("fs");
  try { fs.unlinkSync(filePath); } catch {}
};
