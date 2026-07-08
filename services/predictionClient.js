const https = require("https");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

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

function normalizeMarketList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const normalized = {};
      if (entry.T !== undefined) normalized.T = toNumber(entry.T, entry.T);
      if (entry.C !== undefined) normalized.C = toNumber(entry.C, entry.C);
      if (entry.P !== undefined) normalized.P = toNumber(entry.P, entry.P);
      if (entry.B !== undefined) normalized.B = entry.B;
      if (entry.G !== undefined) normalized.G = toNumber(entry.G, entry.G);

      const nestedMarkets = Array.isArray(entry.ME) ? normalizeMarketList(entry.ME) : undefined;
      if (nestedMarkets) normalized.ME = nestedMarkets;

      return normalized;
    })
    .filter(Boolean);
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

function mapResultLabel(label) {
  const key = normalizeValueKey(label);
  if (["0", "1", "home", "homewin", "homevictory", "victoiredomicile", "domicile"].includes(key)) return "home_win";
  if (["x", "draw", "1x", "nul", "matchnul", "tie"].includes(key)) return "draw";
  if (["2", "away", "awaywin", "awayvictory", "victoireexterieur", "exterieur"].includes(key)) return "away_win";
  return key || "home_win";
}

function normalizeProbabilityMap(probabilities = {}) {
  const mapped = {
    home_win: null,
    draw: null,
    away_win: null,
  };

  const entries = Object.entries(probabilities).filter(([, value]) => Number.isFinite(Number(value)));
  for (const [key, value] of entries) {
    const normalized = mapResultLabel(key);
    if (normalized in mapped) {
      mapped[normalized] = Number(value);
    }
  }

  if (mapped.home_win === null && mapped.draw === null && mapped.away_win === null && entries.length >= 3) {
    mapped.home_win = Number(entries[0][1]);
    mapped.draw = Number(entries[1][1]);
    mapped.away_win = Number(entries[2][1]);
  }

  return mapped;
}

function inferGoalsFromHistory(payload = {}) {
  const rollingHome = payload.rolling_home || payload.rollingHome || {};
  const rollingAway = payload.rolling_away || payload.rollingAway || {};
  const h2h = payload.h2h || {};

  const homeAttack = Number(rollingHome.avg_scored) || 1.5;
  const awayAttack = Number(rollingAway.avg_scored) || 1.5;
  const h2hGoals = Number(h2h.h2h_avg_goals);
  const weighted = Number.isFinite(h2hGoals)
    ? (homeAttack + awayAttack + h2hGoals) / 3
    : (homeAttack + awayAttack) / 2;

  const predicted = Math.max(0.5, Math.round(weighted * 2) / 2);
  return predicted;
}

function buildRemotePayload(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  return {
    I: toString(source.I ?? source.match_id ?? source.id, ""),
    O1: toString(source.O1 ?? source.team_home ?? source.teamHome ?? source.home_team ?? source.team1, ""),
    O2: toString(source.O2 ?? source.team_away ?? source.teamAway ?? source.away_team ?? source.team2, ""),
    L: toString(source.L ?? source.league, ""),
    S: source.S ?? source.timestamp ?? source.startTimeTimestamp ?? null,
    SC: source.SC ?? undefined,
    E: normalizeMarketList(source.E ?? source.e ?? source.market_data?.E ?? source.markets ?? []),
    AE: normalizeMarketList(source.AE ?? source.ae ?? source.market_data?.AE ?? source.advancedMarkets?.advancedMarkets ?? []),
  };
}

function buildLocalPayload(payload = {}) {
  const remotePayload = buildRemotePayload(payload);
  const rollingHome = payload.rolling_home || payload.rollingHome || payload.historical?.rolling_home || null;
  const rollingAway = payload.rolling_away || payload.rollingAway || payload.historical?.rolling_away || null;
  const h2h = payload.h2h || payload.historical?.h2h || null;

  return {
    league: remotePayload.L,
    team_home: remotePayload.O1,
    team_away: remotePayload.O2,
    home_team: remotePayload.O1,
    away_team: remotePayload.O2,
    rolling_home:
      rollingHome || {
        avg_scored: 1.5,
        avg_conceded: 1.2,
        win_rate: 0.5,
      },
    rolling_away:
      rollingAway || {
        avg_scored: 1.5,
        avg_conceded: 1.2,
        win_rate: 0.5,
      },
    h2h:
      h2h || {
        h2h_home_wins: 0.5,
        h2h_avg_goals: 2.5,
        h2h_n: 0,
      },
    market_data: {
      E: remotePayload.E,
      AE: remotePayload.AE,
    },
  };
}

