/**
 * POST /api/qr
 * Generates QR codes using the qrcode library
 * Returns SVG or PNG based on format param
 */
const express = require("express");
const router  = express.Router();
const QRCode  = require("qrcode");

router.post("/", async (req, res) => {
  try {
    const {
      text    = "https://designiq.ai",
      format  = "svg",
      size    = 400,
      color   = "#000000",
      bg      = "#ffffff",
      margin  = 2,
      level   = "M", // L M Q H
    } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "text is required" });
    }

    const opts = {
      errorCorrectionLevel: level,
      margin:  parseInt(margin),
      color:   { dark: color, light: bg },
      width:   parseInt(size),
    };

    if (format === "png") {
      const buf = await QRCode.toBuffer(text.trim(), { ...opts, type: "png" });
      res.set({
        "Content-Type":        "image/png",
        "Content-Disposition": "attachment; filename=\"qr.png\"",
      });
      return res.send(buf);
    }

    // SVG
    const svg = await QRCode.toString(text.trim(), { ...opts, type: "svg" });
    res.set({
      "Content-Type":        "image/svg+xml",
      "Content-Disposition": "attachment; filename=\"qr.svg\"",
    });
    res.send(svg);

  } catch (err) {
    console.error("[QR]", err.message);
    res.status(500).json({ error: "QR generation failed: " + err.message });
  }
});

module.exports = router;
