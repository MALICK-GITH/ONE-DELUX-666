const fs = require("fs");
const path = require("path");

function loadDotEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore local env loading errors and fall back to existing process env.
  }
}

loadDotEnvFile(path.join(process.cwd(), ".env"));

const DEFAULT_PORT = 3000;
const DEFAULT_LIVE_FEED_URL = "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip";
const DEFAULT_PREDICTION_API_URL = "https://top-modele-train-api-3cap.onrender.com";
const DEFAULT_PENALTY_API_URL = "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip";
const DEFAULT_AI_MODEL_API_URL = "https://aimodelapi.onrender.com/v1";
const DEFAULT_AI_MODEL = "grok-4";

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

module.exports = {
  port: parseNumber(process.env.PORT, DEFAULT_PORT),
  appSignature: "SOLITAIRE HACK",
  predictionApiUrl: process.env.PREDICTION_API_URL || DEFAULT_PREDICTION_API_URL,
  liveFeedUrl: process.env.LIVE_FEED_URL || DEFAULT_LIVE_FEED_URL,
  penaltyApiUrl: process.env.PENALTY_API_URL || DEFAULT_PENALTY_API_URL,
  aiModelApiUrl: process.env.AI_MODEL_API_URL || DEFAULT_AI_MODEL_API_URL,
  aiModelApiKey: process.env.AI_MODEL_API_KEY || "devx-s3lkpld19bvhbsv2ex5omi1b2vjet5a5",
  aiModelName: process.env.AI_MODEL_NAME || DEFAULT_AI_MODEL,
};
