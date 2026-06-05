/**
 * Site API Client - Adapté pour RUST SIT XPR
 * Signé: SOLITAIRE HACK
 */

(function (global) {
  "use strict";

  const DEFAULT_BASE_URL = "/api";

  async function requestJson(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} for ${path}`);
      error.response = response;
      error.data = data;
      throw error;
    }
    return data;
  }

  const SiteAPI = global.SiteAPI || {
    baseUrl: DEFAULT_BASE_URL,
    requestJson,
    get(path, options) {
      return requestJson(path, { ...(options || {}), method: "GET" });
    },
    post(path, body, options) {
      return requestJson(path, { ...(options || {}), method: "POST", body });
    },
    matches() {
      return requestJson("/matches");
    },
    matchStatus() {
      return requestJson("/matches/status");
    },
    matchById(matchId) {
      return requestJson(`/matches/${encodeURIComponent(matchId)}`);
    },
    // Coupon endpoints
    coupon(params = {}) {
      const query = new URLSearchParams(params).toString();
      return requestJson(`/coupon?${query}`);
    },
    couponLadder(body) {
      return requestJson("/coupon/ladder", { method: "POST", body });
    },
    couponMulti(body) {
      return requestJson("/coupon/multi", { method: "POST", body });
    },
    couponValidate(body) {
      return requestJson("/coupon/validate", { method: "POST", body });
    },
    aiPrediction(params = {}) {
      const query = new URLSearchParams(params).toString();
      return requestJson(`/ai/prediction?${query}`);
    },
    advancedPrediction(params = {}) {
      const query = new URLSearchParams(params).toString();
      return requestJson(`/ai/advanced?${query}`);
    },
    system() {
      return requestJson("/system");
    },
    health() {
      return requestJson("/health");
    },
    cronLearningStatus() {
      return requestJson("/cron/learning/status");
    },
    cronLearningStart() {
      return requestJson("/cron/learning/start", { method: "POST" });
    },
    cronLearningStop() {
      return requestJson("/cron/learning/stop", { method: "POST" });
    },
    cronLearningCollect() {
      return requestJson("/cron/learning/collect", { method: "POST" });
    },
  };

  global.SiteAPI = SiteAPI;
  global.siteApi = global.siteApi || SiteAPI;
})(window);
