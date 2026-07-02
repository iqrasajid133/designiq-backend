/**
 * POST /api/vectorize
 * Converts raster image to SVG using ImageTracerJS (color) or Potrace (B&W)
 *
 * Body (multipart/form-data):
 *   image        — the image file
 *   mode         — "color" | "bw" | "limited"  (default: "color")
 *   colors       — max color count              (default: 16)
 *   detail       — 1–100 detail level           (default: 70)
 *   smoothness   — 1–100 path smoothness        (default: 60)
 *   noiseCleanup — 1–100 noise removal          (default: 40)
 *   transparent  — "true" | "false"             (default: "true")
 *   mergeSimilar — "true" | "false"             (default: "true")
 */
const express   = require("express");
const router    = express.Router();
const path      = require("path");
const fs        = require("fs");
const sharp     = require("sharp");
const Imagetracerjs = require("imagetracerjs");
const { uploadImage, cleanup } = require("../middleware/upload");

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });

  const filePath = req.file.path;
  try {
    const {
      mode         = "color",
      colors       = 16,
      detail       = 70,
      smoothness   = 60,
      noiseCleanup = 40,
      transparent  = "true",
      mergeSimilar = "true",
    } = req.body;

    // ── Preprocessing with Sharp ──────────────────────────────
    const prepPath = filePath + "_prep.png";

    let sharpChain = sharp(filePath).png();

    // For B&W mode — convert to grayscale then threshold
    if (mode === "bw") {
      sharpChain = sharpChain.grayscale().threshold(128);
    }

    // Noise cleanup: slight blur before tracing reduces pixel noise
    if (parseInt(noiseCleanup) > 20) {
      const sigma = Math.min(parseInt(noiseCleanup) / 100 * 2, 1.5);
      sharpChain = sharpChain.blur(sigma);
    }

    await sharpChain.toFile(prepPath);

    // ── Vectorize ─────────────────────────────────────────────
    let svgString;

    if (mode === "bw") {
      // B&W: use simple ImageTracer single-color mode
      svgString = await new Promise((resolve, reject) => {
        Imagetracerjs.imageToSVG(
          prepPath,
          (svg) => resolve(svg),
          {
            numberofcolors: 2,
            pathomit:       Math.round((100 - parseInt(detail)) / 5),
            ltres:          Math.round((100 - parseInt(smoothness)) / 20),
            qtres:          Math.round((100 - parseInt(smoothness)) / 20),
            strokewidth:    0,
          }
        );
      });
    } else {
      // Full-color or limited-palette
      const numColors = mode === "limited" ? Math.max(2, Math.min(64, parseInt(colors))) : 16;
      svgString = await new Promise((resolve, reject) => {
        Imagetracerjs.imageToSVG(
          prepPath,
          (svg) => resolve(svg),
          {
            numberofcolors: numColors,
            pathomit:       Math.round((100 - parseInt(detail)) / 5),
            ltres:          Math.round((100 - parseInt(smoothness)) / 20),
            qtres:          Math.round((100 - parseInt(smoothness)) / 20),
            strokewidth:    0,
            blurradius:     parseInt(noiseCleanup) > 50 ? 1 : 0,
          }
        );
      });
    }

    // ── Cleanup temp files ────────────────────────────────────
    cleanup(filePath);
    cleanup(prepPath);

    // ── Get output file size ──────────────────────────────────
    const svgBytes = Buffer.byteLength(svgString, "utf8");

    res.json({
      success:  true,
      svg:      svgString,
      size:     svgBytes,
      sizeHuman: svgBytes < 1024
        ? `${svgBytes} B`
        : `${(svgBytes / 1024).toFixed(1)} KB`,
      mode,
      message:  "Vectorization complete",
    });

  } catch (err) {
    cleanup(filePath);
    console.error("[Vectorize]", err.message);
    res.status(500).json({ error: "Vectorization failed: " + err.message });
  }
});

module.exports = router;
