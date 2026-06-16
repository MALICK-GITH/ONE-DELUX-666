/**
 * FURY X ONE 👿 - Prediction Client
 * Client pour l'API FIFA Prediction: https://top-modele-train-api.onrender.com
 * Signé: SOLITAIRE HACK
 */

const https = require("https");
const http = require("http");

class PredictionClient {
  constructor(url) {
    this.url = url;
    this.leagueMapping = this.getLeagueMapping();
  }

  getLeagueMapping() {
    return {
      // HIGHSCORE (3x3, 4x4)
      "FC 24. 4x4. England Championship": "FC 24. 4x4. Championnat d'Angleterre",
      "FC 25. 3x3. Conference League": "FC 25. 3x3. Ligue de conférence",
      
      // RUSH (5x5)
      "FC 26. 5x5 Rush. Superleague": "FC 26. 5x5 Rush. Superligue",
      
      // CLASSIC (championnats classiques)
      "FC 25. Germany Championship": "FC 25. Championnat d'Allemagne",
      "FC 25. England Championship": "FC 25. Championnat d'Angleterre",
      "FC 25. Spain Championship": "FC 25. Championnat d'Espagne",
      "FC 25. Europa League": "FC 25. Ligue européenne",
      "FC 26. World Championship": "FC 26. Championnat du monde",
      
      // PENALTY (tirs au but)
      "FC24. Penalty": "FC24. Penalty",
      "FC25. Penalty": "FC25. Penalty",
      "FC26. Penalty": "FC26. Penalty",
      "FIFA23. Penalty": "FIFA23. Penalty",
      "Penalty": "Penalty"
    };
  }

  mapLeague(league) {
    // Retourner la version française si mapping existe, sinon l'original
    return this.leagueMapping[league] || league;
  }

  async healthCheck() {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      
      protocol.get(`${this.url}/health`, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      }).on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });
    });
  }

  async predictMatch(teamHome, teamAway, league) {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      
      // Appliquer le mapping des ligues
      const mappedLeague = this.mapLeague(league);
      
      const postData = JSON.stringify({
        team_home: teamHome,
        team_away: teamAway,
        league: mappedLeague
      });

      const options = {
        hostname: new URL(this.url).hostname,
        port: new URL(this.url).port || (this.url.startsWith("https") ? 443 : 80),
        path: "/predict",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        }
      };

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
            } else {
              reject(new Error(json.error || `HTTP ${res.statusCode}`));
            }
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  async getFamilies() {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      
      protocol.get(`${this.url}/families`, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      }).on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });
    });
  }

  async getLeagues(family) {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      
      protocol.get(`${this.url}/leagues/${family}`, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      }).on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });
    });
  }

  async updateHistory(teamHome, teamAway, league, scoreHome, scoreAway, finishedAt, family) {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      
      const mappedLeague = this.mapLeague(league);
      
      const postData = JSON.stringify({
        team_home: teamHome,
        team_away: teamAway,
        league: mappedLeague,
        score_home: scoreHome,
        score_away: scoreAway,
        finished_at: finishedAt,
        family: family
      });

      const options = {
        hostname: new URL(this.url).hostname,
        port: new URL(this.url).port || (this.url.startsWith("https") ? 443 : 80),
        path: "/update-history",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        }
      };

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
            } else {
              reject(new Error(json.error || `HTTP ${res.statusCode}`));
            }
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  async saveHistory(family = null) {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      
      const path = family ? `/save-history?family=${family}` : "/save-history";
      
      const options = {
        hostname: new URL(this.url).hostname,
        port: new URL(this.url).port || (this.url.startsWith("https") ? 443 : 80),
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      };

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
            } else {
              reject(new Error(json.error || `HTTP ${res.statusCode}`));
            }
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });

      req.end();
    });
  }

  async clearCache() {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      
      const options = {
        hostname: new URL(this.url).hostname,
        port: new URL(this.url).port || (this.url.startsWith("https") ? 443 : 80),
        path: "/clear-cache",
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      };

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
            } else {
              reject(new Error(json.error || `HTTP ${res.statusCode}`));
            }
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });

      req.end();
    });
  }
}

module.exports = PredictionClient;
