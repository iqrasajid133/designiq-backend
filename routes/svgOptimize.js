/**
 * POST /api/optimize-svg
 * Cleans and compresses SVG files using SVGO
 */
const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const { optimize } = require("svgo");
const { uploadSVG, cleanup } = require("../middleware/upload");

router.post("/", uploadSVG, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No SVG file provided" });
  const filePath = req.file.path;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const originalSize = Buffer.byteLength(raw, "utf8");

    const result = optimize(raw, {
      multipass: true,
      plugins: [
        "preset-default",
        "removeDimensions",
        { name: "removeAttrs", params: { attrs: ["data-name"] } },
      ],
    });

    cleanup(filePath);

    const optimized    = result.data;
    const optimizedSize = Buffer.byteLength(optimized, "utf8");
    const savings      = Math.round((1 - optimizedSize / originalSize) * 100);

    res.json({
      success:       true,
      svg:           optimized,
      originalSize,
      optimizedSize,
      savings:       `${savings}%`,
      sizeHuman:     `${(optimizedSize / 1024).toFixed(1)} KB`,
    });

  } catch (err) {
    cleanup(filePath);
    console.error("[SVG Optimize]", err.message);
    res.status(500).json({ error: "SVG optimization failed: " + err.message });
  }
});

module.exports = router;
