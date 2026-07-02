/**
 * POST /api/ai/analyze
 * Accepts image metadata + description, returns AI processing recommendations
 */
const express = require("express");
const router  = express.Router();
const { analyzeImage, chatCompletion } = require("../utils/openrouter");

router.post("/analyze", async (req, res) => {
  try {
    const { description, task, filename, width, height, fileSize } = req.body;
    if (!description && !filename) {
      return res.status(400).json({ error: "description or filename is required" });
    }

    const fullDesc = [
      description || "",
      filename   ? `Filename: ${filename}` : "",
      width && height ? `Dimensions: ${width}x${height}px` : "",
      fileSize   ? `Size: ${fileSize}` : "",
    ].filter(Boolean).join(". ");

    const result = await analyzeImage(fullDesc, task || "vectorize");
    res.json({ success: true, analysis: result });
  } catch (err) {
    console.error("[AI Analyze]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }
    const reply = await chatCompletion(messages);
    res.json({ success: true, reply });
  } catch (err) {
    console.error("[AI Chat]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
