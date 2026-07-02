/**
 * OpenRouter AI helper — all AI calls go through here
 * API key is read from .env only — never hardcoded
 */
const axios = require("axios");

const BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const MODEL    = process.env.OPENROUTER_MODEL    || "nousresearch/hermes-3-llama-3.1-405b:free";

/**
 * Send a chat completion request to OpenRouter
 * @param {Array}  messages  - OpenAI-format messages array
 * @param {Object} opts      - Optional overrides: model, max_tokens, temperature
 * @returns {string}         - Assistant reply text
 */
async function chatCompletion(messages, opts = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables");
  }

  const payload = {
    model:       opts.model       || MODEL,
    max_tokens:  opts.max_tokens  || 1024,
    temperature: opts.temperature ?? 0.7,
    messages,
  };

  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    payload,
    {
      headers: {
        "Authorization":  `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type":   "application/json",
        "HTTP-Referer":   "https://designiq.ai",
        "X-Title":        "DesignIQ AI",
      },
      timeout: 30_000,
    }
  );

  const choice = response.data?.choices?.[0];
  if (!choice) throw new Error("No response from OpenRouter");
  return choice.message?.content?.trim() || "";
}

/**
 * Analyze an image description and return design suggestions
 */
async function analyzeImage(description, task = "vectorize") {
  const systemPrompt = `You are an expert graphic designer and AI image processing specialist for DesignIQ AI.
Your job is to analyze image descriptions and provide concise, actionable processing recommendations.
Respond in JSON only. No markdown, no explanation outside the JSON object.`;

  const userPrompt = `Analyze this image for ${task} processing:
"${description}"

Respond with this exact JSON structure:
{
  "recommendation": "brief one-sentence recommendation",
  "colorMode": "color|bw|limited",
  "suggestedColors": 8,
  "detailLevel": 70,
  "smoothness": 60,
  "noiseCleanup": 40,
  "transparentBg": true,
  "notes": "one optional tip for best results"
}`;

  const raw = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt   },
  ], { temperature: 0.3, max_tokens: 300 });

  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return {
      recommendation: "Process with full-color vectorization for best results.",
      colorMode: "color", suggestedColors: 8,
      detailLevel: 70, smoothness: 60, noiseCleanup: 40,
      transparentBg: true, notes: "",
    };
  }
}

module.exports = { chatCompletion, analyzeImage };
