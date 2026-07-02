/**
 * POST /api/compress-image
 * Lossless/lossy compression via Sharp
 */
const express = require("express");
const router  = express.Router();
const sharp   = require("sharp");
const { uploadImage, cleanup } = require("../middleware/upload");

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const filePath = req.file.path;

  try {
    const quality = Math.min(100, Math.max(1, parseInt(req.body.quality || 80)));
    const format  = ["jpg","webp","avif","png"].includes(req.body.format) ? req.body.format : "webp";
    const lossless = req.body.lossless === "true";

    const meta = await sharp(filePath).metadata();
    let chain  = sharp(filePath);

    if (format === "webp")      chain = chain.webp({ quality, lossless, effort: 5 });
    else if (format === "avif") chain = chain.avif({ quality, lossless, effort: 5 });
    else if (format === "jpg")  chain = chain.jpeg({ quality, mozjpeg: true, progressive: true });
    else                        chain = chain.png({ compressionLevel: 9, adaptiveFiltering: true });

    const outBuf = await chain.toBuffer();
    const originalSize = meta.size || 0;
    const outputSize   = outBuf.length;
    const savings      = originalSize > 0
      ? Math.round((1 - outputSize / originalSize) * 100)
      : 0;

    cleanup(filePath);

    const base = req.file.originalname.replace(/\.[^.]+$/, "");
    const mime = { webp:"image/webp", avif:"image/avif", jpg:"image/jpeg", png:"image/png" };

    res.set({
      "Content-Type":        mime[format],
      "Content-Disposition": `attachment; filename="${base}_compressed.${format}"`,
      "X-Original-Size":     originalSize,
      "X-Output-Size":       outputSize,
      "X-Savings":           `${savings}%`,
    });
    res.send(outBuf);

  } catch (err) {
    cleanup(filePath);
    console.error("[Compress]", err.message);
    res.status(500).json({ error: "Compression failed: " + err.message });
  }
});

module.exports = router;
