"use strict";

const https = require("https");
const config = require("../server/config");

function buildRequestHeaders(extraHeaders = {}) {
  return {
    accept: "application/json, text/plain, */*",
    "user-agent": "RUST SIT XPR/1.0",
    ...(config.liveFeedHeaders || {}),
    ...extraHeaders,
  };
}

function createDisabledError() {
  const error = new Error("Live feed disabled by configuration");
  error.status = 503;
  return error;
}

function fetchLiveFeedJson(options = {}) {
  if (!config.liveFeedConfigured && options.allowDisabled !== true) {
    return Promise.reject(createDisabledError());
  }

  const requestUrl = String(options.url || config.liveFeedUrl || "").trim();
  if (!requestUrl) {
    const error = new Error("Live feed URL is not configured");
    error.status = 500;
    return Promise.reject(error);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(requestUrl);
  } catch (error) {
    const invalidUrlError = new Error("Live feed URL is invalid");
    invalidUrlError.status = 500;
    return Promise.reject(invalidUrlError);
  }

  const headers = buildRequestHeaders(options.headers);
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : Number.isFinite(Number(config.liveFeedTimeoutMs))
      ? Number(config.liveFeedTimeoutMs)
      : 30000;

  return new Promise((resolve, reject) => {
    const request = https.get(parsedUrl, { headers }, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        if (response.statusCode !== 200) {
          const error = new Error(`API distante en erreur (${response.statusCode})`);
          error.status = response.statusCode || 500;
          error.body = data;
          reject(error);
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Live feed request timed out"));
    });

    request.on("error", reject);
  });
}

async function fetchLiveFeedEvents(options = {}) {
  const payload = await fetchLiveFeedJson(options);
  return Array.isArray(payload?.Value) ? payload.Value : [];
}

module.exports = {
  fetchLiveFeedJson,
  fetchLiveFeedEvents,
};
