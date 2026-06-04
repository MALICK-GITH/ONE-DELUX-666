const DEFAULT_PORT = 3000;
const DEFAULT_JSON_LIMIT = "1mb";

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

module.exports = {
  port: parseNumber(process.env.PORT, DEFAULT_PORT),
  maxPortTries: parseNumber(process.env.MAX_PORT_TRIES, 20),
  jsonLimit: String(process.env.JSON_BODY_LIMIT || DEFAULT_JSON_LIMIT).trim(),
  trainedModelDir: "data/training",
  trainedModelPrefix: "model-finished-matches-",
  trainedReportPrefix: "report-finished-matches-",
  appSignature: "SOLITAIRE HACK",
  allowedOrigins: parseCsv(process.env.ALLOWED_ORIGINS),
};
