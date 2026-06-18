/**
 * FURY X ONE 👿 - Live Feed Client
 * Client pour l'API live-feed 888starz: /service-api/LiveFeed/Get1x2_VZip
 */

const https = require("https");
const http = require("http");

class LiveFeedClient {
  constructor(url) {
    this.url = url;
  }

  async fetchMatches() {
    return new Promise((resolve, reject) => {
      const protocol = this.url.startsWith("https") ? https : http;
      const requestUrl = new URL(this.url);
      const options = {
        hostname: requestUrl.hostname,
        port: requestUrl.port || (this.url.startsWith("https") ? 443 : 80),
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method: "GET",
        headers: {
          authority: requestUrl.hostname,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "max-age=0",
          "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Linux\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        },
      };

      protocol.get(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.Success && json.Value) {
              resolve(this.transformMatches(json.Value));
            } else {
              reject(new Error(json.Error || "Erreur inconnue de l'API"));
            }
          } catch (error) {
            reject(new Error(`Erreur de parsing JSON: ${error.message}`));
          }
        });
      }).on("error", (error) => {
        reject(new Error(`Erreur de connexion: ${error.message}`));
      });
    });
  }

  transformMatches(apiMatches) {
    return apiMatches.map((match) => this.transformMatch(match));
  }

  transformMatch(apiMatch) {
    const odds = this.extractOdds(apiMatch.E);
    const status = this.extractStatus(apiMatch.SC);
    const score = this.extractScore(apiMatch.SC);
    const homeLogo = this.extractLogo(apiMatch.O1IMG, apiMatch.O1I);
    const awayLogo = this.extractLogo(apiMatch.O2IMG, apiMatch.O2I);

    return {
      id: String(apiMatch.I),
      team1: apiMatch.O1 || "Équipe 1",
      team2: apiMatch.O2 || "Équipe 2",
      league: apiMatch.L || "Compétition virtuelle",
      startTime: new Date(apiMatch.S * 1000).toISOString(),
      status: status,
      score: score,
      odds: odds,
      homeLogo: homeLogo,
      awayLogo: awayLogo,
      isLive: status === "en_cours" || status === "live",
      isFinished: status === "terminé" || status === "finished",
      isUpcoming: status === "a_venir" || status === "upcoming",
      statusText: apiMatch.SC?.SLS || "",
      period: apiMatch.SC?.CPS || "",
    };
  }

  extractOdds(events) {
    if (!events || !Array.isArray(events)) return { home: null, draw: null, away: null };

    const odds = { home: null, draw: null, away: null };
    
    for (const event of events) {
      if (event.T === 1) odds.home = event.C;
      if (event.T === 2) odds.draw = event.C;
      if (event.T === 3) odds.away = event.C;
    }

    return odds;
  }

  extractStatus(scoreContext) {
    if (!scoreContext) return "unknown";

    const cps = scoreContext.CPS || "";
    const sls = scoreContext.SLS || "";
    const cpsLower = cps.toLowerCase();
    const slsLower = sls.toLowerCase();

    // Match terminé
    if (cpsLower.includes("terminé") || cpsLower.includes("finished") || cpsLower.includes("end")) return "terminé";
    
    // Match en cours (mi-temps, minutes en cours)
    if (cpsLower.includes("mi-temps") || cpsLower.includes("1ère mi-temps") || cpsLower.includes("2ème mi-temps")) return "en_cours";
    if (cpsLower.includes("minutes") && !cpsLower.includes("début")) return "en_cours";
    
    // Match à venir (début dans X minutes, avant le début)
    if (slsLower.includes("début dans") || slsLower.includes("avant le début") || slsLower.includes("starting in")) return "a_venir";
    if (cpsLower.includes("début") && cpsLower.includes("avant")) return "a_venir";
    
    // Si pas de score mais un temps de début futur, c'est à venir
    if (!scoreContext.FS || !scoreContext.FS.S1 || scoreContext.FS.S1 === 0) {
      if (slsLower.includes("début") || slsLower.includes("avant")) return "a_venir";
    }

    // Par défaut, si on a un score, c'est en cours
    if (scoreContext.FS && (scoreContext.FS.S1 > 0 || scoreContext.FS.S2 > 0)) return "en_cours";

    return "unknown";
  }

  extractScore(scoreContext) {
    if (!scoreContext || !scoreContext.FS) return null;

    const fs = scoreContext.FS;
    const s1 = fs.S1 || 0;
    const s2 = fs.S2 || 0;

    return {
      home: s1,
      away: s2,
      total: s1 + s2,
    };
  }

  extractLogo(img, id) {
    const LOGO_CDN = "https://1xbet.com/sfiles/logo_teams";
    const file =
      Array.isArray(img) && img[0]
        ? img[0]
        : typeof id === "number" && id > 0
        ? `${id}.png`
        : null;
    if (!file) return null;
    const originalUrl = `${LOGO_CDN}/${file}`;
    return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
  }
}

module.exports = LiveFeedClient;
