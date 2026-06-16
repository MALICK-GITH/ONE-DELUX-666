/**
 * Site API Client - Adapté pour FURY X ONE 👿
 * Signé: SOLITAIRE HACK
 */

(function (global) {
  "use strict";

  const DEFAULT_BASE_URL = "/api";
  const EXTERNAL_API_URL = "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip?sports=85&count=40&lng=fr&gr=789&mode=4&country=96&partner=233&getEmpty=true&virtualSports=true&noFilterBlockEvent=true";

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

  async function fetchExternalAPI() {
    try {
      const response = await fetch(EXTERNAL_API_URL, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      const data = await response.json();
      return transformExternalData(data);
    } catch (error) {
      console.error("Erreur API externe:", error);
      throw error;
    }
  }

  function transformExternalData(data) {
    if (!data.Success || !data.Value) {
      return { success: false, error: "Données API invalides", matches: [] };
    }

    const matches = data.Value.map(match => {
      const odds = extractOdds(match.E);
      const score = extractScore(match.SC);
      const status = determineStatus(match.SC, match.S);
      
      return {
        id: String(match.I),
        team1: match.O1,
        team2: match.O2,
        league: match.L,
        leagueId: String(match.LI),
        country: match.CN,
        startTime: match.S,
        status: status,
        normalizedStatus: normalizeStatus(status),
        score: score,
        odds: odds,
        homeLogo: match.O1IMG && match.O1IMG[0] ? `https://888starz.bet/genfiles/teams/${match.O1IMG[0]}` : null,
        awayLogo: match.O2IMG && match.O2IMG[0] ? `https://888starz.bet/genfiles/teams/${match.O2IMG[0]}` : null,
        isLive: status.includes("en cours") || status.includes("live") || (score && score.home !== null),
        isFinished: status.includes("terminé") || status.includes("finished"),
        isUpcoming: !status.includes("en cours") && !status.includes("live") && !status.includes("terminé") && !status.includes("finished"),
        period: extractPeriod(match.SC),
        originalData: match
      };
    });

    return { success: true, matches };
  }

  function extractOdds(events) {
    if (!events || !Array.isArray(events)) return { home: null, draw: null, away: null };
    
    const oddsMap = {};
    events.forEach(event => {
      if (event.T === 1) oddsMap.home = event.C;
      if (event.T === 2) oddsMap.draw = event.C;
      if (event.T === 3) oddsMap.away = event.C;
    });

    return {
      home: oddsMap.home || null,
      draw: oddsMap.draw || null,
      away: oddsMap.away || null
    };
  }

  function extractScore(scoreData) {
    if (!scoreData || !scoreData.FS) return { home: null, away: null };
    
    const fs = scoreData.FS;
    if (fs.S1 !== undefined || fs.S2 !== undefined) {
      return {
        home: fs.S1 !== undefined ? fs.S1 : null,
        away: fs.S2 !== undefined ? fs.S2 : null
      };
    }
    
    return { home: null, away: null };
  }

  function determineStatus(scoreData, startTime) {
    if (!scoreData) return "À venir";
    
    if (scoreData.FS && (scoreData.FS.S1 !== undefined || scoreData.FS.S2 !== undefined)) {
      return "En cours";
    }
    
    if (scoreData.SLS) {
      if (scoreData.SLS.includes("minutes") && !scoreData.SLS.includes("Début")) {
        return "En cours";
      }
      if (scoreData.SLS.includes("Début")) {
        return "À venir";
      }
    }
    
    if (scoreData.I) {
      if (scoreData.I.includes("Paris avant le début")) {
        return "À venir";
      }
    }
    
    return "À venir";
  }

  function normalizeStatus(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("en cours") || statusLower.includes("live")) return "en_cours";
    if (statusLower.includes("terminé") || statusLower.includes("finished")) return "terminé";
    if (statusLower.includes("à venir") || statusLower.includes("upcoming")) return "a_venir";
    return "a_venir";
  }

  function extractPeriod(scoreData) {
    if (!scoreData || !scoreData.SLS) return null;
    
    if (scoreData.SLS.includes("minutes")) {
      return scoreData.SLS;
    }
    
    return null;
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
    // Matches endpoints - Now using external API
    matches() {
      return fetchExternalAPI();
    },
    matchById(id) {
      return fetchExternalAPI().then(data => {
        const match = data.matches.find(m => m.id === id);
        if (!match) throw new Error("Match non trouvé");
        return { success: true, match };
      });
    },
    // Prediction endpoints
    prediction(teamHome, teamAway, league) {
      return requestJson("/prediction", { method: "POST", body: { team_home: teamHome, team_away: teamAway, league } });
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
