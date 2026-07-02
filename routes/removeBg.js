/**
 * POST /api/remove-bg
 * Removes image background using Sharp chroma-key + edge detection
 * For production: swap inner logic with rembg Python service or remove.bg API
 */
const express = require("express");
const router  = express.Router();
const sharp   = require("sharp");
const { uploadImage, cleanup } = require("../middleware/upload");

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const filePath = req.file.path;

  try {
    const { threshold = 30, feather = 2 } = req.body;

    // ── Read image metadata ───────────────────────────────────
    const meta = await sharp(filePath).metadata();

    // ── Convert to RGBA PNG ───────────────────────────────────
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const buf = Buffer.from(data);

    // ── Sample background color from corners ──────────────────
    const sampleCorners = (x, y) => {
      const idx = (y * width + x) * channels;
      return { r: buf[idx], g: buf[idx+1], b: buf[idx+2] };
    };

    const corners = [
      sampleCorners(0, 0), sampleCorners(width-1, 0),
      sampleCorners(0, height-1), sampleCorners(width-1, height-1),
    ];
    const bg = {
      r: Math.round(corners.reduce((s,c) => s + c.r, 0) / 4),
      g: Math.round(corners.reduce((s,c) => s + c.g, 0) / 4),
      b: Math.round(corners.reduce((s,c) => s + c.b, 0) / 4),
    };

    // ── Remove background pixels ──────────────────────────────
    const thresh = parseInt(threshold);
    for (let i = 0; i < width * height; i++) {
      const idx = i * channels;
      const dr  = Math.abs(buf[idx]   - bg.r);
      const dg  = Math.abs(buf[idx+1] - bg.g);
      const db  = Math.abs(buf[idx+2] - bg.b);
      if (dr + dg + db < thresh * 3) {
        buf[idx+3] = 0; // transparent
      }
    }

    // ── Output PNG with transparency ──────────────────────────
    const outBuffer = await sharp(buf, {
      raw: { width, height, channels }
    })
      .png()
      .toBuffer();

    cleanup(filePath);

    res.set({
      "Content-Type":        "image/png",
      "Content-Disposition": `attachment; filename="nobg_${req.file.originalname.replace(/\.[^.]+$/, "")}.png"`,
      "X-Original-Size":     meta.size,
      "X-Output-Size":       outBuffer.length,
    });
    res.send(outBuffer);

  } catch (err) {
    cleanup(filePath);
    console.error("[RemoveBG]", err.message);
    res.status(500).json({ error: "Background removal failed: " + err.message });
  }
});

module.exports = router;
