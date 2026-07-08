const https = require("https");
const http = require("http");

class PredictionClient {
  constructor(url, sslVerify = true, timeoutMs = 60000) {
    this.url = url;
    this.sslVerify = sslVerify;
    this.timeoutMs = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 60000;
  }

  async healthCheck() {
    return this.getJson("/health");
  }

  async getLeagues() {
    return this.getJson("/leagues");
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
    };
  }

  async predictMatch(payload) {
    return this.postJson("/predict", payload || {});
  }

  async batchPredict(matches) {
    return this.postJson("/predict/batch", {
      matches: Array.isArray(matches) ? matches : [],
    });
  }

  async getModelInfo(league) {
    if (!league) {
      throw new Error("La ligue est requise pour l'information du modele");
    }
    return this.getJson(`/model/${encodeURIComponent(league)}`);
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

      req.setTimeout(this.timeoutMs, () => {
        req.destroy(new Error(`Délai dépassé après ${this.timeoutMs} ms`));
      });

      req.on("error", (error) => {
        if (error?.message?.includes("Délai dépassé")) {
          reject(new Error(`Erreur de connexion: ${error.message}`));
          return;
        }
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
