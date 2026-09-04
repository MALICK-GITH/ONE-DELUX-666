const https = require("https");
const http = require("http");

function toString(value, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function toNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeValueKey(value) {
  return toString(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function mapResultLabel(label) {
  const key = normalizeValueKey(label);
  if (["0", "1", "home", "homewin", "homevictory", "victoiredomicile", "domicile"].includes(key)) return "home_win";
  if (["x", "draw", "1x", "nul", "matchnul", "tie"].includes(key)) return "draw";
  if (["2", "away", "awaywin", "awayvictory", "victoireexterieur", "exterieur"].includes(key)) return "away_win";
  return key || "home_win";
}

function buildPlatformOdds(markets = [], advancedMarkets = []) {
  const main = {};
  const overUnder = [];
  const handicap = [];

  const pushMarket = (market, groupOverride = null) => {
    if (!market || typeof market !== "object") return;
    const group = Number(groupOverride ?? market.G);
    const type = Number(market.T);
    const line = market.P !== undefined ? Number(market.P) : null;
    const value = Number(market.C);
    if (!Number.isFinite(value)) return;

    if (group === 1) {
      if (type === 1) main.home_win = { value };
      if (type === 2) main.draw = { value };
      if (type === 3) main.away_win = { value };
    }

    if (group === 17 && Number.isFinite(line)) {
      if (type === 9) overUnder.push({ type: "over", threshold: line, value });
      if (type === 10) overUnder.push({ type: "under", threshold: line, value });
    }

    if (group === 2 && Number.isFinite(line)) {
      if (type === 7) handicap.push({ type: "home", handicap: line, value });
      if (type === 8) handicap.push({ type: "away", handicap: line, value });
    }
  };

  (Array.isArray(markets) ? markets : []).forEach((market) => pushMarket(market));
  (Array.isArray(advancedMarkets) ? advancedMarkets : []).forEach((groupItem) => {
    const group = groupItem?.G;
    (Array.isArray(groupItem?.ME) ? groupItem.ME : []).forEach((market) => pushMarket(market, group));
  });

  return { main, over_under: overUnder, handicap };
}

class ParityAIClient {
  constructor(baseUrl = "https://fifa-ai-trainer.lovable.app", sslVerify = false, timeoutMs = 60000) {
    this.baseUrl = baseUrl;
    this.sslVerify = sslVerify;
    this.timeoutMs = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 60000;
  }

  async healthCheck() {
    try {
      const response = await this.getJson("/api/public/model");
      return Boolean(response && response.ok);
    } catch {
      return false;
    }
  }

  async getModelInfo() {
    return this.getJson("/api/public/model");
  }

  async predictMatch(payload) {
    const home = toString(payload.O1 ?? payload.team_home ?? payload.teamHome ?? payload.home_team ?? payload.team1);
    const away = toString(payload.O2 ?? payload.team_away ?? payload.teamAway ?? payload.away_team ?? payload.team2);
    const league = toString(payload.L ?? payload.league);

    if (!home || !away || !league) {
      throw new Error("Home team, away team, and league are required for ParityAI prediction");
    }

    const queryParams = new URLSearchParams({
      home: encodeURIComponent(home),
      away: encodeURIComponent(away),
      league: encodeURIComponent(league)
    });

    const response = await this.getJson(`/api/public/predict?${queryParams}`);
    return this.normalizePredictionResponse(response, payload);
  }

  async batchPredict(matches) {
    const items = Array.isArray(matches) ? matches : [];
    
    if (items.length === 0) {
      throw new Error("At least one match is required for batch prediction");
    }

    if (items.length > 100) {
      throw new Error("ParityAI batch prediction supports maximum 100 matches");
    }

    const requestBody = {
      matches: items.map((item) => ({
        id: toString(item.I ?? item.match_id ?? item.id ?? `match-${Date.now()}-${Math.random()}`),
        home: toString(item.O1 ?? item.team_home ?? item.teamHome ?? item.home_team ?? item.team1),
        away: toString(item.O2 ?? item.team_away ?? item.teamAway ?? item.away_team ?? item.team2),
        league: toString(item.L ?? item.league)
      }))
    };

    const response = await this.postJson("/api/public/predict", requestBody);
    
    if (!response.ok || !Array.isArray(response.predictions)) {
      throw new Error("Invalid batch response from ParityAI");
    }

    return {
      success: true,
      total: response.count || response.predictions.length,
      predictions: response.predictions.map((pred, index) => 
        this.normalizePredictionResponse({ ok: true, prediction: pred }, items[index])
      ),
      source: "parityai"
    };
  }

  normalizePredictionResponse(response, originalPayload) {
    if (!response || !response.ok || !response.prediction) {
      return {
        success: false,
        error: "Invalid response from ParityAI",
        source: "parityai"
      };
    }

    const prediction = response.prediction;
    const match = prediction.match || {};
    const result = prediction.result || {};
    const totalGoals = prediction.totalGoals || {};
    const parity = prediction.parity || {};
    const correctScore = prediction.correctScore || [];
    const expectedGoals = prediction.expectedGoals || {};

    const remotePayload = {
      I: originalPayload?.I || originalPayload?.match_id || originalPayload?.id || "",
      O1: match.home || originalPayload?.O1 || originalPayload?.team_home || "",
      O2: match.away || originalPayload?.O2 || originalPayload?.team_away || "",
      L: match.league || originalPayload?.L || originalPayload?.league || "",
      E: Array.isArray(originalPayload?.E) ? originalPayload.E : [],
      AE: Array.isArray(originalPayload?.AE) ? originalPayload.AE : []
    };

    const probabilities = {
      home_win: toNumber(result.probabilities?.home),
      draw: toNumber(result.probabilities?.draw),
      away_win: toNumber(result.probabilities?.away)
    };

    const bestProbability = Math.max(
      probabilities.home_win || 0,
      probabilities.draw || 0,
      probabilities.away_win || 0
    );

    const resultPrediction = mapResultLabel(result.pick);

    const overUnderPredictions = {};
    if (Array.isArray(totalGoals.lines)) {
      totalGoals.lines.forEach((line) => {
        const threshold = toNumber(line.line);
        if (threshold) {
          overUnderPredictions[`over_${threshold.replace('.', '_')}`] = {
            prediction: line.pick === "OVER" ? "over" : "under",
            confidence: toNumber(line.pick === "OVER" ? line.over : line.under)
          };
        }
      });
    }

    const topScores = Array.isArray(correctScore) 
      ? correctScore.slice(0, 5).map((score) => ({
          score: score.score,
          proba: toNumber(score.probability)
        }))
      : [];

    return {
      success: true,
      source: "parityai",
      family: "PARITYAI",
      match_id: remotePayload.I,
      team_home: remotePayload.O1,
      team_away: remotePayload.O2,
      league: remotePayload.L,
      timestamp: new Date().toISOString(),
      platform_odds: buildPlatformOdds(remotePayload.E, remotePayload.AE),
      predictions: {
        match_result: {
          prediction: resultPrediction,
          confidence: toNumber(result.confidence) || bestProbability,
          probabilities,
          double_chance: result.doubleChance || {},
          both_teams_to_score: result.bothTeamsToScore || {}
        },
        total_goals: {
          predicted: toNumber(totalGoals.expected) || toNumber(expectedGoals.total),
          most_likely: toNumber(totalGoals.mostLikely),
          expected_home: toNumber(expectedGoals.home),
          expected_away: toNumber(expectedGoals.away),
          lines: totalGoals.lines || [],
          over_under: overUnderPredictions
        },
        total_parity: {
          prediction: parity.pick === "PAIR" ? "even" : "odd",
          confidence: toNumber(parity.confidence),
          probabilities: {
            even: toNumber(parity.probabilities?.even),
            odd: toNumber(parity.probabilities?.odd)
          },
          edge: toNumber(parity.edge)
        },
        correct_score: {
          top_scores: topScores
        },
        model: prediction.model || {}
      }
    };
  }

  getJson(pathname, timeoutMs) {
    return this.requestJson("GET", pathname, null, this.baseUrl, timeoutMs);
  }

  postJson(pathname, body, timeoutMs) {
    return this.requestJson("POST", pathname, body, this.baseUrl, timeoutMs);
  }

  requestJson(method, pathname, body, baseUrl = this.baseUrl, timeoutMs = this.timeoutMs) {
    return new Promise((resolve, reject) => {
      const base = new URL(baseUrl);
      const protocol = base.protocol === "https:" ? https : http;
      const payload = method === "POST" ? JSON.stringify(body ?? {}) : null;
      const options = {
        hostname: base.hostname,
        port: base.port || (base.protocol === "https:" ? 443 : 80),
        path: pathname,
        method,
        headers: {},
        rejectUnauthorized: this.sslVerify,
      };

      if (payload) {
        options.headers["Content-Type"] = "application/json";
        options.headers["Content-Length"] = Buffer.byteLength(payload);
      }

      const req = protocol.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = data ? JSON.parse(data) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
              return;
            }
            reject(new Error(json.detail || json.error || json.message || `HTTP ${res.statusCode}`));
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Délai dépassé après ${timeoutMs} ms`));
      });

      req.on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }
}

module.exports = ParityAIClient;
