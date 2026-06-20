/**
 * FURY X ONE ðŸ‘¿ - Prediction Client
 * Client pour l'API FIFA Prediction: https://top-modele-train-api-vmp.onrender.com
 * SignÃ©: SOLITAIRE HACK
 */

const https = require("https");
const http = require("http");

class PredictionClient {
  constructor(url) {
    this.url = url;
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
      
      const postData = JSON.stringify({
        team_home: teamHome,
        team_away: teamAway,
        league: league
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
              reject(new Error(json.detail || json.error || json.message || `HTTP ${res.statusCode}`));
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
              reject(new Error(json.detail || json.error || json.message || `HTTP ${res.statusCode}`));
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

