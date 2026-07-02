const express = require("express");
const router = express.Router();
const path = require("path");
const sharp = require("sharp");
const { uploadImage, cleanup } = require("../middleware/upload");

router.post("/", uploadImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const filePath = req.file.path;

  try {
    const { mode = "color", colors = 16, detail = 70, smoothness = 60, noiseCleanup = 40 } = req.body;

    const prepPath = filePath + "_prep.png";
    let sharpChain = sharp(filePath).png().resize(800, 800, { fit: "inside", withoutEnlargement: true });
    if (parseInt(noiseCleanup) > 20) sharpChain = sharpChain.blur(0.5);
    await sharpChain.toFile(prepPath);

    const ImageTracer = require("imagetracerjs");
    const svgString = await new Promise((resolve, reject) => {
      ImageTracer.imageToSVG(prepPath, (svg) => {
        if (svg) resolve(svg);
        else reject(new Error("Tracing failed"));
      }, {
        numberofcolors: mode === "bw" ? 2 : Math.min(parseInt(colors), 16),
        pathomit: Math.round((100 - parseInt(detail)) / 5),
        ltres: Math.round((100 - parseInt(smoothness)) / 20),
        qtres: Math.round((100 - parseInt(smoothness)) / 20),
        strokewidth: 0,
      });
    });

    cleanup(filePath);
    cleanup(prepPath);

    const svgBytes = Buffer.byteLength(svgString, "utf8");
    res.json({
      success: true,
      svg: svgString,
      size: svgBytes,
      sizeHuman: `${(svgBytes / 1024).toFixed(1)} KB`,
      mode,
    });

  } catch (err) {
    cleanup(filePath);
    console.error("[Vectorize]", err.message);
    res.status(500).json({ error: "Vectorization failed: " + err.message });
  }
});

module.exports = router;
