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

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  port: parseNumber(process.env.PORT, DEFAULT_PORT),
  appSignature: "SOLITAIRE HACK",
};