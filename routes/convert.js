/**
 * POST /api/convert-image
 * Converts image between formats using Sharp
 */
const express = require("express");
const router  = express.Router();
const sharp   = require("sharp");
const { uploadImage, cleanup } = require("../middleware/upload");

const FORMATS = {
  png:  { mime: "image/png",  ext: ".png"  },
  jpg:  { mime: "image/jpeg", ext: ".jpg"  },
  webp: { mime: "image/webp", ext: ".webp" },
  avif: { mime: "image/avif", ext: ".avif" },
  tiff: { mime: "image/tiff", ext: ".tiff" },
  bmp:  { mime: "image/bmp",  ext: ".bmp"  },
};

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const filePath = req.file.path;

  try {
    const to      = FORMATS[req.body.to] ? req.body.to : "png";
    const quality = Math.min(100, Math.max(1, parseInt(req.body.quality || 90)));
    const { mime, ext } = FORMATS[to];

    let chain = sharp(filePath);
    if (to === "jpg")  chain = chain.jpeg({ quality, mozjpeg: true });
    else if (to === "webp") chain = chain.webp({ quality });
    else if (to === "avif") chain = chain.avif({ quality });
    else if (to === "tiff") chain = chain.tiff({ quality });
    else if (to === "bmp")  chain = chain.bmp();
    else                    chain = chain.png();

    const outBuf  = await chain.toBuffer();
    const base    = req.file.originalname.replace(/\.[^.]+$/, "");
    cleanup(filePath);

    res.set({
      "Content-Type":        mime,
      "Content-Disposition": `attachment; filename="${base}_converted${ext}"`,
    });
    res.send(outBuf);

  } catch (err) {
    cleanup(filePath);
    console.error("[Convert]", err.message);
    res.status(500).json({ error: "Conversion failed: " + err.message });
  }
});

module.exports = router;
