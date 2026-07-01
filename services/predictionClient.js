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

  async predictMatch(teamHome, teamAway, league, marketData = null) {
    const payload = {
      team_home: teamHome,
      team_away: teamAway,
      league
    };
    
    if (marketData) {
      payload.market_data = marketData;
    }
    
    return this.postJson("/predict", payload);
  }

  async batchPredict(matches) {
    return this.postJson("/batch-predict", { matches });
  }

  async getFamilies() {
    return this.getJson("/families");
  }

  async getLeagues(family) {
    return this.getJson(`/leagues/${encodeURIComponent(family)}`);
  }

  async getModelInfo() {
    return this.getJson("/model-info");
  }

  async getTeamStats(teamName) {
    return this.getJson(`/team-stats/${encodeURIComponent(teamName)}`);
  }

  async getLeagueStats(leagueName) {
    return this.getJson(`/league-stats/${encodeURIComponent(leagueName)}`);
  }

  async clearCache() {
    return this.postJson("/clear-cache", {});
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
      const payload = method === "POST" ? JSON.stringify(body || {}) : null;
      const options = {
        hostname: base.hostname,
        port: base.port || (base.protocol === "https:" ? 443 : 80),
        path,
        method,
        headers: {},
        rejectUnauthorized: this.sslVerify
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