class PredictionClient {
  constructor(url, sslVerify = true, timeoutMs = 60000, localUrl = "http://127.0.0.1:8000", probeTimeoutMs = 3500) {
    this.url = url;
    this.sslVerify = sslVerify;
    this.timeoutMs = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 60000;
    this.localUrl = localUrl;
    this.probeTimeoutMs = Number.isFinite(Number(probeTimeoutMs)) ? Number(probeTimeoutMs) : 3500;
    this.activeBaseUrl = null;
    this.activeSource = null;
    this.localApiStarted = false;
  }

  async healthCheck() {
    const baseUrl = await this.resolveBaseUrl();
    return this.getJson("/health", baseUrl, this.probeTimeoutMs);
  }

  async getLeagues() {
    const baseUrl = await this.resolveBaseUrl();
    return this.getJson("/leagues", baseUrl, this.probeTimeoutMs);
  }

  async getFamilies() {
    const leaguesResponse = await this.getLeagues();
    const leagues = Array.isArray(leaguesResponse?.leagues) ? leaguesResponse.leagues : [];
    const familiesMap = new Map();

    for (const league of leagues) {
      const family = String(league?.family || "ALL").trim() || "ALL";
      if (!familiesMap.has(family)) {
        familiesMap.set(family, []);
      }
      const leagueName = league?.name || league?.key;
      if (leagueName) {
        familiesMap.get(family).push(leagueName);
      }
    }

    return {
      success: true,
      total: familiesMap.size,
      families: [...familiesMap.entries()].map(([name, leaguesList]) => ({ name, leagues: leaguesList })),
      timestamp: leaguesResponse?.timestamp || new Date().toISOString(),
      source: this.activeSource || "remote",
    };
  }

  async getModelInfo(league) {
    if (!league) {
      throw new Error("La ligue est requise pour l'information du modele");
    }
    const baseUrl = await this.resolveBaseUrl();
    return this.getJson(`/model/${encodeURIComponent(league)}`, baseUrl, this.probeTimeoutMs);
  }

  async predictMatch(payload) {
    const remotePayload = buildRemotePayload(payload);
    const localPayload = buildLocalPayload(payload);
    const remoteBaseUrl = await this.resolveBaseUrl(true);

    try {
      const response = await this.postJson("/predict", remotePayload, remoteBaseUrl, this.timeoutMs);
      this.activeBaseUrl = remoteBaseUrl;
      this.activeSource = remoteBaseUrl === this.localUrl ? "local" : "remote";
      return this.normalizePredictionResponse(response, remotePayload, localPayload, this.activeSource);
    } catch (remoteError) {
      const fallbackResponse = await this.tryLocalPrediction(localPayload);
      if (fallbackResponse) {
        return fallbackResponse;
      }
      throw remoteError;
    }
  }

  async batchPredict(matches) {
    const items = Array.isArray(matches) ? matches : [];
    const remoteBaseUrl = await this.resolveBaseUrl(true);
    const remotePayload = { matches: items.map((item) => buildRemotePayload(item)) };

    try {
      const response = await this.postJson("/predict/batch", remotePayload, remoteBaseUrl, this.timeoutMs);
      this.activeBaseUrl = remoteBaseUrl;
      this.activeSource = remoteBaseUrl === this.localUrl ? "local" : "remote";
      return response;
    } catch (remoteError) {
      const predictions = [];
      for (const item of items) {
        const localResponse = await this.tryLocalPrediction(buildLocalPayload(item));
        if (localResponse) {
          predictions.push(localResponse);
        }
      }

      if (predictions.length) {
        return {
          success: true,
          total: predictions.length,
          predictions,
          source: "local",
        };
      }

      throw remoteError;
    }
  }

  async tryLocalPrediction(localPayload) {
    await this.ensureLocalApiRunning();

    try {
      const response = await this.postJson("/predict", localPayload, this.localUrl, this.timeoutMs);
      this.activeBaseUrl = this.localUrl;
      this.activeSource = "local";
      return this.normalizePredictionResponse(response, buildRemotePayload(localPayload), localPayload, "local");
    } catch (localError) {
      return null;
    }
  }

