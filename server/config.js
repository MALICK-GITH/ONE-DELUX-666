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
const DEFAULT_JSON_LIMIT = "1mb";
const DEFAULT_CRON_LEARNING_INTERVAL_MS = 10 * 1000; // 10 secondes pour plus d'activité SQL
const DEFAULT_LIVE_FEED_URL =
  "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip?sports=85&count=40&lng=fr&gr=789&mode=4&country=96&partner=233&getEmpty=true&virtualSports=true&noFilterBlockEvent=true";

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function buildLiveFeedHeaders() {
  const apiKey = String(process.env.API_KEY_888 || process.env.LIVE_FEED_API_KEY || "").trim();
  const headers = {
    accept: "application/json, text/plain, */*",
    "user-agent": "RUST SIT XPR/1.0",
  };

  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  return {
    apiKey,
    headers,
  };
}

const liveFeedHeaders = buildLiveFeedHeaders();
const liveFeedUrl = String(process.env.LIVE_FEED_URL || DEFAULT_LIVE_FEED_URL).trim() || DEFAULT_LIVE_FEED_URL;

module.exports = {
  port: parseNumber(process.env.PORT, DEFAULT_PORT),
  maxPortTries: parseNumber(process.env.MAX_PORT_TRIES, 20),
  jsonLimit: String(process.env.JSON_BODY_LIMIT || DEFAULT_JSON_LIMIT).trim(),
  cronLearningIntervalMs: parseNumber(process.env.CRON_LEARNING_INTERVAL_MS, DEFAULT_CRON_LEARNING_INTERVAL_MS),
  trainedModelDir: "data/training",
  trainedModelPrefix: "model-finished-matches-",
  trainedReportPrefix: "report-finished-matches-",
  appSignature: "SOLITAIRE HACK",
  allowedOrigins: parseCsv(process.env.ALLOWED_ORIGINS),
  liveFeedUrl,
  liveFeedApiKey: liveFeedHeaders.apiKey,
  liveFeedHeaders: liveFeedHeaders.headers,
  liveFeedConfigured: parseBoolean(process.env.LIVE_FEED_ENABLED, true),
  cronSecret: String(process.env.CRON_SECRET || "").trim(),
  finishedMatchesStoreUrl: String(
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.FINISHED_MATCHES_STORE_URL ||
    process.env.FINISHED_MATCHES_API_URL ||
    ""
  ).trim(),
  finishedMatchesStoreToken: String(
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.DATABASE_TOKEN ||
    process.env.FINISHED_MATCHES_STORE_TOKEN ||
    process.env.FINISHED_MATCHES_API_TOKEN ||
    ""
  ).trim(),
  training: {
    pinnedModelFile: String(process.env.TRAINED_GLOBAL_MODEL_FILE || "").trim(),
  },
};
