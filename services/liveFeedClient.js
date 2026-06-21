const https = require("https");
const http = require("http");
const zlib = require("zlib");

class LiveFeedClient {
  constructor(url) {
    this.url = url;
    this.defaultParams = {
      sports: "85",
      lng: "fr",
      gr: "789",
      mode: "4",
      country: "96",
      partner: "233",
      getEmpty: "true",
      virtualSports: "true",
      noFilterBlockEvent: "true",
    };
    this.defaultHeaders = {
      "authority": "livefeedsht-vmp.onrender.com",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua": "\"Chromium\";v=\"139\", \"Not;A=Brand\";v=\"99\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "referer": "https://livefeedsht-vmp.onrender.com/live-feed",
      "origin": "https://livefeedsht-vmp.onrender.com",
      "cache-control": "max-age=0",
      "accept-encoding": "gzip, deflate, br",
    };
  }

  async fetchMatches(params = {}) {
    const requestedCount = Number(params.count || 40);
    const safeCount = Number.isFinite(requestedCount) ? Math.min(Math.max(requestedCount, 1), 120) : 40;
    const queryParams = { ...this.defaultParams, ...params, count: String(safeCount) };
    const queryString = new URLSearchParams();
    queryString.set("sports", String(queryParams.sports || "85"));
    queryString.set("count", String(safeCount));
    queryString.set("lng", String(queryParams.lng || "fr"));
    queryString.set("gr", String(queryParams.gr || "789"));
    queryString.set("mode", String(queryParams.mode || "4"));
    queryString.set("country", String(queryParams.country || "96"));
    queryString.set("partner", String(queryParams.partner || "233"));
    queryString.set("getEmpty", String(queryParams.getEmpty || "true"));
    queryString.set("virtualSports", String(queryParams.virtualSports || "true"));
    queryString.set("noFilterBlockEvent", String(queryParams.noFilterBlockEvent || "true"));

    for (const [key, value] of Object.entries(queryParams)) {
      if (!queryString.has(key) && value !== undefined && value !== null && value !== "") {
        queryString.set(key, String(value));
      }
    }
    const fullUrl = `${this.url}?${queryString.toString()}`;
    const protocol = this.url.startsWith("https") ? https : http;

    return new Promise((resolve, reject) => {
      const request = protocol.get(fullUrl, { headers: this.defaultHeaders }, (res) => {
        const chunks = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          this.parseResponseBody(res, Buffer.concat(chunks))
            .then((body) => {
              try {
                const json = JSON.parse(body);
                if (!json.Success || !Array.isArray(json.Value)) {
                  reject(new Error(json.Error || `Réponse live feed invalide (${res.statusCode || "sans statut"})`));
                  return;
                }
                resolve(this.transformMatches(json.Value));
              } catch (error) {
                reject(new Error(`Erreur de parsing JSON: ${error.message}`));
              }
            })
            .catch((error) => reject(error));
        });
      });

      request.setTimeout(20000, () => {
        request.destroy(new Error("Timeout live feed après 20s"));
      });

      request.on("error", (error) => {
        reject(new Error(`Erreur de connexion live feed: ${error.message}`));
      });
    });
  }

  parseResponseBody(res, buffer) {
    const encoding = String(res.headers["content-encoding"] || "").toLowerCase();

    return new Promise((resolve, reject) => {
      const finish = (error, output) => {
        if (error) {
          reject(new Error(`Erreur de décompression: ${error.message}`));
          return;
        }
        resolve(output.toString("utf8"));
      };

      if (encoding.includes("br")) {
        zlib.brotliDecompress(buffer, finish);
        return;
      }

      if (encoding.includes("gzip")) {
        zlib.gunzip(buffer, finish);
        return;
      }

      if (encoding.includes("deflate")) {
        zlib.inflate(buffer, finish);
        return;
      }

      resolve(buffer.toString("utf8"));
    });
  }

  transformMatches(apiMatches) {
    return apiMatches.map((match) => this.transformMatch(match));
  }

  transformMatch(apiMatch) {
    const status = this.extractStatus(apiMatch);
    const score = this.extractScore(apiMatch.SC);
    const liveClock = this.extractLiveClock(apiMatch.SC);

    return {
      id: String(apiMatch.I),
      team1: apiMatch.O1 || "Équipe 1",
      team2: apiMatch.O2 || "Équipe 2",
      league: apiMatch.L || apiMatch.LE || "Compétition virtuelle",
      leagueId: apiMatch.LI || null,
      sport: apiMatch.SN || "FIFA Virtuel",
      sportId: apiMatch.SI || null,
      country: apiMatch.CN || apiMatch.CE || "Monde",
      startTime: this.normalizeStartTime(apiMatch.S),
      startTimeTimestamp: apiMatch.S || null,
      status,
      score,
      odds: this.extractOdds(apiMatch.E, apiMatch.AE),
      totals: this.extractTotals(apiMatch.E, apiMatch.AE),
      handicaps: this.extractHandicaps(apiMatch.E, apiMatch.AE),
      homeLogo: this.extractLogo(apiMatch.O1IMG, apiMatch.O1I),
      awayLogo: this.extractLogo(apiMatch.O2IMG, apiMatch.O2I),
      leagueLogo: apiMatch.CHIMG ? `/api/proxy/image?url=${encodeURIComponent(`https://1xbet.com/sfiles/logo_leagues/${apiMatch.CHIMG}`)}` : null,
      isLive: status === "en_cours",
      isFinished: status === "termine",
      isUpcoming: status === "a_venir",
      statusText: apiMatch.SC?.SLS || apiMatch.TN || "",
      period: apiMatch.SC?.CPS || apiMatch.TNS || "",
      liveTime: liveClock.time,
      liveSeconds: liveClock.seconds,
      currentPeriod: apiMatch.SC?.CP || null,
      currentPeriodName: apiMatch.SC?.CPS || null,
      totalMarkets: apiMatch.EC || 0,
      markets: Array.isArray(apiMatch.E) ? apiMatch.E : [],
      advancedMarkets: Array.isArray(apiMatch.AE) ? apiMatch.AE : [],
      raw: apiMatch,
    };
  }

  normalizeStartTime(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const timestamp = numeric > 1e12 ? numeric : numeric * 1000;
    return new Date(timestamp).toISOString();
  }

  extractOdds(events, advancedEvents) {
    const odds = {
      home: null,
      draw: null,
      away: null,
      doubleChance: {
        homeDraw: null,
        drawAway: null,
        homeAway: null,
      },
      totalGoals: {
        over: {},
        under: {},
      },
      btts: {
        yes: null,
        no: null,
      },
    };

    const applyMarket = (market, groupOverride) => {
      if (!market) return;
      const group = Number(groupOverride ?? market.G);
      const type = Number(market.T);
      const line = market.P;
      const price = Number(market.C);

      if (!Number.isFinite(price)) return;

      if (group === 1) {
        if (type === 1) odds.home = price;
        if (type === 2) odds.draw = price;
        if (type === 3) odds.away = price;
      }

      if (group === 8) {
        if (type === 4) odds.doubleChance.homeDraw = price;
        if (type === 5) odds.doubleChance.drawAway = price;
        if (type === 6) odds.doubleChance.homeAway = price;
      }

      if (group === 17 && line !== undefined && line !== null && line !== "") {
        if (type === 9) odds.totalGoals.over[String(line)] = price;
        if (type === 10) odds.totalGoals.under[String(line)] = price;
      }

      if (group === 62 || group === 199) {
        if (type === 13 || type === 180) odds.btts.yes = price;
        if (type === 14 || type === 181) odds.btts.no = price;
      }
    };

    (Array.isArray(events) ? events : []).forEach((market) => applyMarket(market));

    (Array.isArray(advancedEvents) ? advancedEvents : []).forEach((groupItem) => {
      const group = groupItem?.G;
      const variants = Array.isArray(groupItem?.ME) ? groupItem.ME : [];
      variants.forEach((variant) => applyMarket(variant, group));
    });

    return odds;
  }

  extractTotals(events, advancedEvents) {
    const totalsByLine = new Map();
    this.flattenMarkets(events, advancedEvents).forEach((market) => {
      if (Number(market.G) !== 17 || market.P === undefined || market.P === null || market.P === "") return;
      const line = Number(market.P);
      const price = Number(market.C);
      if (!Number.isFinite(line) || !Number.isFinite(price)) return;
      const row = totalsByLine.get(line) || {};
      if (Number(market.T) === 9) row.over = price;
      if (Number(market.T) === 10) row.under = price;
      totalsByLine.set(line, row);
    });

    return [...totalsByLine.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([line, value]) => ({ line, ...value }));
  }

  extractHandicaps(events, advancedEvents) {
    const handicapsByLine = new Map();
    this.flattenMarkets(events, advancedEvents).forEach((market) => {
      if (Number(market.G) !== 2 || market.P === undefined || market.P === null || market.P === "") return;
      const handicap = Number(market.P);
      const price = Number(market.C);
      if (!Number.isFinite(handicap) || !Number.isFinite(price)) return;
      const row = handicapsByLine.get(handicap) || {};
      if (Number(market.T) === 7) row.home = price;
      if (Number(market.T) === 8) row.away = price;
      handicapsByLine.set(handicap, row);
    });

    return [...handicapsByLine.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([handicap, value]) => ({ handicap, ...value }));
  }

  flattenMarkets(events, advancedEvents) {
    const flat = [];
    (Array.isArray(events) ? events : []).forEach((market) => flat.push(market));
    (Array.isArray(advancedEvents) ? advancedEvents : []).forEach((groupItem) => {
      (Array.isArray(groupItem?.ME) ? groupItem.ME : []).forEach((market) => {
        flat.push({ ...market, G: groupItem?.G ?? market.G });
      });
    });
    return flat;
  }

  extractStatus(apiMatch) {
    const tn = String(apiMatch?.TN || "").toLowerCase();
    const sls = String(apiMatch?.SC?.SLS || "").toLowerCase();
    const cps = String(apiMatch?.SC?.CPS || "").toLowerCase();
    const score = apiMatch?.SC?.FS || {};
    const startTimestamp = this.toUnixSeconds(apiMatch?.S);
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const hasStartedByClock = Number.isFinite(startTimestamp) ? startTimestamp <= nowTimestamp : false;
    const hasScore = Number(score?.S1 || 0) > 0 || Number(score?.S2 || 0) > 0;
    const beforeStartText =
      sls.includes("d?but") ||
      sls.includes("debut") ||
      sls.includes("avant") ||
      sls.includes("starting") ||
      cps.includes("d?but") ||
      cps.includes("debut") ||
      cps.includes("avant");

    if (apiMatch?.GNS === true || beforeStartText || (!hasStartedByClock && !hasScore)) return "a_venir";
    if (tn.includes("fin") || tn.includes("finished") || cps.includes("termin") || cps.includes("end") || cps.includes("jeu termin")) return "termine";
    if (hasScore && hasStartedByClock) return "en_cours";
    if (tn.includes("mi-temps") || tn.includes("live") || cps.includes("mi-temps") || cps.includes("1?re mi-temps") || cps.includes("1ere mi-temps") || cps.includes("2?me mi-temps") || cps.includes("2eme mi-temps")) return "en_cours";
    if (apiMatch?.ICY === true && hasStartedByClock) return "en_cours";
    if (apiMatch?.HS === 1 && hasStartedByClock) return "en_cours";
    return "unknown";
  }

  toUnixSeconds(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric > 1e12 ? Math.floor(numeric / 1000) : numeric;
  }

  extractLiveClock(scoreContext) {
    const seconds = Number(scoreContext?.TS || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return { seconds: 0, time: "" };
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return {
      seconds,
      time: `${minutes}'${String(remainingSeconds).padStart(2, "0")}`,
    };
  }

  extractScore(scoreContext) {
    if (!scoreContext?.FS) return null;
    const home = Number(scoreContext.FS.S1 || 0);
    const away = Number(scoreContext.FS.S2 || 0);
    return {
      home,
      away,
      total: home + away,
    };
  }

  extractLogo(img, id) {
    const logoCdn = "https://1xbet.com/sfiles/logo_teams";
    const file =
      Array.isArray(img) && img[0]
        ? img[0]
        : typeof id === "number" && id > 0
          ? `${id}.png`
          : null;

    if (!file) return null;

    return `/api/proxy/image?url=${encodeURIComponent(`${logoCdn}/${file}`)}`;
  }
}

module.exports = LiveFeedClient;
