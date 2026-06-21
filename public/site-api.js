/**
 * Site API Client - Adapté pour FURY X ONE
 * Signé: SOLITAIRE HACK
 */

(function (global) {
  "use strict";

  const DEFAULT_BASE_URL = "/api";
  const DEFAULT_TIMEOUT_MS = 20000;

  function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timer));
  }

  async function requestJson(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    let response;
    try {
      response = await fetchWithTimeout(`${DEFAULT_BASE_URL}${path}`, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "same-origin",
      }, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`Timeout sur ${path} après ${Math.round((Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS) / 1000)}s`);
      }
      throw error;
    }

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
    matchById(id) {
      return requestJson(`/matches/${encodeURIComponent(id)}`);
    },
    prediction(teamHome, teamAway, league) {
      return requestJson("/prediction", {
        method: "POST",
        body: { team_home: teamHome, team_away: teamAway, league },
        timeoutMs: 20000,
      });
    },
    predictionHealth() {
      return requestJson("/prediction/health");
    },
    predictionFamilies() {
      return requestJson("/prediction/families");
    },
    predictionLeagues(family) {
      return requestJson(`/prediction/leagues/${encodeURIComponent(family)}`);
    },
    predictionUpdateHistory(body) {
      return requestJson("/prediction/update-history", { method: "POST", body });
    },
    predictionSaveHistory(family) {
      const query = family ? `?family=${encodeURIComponent(family)}` : "";
      return requestJson(`/prediction/save-history${query}`, { method: "POST" });
    },
    predictionClearCache() {
      return requestJson("/prediction/clear-cache", { method: "POST" });
    },
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
    system() {
      return requestJson("/system");
    },
    health() {
      return requestJson("/health");
    },
  };

  global.SiteAPI = SiteAPI;
  global.siteApi = global.siteApi || SiteAPI;
})(window);
