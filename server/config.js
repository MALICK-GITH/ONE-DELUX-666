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
const DEFAULT_LIVE_FEED_URL =
  "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip";

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
  liveFeedUrl: String(process.env.LIVE_FEED_URL || DEFAULT_LIVE_FEED_URL).trim() || DEFAULT_LIVE_FEED_URL,
  liveFeedEnabled: parseBoolean(process.env.LIVE_FEED_ENABLED, true),
  liveFeedTimeout: parseNumber(process.env.LIVE_FEED_TIMEOUT, 15000),
  liveFeedCount: parseNumber(process.env.LIVE_FEED_COUNT, 40),
};