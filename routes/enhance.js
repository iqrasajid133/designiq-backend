/**
 * POST /api/enhance-logo
 * Sharpens, denoises, and normalises a logo image
 */
const express = require("express");
const router  = express.Router();
const sharp   = require("sharp");
const { uploadImage, cleanup } = require("../middleware/upload");

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const filePath = req.file.path;

  try {
    const { sharpen = 1.5, denoise = true, normalize = true, format = "png" } = req.body;

    let chain = sharp(filePath).ensureAlpha();

    if (normalize === "true" || normalize === true)   chain = chain.normalize();
    if (denoise   === "true" || denoise   === true)   chain = chain.median(1);
    chain = chain.sharpen({ sigma: parseFloat(sharpen) || 1.5, m1: 1.5, m2: 20 });

    const outFmt = ["png","jpg","webp"].includes(format) ? format : "png";
    if (outFmt === "jpg")  chain = chain.jpeg({ quality: 95, mozjpeg: true });
    else if (outFmt === "webp") chain = chain.webp({ quality: 95 });
    else chain = chain.png();

    const outBuf = await chain.toBuffer();
    cleanup(filePath);

    const base = req.file.originalname.replace(/\.[^.]+$/, "");
    res.set({
      "Content-Type":        `image/${outFmt === "jpg" ? "jpeg" : outFmt}`,
      "Content-Disposition": `attachment; filename="${base}_enhanced.${outFmt}"`,
    });
    res.send(outBuf);

  } catch (err) {
    cleanup(filePath);
    console.error("[Enhance]", err.message);
    res.status(500).json({ error: "Enhancement failed: " + err.message });
  }
});

module.exports = router;
