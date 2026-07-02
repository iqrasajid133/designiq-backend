/**
 * POST /api/upscale
 * Upscales image using Sharp's Lanczos3 kernel
 * scale: 2 | 3 | 4  (default: 2)
 * format: png | jpg | webp  (default: png)
 */
const express = require("express");
const router  = express.Router();
const sharp   = require("sharp");
const { uploadImage, cleanup } = require("../middleware/upload");

const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const filePath = req.file.path;

  try {
    const scale  = Math.min(4, Math.max(2, parseInt(req.body.scale  || 2)));
    const format = ["png","jpg","webp"].includes(req.body.format) ? req.body.format : "png";
    const quality = Math.min(100, Math.max(1, parseInt(req.body.quality || 90)));

    const meta = await sharp(filePath).metadata();
    const newW  = meta.width  * scale;
    const newH  = meta.height * scale;

    // Guard: cap at 8000px on either dimension for memory safety
    if (newW > 8000 || newH > 8000) {
      cleanup(filePath);
      return res.status(400).json({ error: `Output would be ${newW}×${newH}px — too large. Max 8000px per side.` });
    }

    let chain = sharp(filePath).resize(newW, newH, { kernel: sharp.kernel.lanczos3 });
    if (format === "jpg") chain = chain.jpeg({ quality, progressive: true, mozjpeg: true });
    else if (format === "webp") chain = chain.webp({ quality, effort: 4 });
    else chain = chain.png({ compressionLevel: 6 });

    const outBuf = await chain.toBuffer();
    cleanup(filePath);

    const baseName = req.file.originalname.replace(/\.[^.]+$/, "");
    res.set({
      "Content-Type":        MIME[format],
      "Content-Disposition": `attachment; filename="${baseName}_${scale}x.${format}"`,
      "X-Scale":             scale,
      "X-Original-Dims":     `${meta.width}x${meta.height}`,
      "X-Output-Dims":       `${newW}x${newH}`,
    });
    res.send(outBuf);

  } catch (err) {
    cleanup(filePath);
    console.error("[Upscale]", err.message);
    res.status(500).json({ error: "Upscale failed: " + err.message });
  }
});

module.exports = router;
