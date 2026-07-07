const https = require("https");
const http = require("http");

class PredictionClient {
  constructor(url, sslVerify = true) {
    this.url = url;
    this.sslVerify = sslVerify;
  }

  async healthCheck() {
    return this.getJson("/health");
  }

  async getLeagues() {
    return this.getJson("/leagues");
  }

  async predictMatch(teamHome, teamAway, league, rollingHome = null, rollingAway = null, h2h = null) {
    const payload = {
      league,
      team_home: teamHome,
      team_away: teamAway,
    };

    if (rollingHome) payload.rolling_home = rollingHome;
    if (rollingAway) payload.rolling_away = rollingAway;
    if (h2h) payload.h2h = h2h;

    return this.postJson("/predict", payload);
  }

  async batchPredict(requests) {
    const payload = Array.isArray(requests) ? requests : [];
    return this.postJson("/predict/batch", payload);
  }

  async getModelInfo(league) {
    if (!league) {
      throw new Error("La ligue est requise pour l'information du modèle");
    }
    return this.getJson(`/model/${encodeURIComponent(league)}`);
  }

  async getCacheStats() {
    return this.getJson("/cache/stats");
  }

  async clearCache() {
    return this.postJson("/cache/clear", {});
  }

  async getFamilies() {
    const leaguesResponse = await this.getLeagues();
    const leagues = Array.isArray(leaguesResponse?.leagues) ? leaguesResponse.leagues : [];

    const families = [
      {
        name: "all",
        leagues: leagues.map((league) => league.name).filter(Boolean),
      },
    ];

    return {
      success: true,
      families,
      total: families.length,
      timestamp: leaguesResponse?.timestamp || new Date().toISOString(),
    };
  }

  async getLeagueStats(leagueName) {
    const leaguesResponse = await this.getLeagues();
    const leagues = Array.isArray(leaguesResponse?.leagues) ? leaguesResponse.leagues : [];
    const league = leagues.find((entry) => entry.name === leagueName || entry.model_file === leagueName);

    if (!league) {
      throw new Error(`Ligue introuvable: ${leagueName}`);
    }

    return league;
  }

  async getTeamStats(teamName) {
    return {
      team: teamName,
      available: false,
      message: "Les statistiques d'équipe ne sont pas exposées par l'API de prédiction actuelle",
    };
  }

  getJson(path) {
    return this.requestJson("GET", path);
  }

  postJson(path, body) {
    return this.requestJson("POST", path, body);
  }

  requestJson(method, path, body) {
    return new Promise((resolve, reject) => {
      const base = new URL(this.url);
      const protocol = base.protocol === "https:" ? https : http;
      const payload = method === "POST" ? JSON.stringify(body ?? {}) : null;
      const options = {
        hostname: base.hostname,
        port: base.port || (base.protocol === "https:" ? 443 : 80),
        path,
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
            const json = JSON.parse(data);
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
