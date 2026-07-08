/**
 * Site API Client - Adapté pour FURY X ONE
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
    matchById(id) {
      return requestJson(`/matches/${encodeURIComponent(id)}`);
    },
    prediction(teamHome, teamAway, league, stats = null) {
      const matchData = stats && typeof stats === "object" ? stats : {};
      const requestBody = {
        I: matchData.id || matchData.I || matchData.match_id || "",
        O1: teamHome,
        O2: teamAway,
        L: league,
        S: matchData.startTimeTimestamp || matchData.S || matchData.timestamp || null,
        E: Array.isArray(matchData.E)
          ? matchData.E
          : Array.isArray(matchData.markets)
            ? matchData.markets
            : Array.isArray(matchData.odds?.markets)
              ? matchData.odds.markets
              : [],
        AE: Array.isArray(matchData.AE)
          ? matchData.AE
          : Array.isArray(matchData.advancedMarkets?.advancedMarkets)
            ? matchData.advancedMarkets.advancedMarkets
            : [],
      };

      return requestJson("/prediction", {
        method: "POST",
        body: requestBody,
      });
    },
    predictionHealth() {
      return requestJson("/prediction/health");
    },
    predictionInsight(body) {
      return requestJson("/prediction/insight", { method: "POST", body });
    },
    predictionModels() {
      return requestJson("/prediction/models");
    },
    predictionModelInfo(league = "") {
      return league
        ? requestJson(`/prediction/model/${encodeURIComponent(league)}`)
        : requestJson("/prediction/model-info");
    },
    predictionBatch(matches) {
      return requestJson("/prediction/batch", {
        method: "POST",
        body: { matches: Array.isArray(matches) ? matches : [] },
      });
    },
    predictionTeamStats(teamName) {
      return requestJson(`/prediction/team-stats/${encodeURIComponent(teamName)}`);
    },
    predictionLeagueStats(leagueName) {
      return requestJson(`/prediction/league-stats/${encodeURIComponent(leagueName)}`);
    },
    assistantChat(body) {
      return requestJson("/assistant/chat", { method: "POST", body });
    },
    predictionFamilies() {
      return requestJson("/prediction/leagues");
    },
    predictionLeagues(family) {
      return family
        ? requestJson(`/prediction/leagues/${encodeURIComponent(family)}`)
        : requestJson("/prediction/leagues");
    },
    predictionUpdateHistory(body) {
      return requestJson("/prediction/update-history", { method: "POST", body });
    },
    predictionSaveHistory(family) {
      const query = family ? `?family=${encodeURIComponent(family)}` : "";
      return requestJson(`/prediction/save-history${query}`, { method: "POST" });
    },
    predictionCacheStats() {
      return requestJson("/prediction/cache/stats");
    },
    predictionClearCache() {
      return requestJson("/prediction/cache/clear", { method: "POST" });
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