  normalizePredictionResponse(response, remotePayload, localPayload, source) {
    if (!response || response.success === false) {
      return response;
    }

    if (response.predictions) {
      const platformOdds = response.platform_odds || buildPlatformOdds(remotePayload.E || [], remotePayload.AE || []);
      return {
        ...response,
        source: source || "remote",
        platform_odds: platformOdds,
        match_id: toString(response.match_id ?? remotePayload.I, ""),
        team_home: toString(response.team_home ?? remotePayload.O1, ""),
        team_away: toString(response.team_away ?? remotePayload.O2, ""),
        league: toString(response.league ?? remotePayload.L, ""),
        timestamp: response.timestamp ?? remotePayload.S ?? null,
      };
    }

    const predictionData = response.prediction || {};
    const rawProbabilities = predictionData.result_probas || predictionData.result_probabilities || {};
    const probabilities = normalizeProbabilityMap(rawProbabilities);
    const resultPrediction = mapResultLabel(predictionData.result);
    const bestProbability = Math.max(
      Number(probabilities.home_win) || 0,
      Number(probabilities.draw) || 0,
      Number(probabilities.away_win) || 0
    );
    const predictedGoals = inferGoalsFromHistory(localPayload);
    const roundedGoals = Math.max(0.5, Math.round(predictedGoals * 2) / 2);
    const isEven = Math.round(roundedGoals) % 2 === 0;
    const overThreshold = roundedGoals >= 7.5 ? 7.5 : roundedGoals >= 6.5 ? 6.5 : 5.5;

    return {
      success: true,
      source: "local",
      family: "LOCAL",
      league: toString(response.league ?? localPayload.league, ""),
      match_id: toString(localPayload.match_id ?? localPayload.I, ""),
      team_home: toString(localPayload.team_home ?? localPayload.home_team, ""),
      team_away: toString(localPayload.team_away ?? localPayload.away_team, ""),
      timestamp: response.timestamp ?? localPayload.timestamp ?? null,
      platform_odds: buildPlatformOdds(localPayload.market_data?.E || [], localPayload.market_data?.AE || []),
      predictions: {
        match_result: {
          prediction: resultPrediction,
          confidence: Number(predictionData.result_proba) || bestProbability,
          probabilities,
        },
        total_goals: {
          predicted: roundedGoals,
          platform_value: roundedGoals,
          confidence: Math.min(0.95, Math.max(0.55, bestProbability)),
        },
        total_parity: {
          prediction: isEven ? "even" : "odd",
          confidence: Math.min(0.9, Math.max(0.5, bestProbability)),
        },
        over_under: {
          threshold: overThreshold,
          prediction: roundedGoals >= overThreshold ? "over" : "under",
          confidence: Math.min(0.9, Math.max(0.5, bestProbability)),
        },
        top_scores: Array.isArray(predictionData.top_scores) ? predictionData.top_scores : [],
      },
    };
  }

  async resolveBaseUrl(allowRemoteProbe = false) {
    if (this.activeBaseUrl) {
      return this.activeBaseUrl;
    }

    if (allowRemoteProbe) {
      const remoteHealthy = await this.probeHealth(this.url).catch(() => false);
      if (remoteHealthy) {
        this.activeBaseUrl = this.url;
        this.activeSource = "remote";
        return this.activeBaseUrl;
      }
    }

    await this.ensureLocalApiRunning();
    this.activeBaseUrl = this.localUrl;
    this.activeSource = "local";
    return this.activeBaseUrl;
  }

  async probeHealth(baseUrl) {
    try {
      const response = await this.requestJson("GET", "/health", null, baseUrl, this.probeTimeoutMs);
      return Boolean(response);
    } catch {
      return false;
    }
  }

  async ensureLocalApiRunning() {
    if (this.localApiStarted) {
      return;
    }

    const alreadyUp = await this.probeHealth(this.localUrl).catch(() => false);
    if (alreadyUp) {
      this.localApiStarted = true;
      return;
    }

    try {
      const scriptPath = path.join(process.cwd(), "prediction_api.py");
      const child = spawn("python", [scriptPath], {
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
      this.localApiStarted = true;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (await this.probeHealth(this.localUrl).catch(() => false)) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch {
      // Ignore spawn errors and let the HTTP probe handle failure.
    }
  }

  getJson(pathname, baseUrl, timeoutMs) {
    return this.requestJson("GET", pathname, null, baseUrl, timeoutMs);
  }

  postJson(pathname, body, baseUrl, timeoutMs) {
    return this.requestJson("POST", pathname, body, baseUrl, timeoutMs);
  }

  requestJson(method, pathname, body, baseUrl = this.url, timeoutMs = this.timeoutMs) {
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

module.exports = PredictionClient;
