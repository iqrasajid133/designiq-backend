/**
 * POST /api/color-palette
 * Extracts dominant colors from an image using Sharp pixel sampling
 */
const express = require("express");
const router  = express.Router();
const sharp   = require("sharp");
const { uploadImage, cleanup } = require("../middleware/upload");

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function colorDistance(a, b) {
  return Math.sqrt((a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2);
}

function kMeans(pixels, k, iterations = 10) {
  // Seed centroids with first k pixels
  let centroids = pixels.slice(0, k).map(p => ({ ...p }));

  for (let iter = 0; iter < iterations; iter++) {
    const clusters = Array.from({ length: k }, () => []);

    for (const px of pixels) {
      let minDist = Infinity, minIdx = 0;
      centroids.forEach((c, i) => {
        const d = colorDistance(px, c);
        if (d < minDist) { minDist = d; minIdx = i; }
      });
      clusters[minIdx].push(px);
    }

    centroids = clusters.map((cl, i) => {
      if (cl.length === 0) return centroids[i];
      return {
        r: Math.round(cl.reduce((s, p) => s + p.r, 0) / cl.length),
        g: Math.round(cl.reduce((s, p) => s + p.g, 0) / cl.length),
        b: Math.round(cl.reduce((s, p) => s + p.b, 0) / cl.length),
      };
    });
  }
  return centroids;
}

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const filePath = req.file.path;

  try {
    const count = Math.min(12, Math.max(2, parseInt(req.body.count || 6)));

    // Resize to 100×100 for fast sampling
    const { data, info } = await sharp(filePath)
      .resize(100, 100, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push({ r: data[i], g: data[i+1], b: data[i+2] });
    }

    const colors = kMeans(pixels, count);

    const palette = colors.map(c => ({
      hex:  rgbToHex(c.r, c.g, c.b),
      rgb:  `rgb(${c.r}, ${c.g}, ${c.b})`,
      r: c.r, g: c.g, b: c.b,
    }));

    cleanup(filePath);

    res.json({ success: true, count: palette.length, palette });

  } catch (err) {
    cleanup(filePath);
    console.error("[Palette]", err.message);
    res.status(500).json({ error: "Palette extraction failed: " + err.message });
  }
});

module.exports = router;
