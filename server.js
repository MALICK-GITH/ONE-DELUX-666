const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const config = require("./server/config");
const LiveFeedClient = require("./services/liveFeedClient");
const PredictionClient = require("./services/predictionClient");
const PenaltyClient = require("./services/penaltyClient");
const AIModelClient = require("./services/aiModelClient");

const REQUIRED_NODE_MAJOR = 18;
const REQUIRED_NODE_MINOR = 17;
const port = config.port;

const publicDir = path.join(__dirname, "public");
const liveFeedClient = new LiveFeedClient(config.liveFeedUrl);
const predictionClient = new PredictionClient(config.predictionApiUrl);
const penaltyClient = new PenaltyClient(config.penaltyApiUrl);
const aiModelClient = new AIModelClient(config.aiModelApiUrl, config.aiModelApiKey, config.aiModelName);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};


function assertNodeVersion() {
  const [majorString, minorString] = process.versions.node.split(".");
  const major = Number(majorString);
  const minor = Number(minorString);

  const isSupported =
    major > REQUIRED_NODE_MAJOR ||
    (major === REQUIRED_NODE_MAJOR && minor >= REQUIRED_NODE_MINOR);

  if (!isSupported) {
    console.error(
      `Node.js ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}+ est requis. Version actuelle: ${process.versions.node}.`
    );
    process.exit(1);
  }
}

assertNodeVersion();


function formatMatch(event) {
  // Informations de base du match
  const matchInfo = {
    id: event.I,
    league: event.L || event.LE || "Compétition virtuelle",
    leagueId: event.LI || null,
    sport: event.SN || "FIFA",
    sportId: event.SI || null,
    country: event.CN || event.CE || "Monde",
    team1: event.O1 || "Équipe 1",
    team2: event.O2 || "Équipe 2",
    team1English: event.O1E || event.O1 || "Équipe 1",
    team2English: event.O2E || event.O2 || "Équipe 2",
    startTime: event.S ? new Date(Number(event.S)).toISOString() : null,
    startTimeTimestamp: event.S || null,
    status: event.TN || "Unknown",
    periodName: event.TNS || null,
    totalMarkets: event.EC || 0,
  };

  // Score et informations de temps
  const scoreInfo = {
    currentScore: {
      home: event.SC?.FS?.S1 || 0,
      away: event.SC?.FS?.S2 || 0
    },
    elapsedTime: event.SC?.TS || null,
    timeRemaining: event.SC?.SLS || null,
    periodScores: event.SC?.PS || null,
    currentPeriod: event.SC?.CP || null,
    currentPeriodName: event.SC?.CPS || null,
  };

  // États du match
  const matchState = {
    notStarted: event.GNS === true,
    isActive: event.HS === 1,
    isLive: event.ICY === true,
    isHalftime: event.TN === "Mi-temps",
  };

  // Marchés et cotes
  const markets = Array.isArray(event.E) ? event.E : [];
  const odds = extractOdds(event);
  
  // Marchés avancés
  const advancedMarkets = {
    hasAdvanced: Array.isArray(event.AE) && event.AE.length > 0,
    advancedMarkets: Array.isArray(event.AE) ? event.AE : []
  };

  return {
    ...matchInfo,
    ...scoreInfo,
    ...matchState,
    markets,
    odds,
    advancedMarkets,
    raw: event
  };
}

function extractOdds(event) {
  const markets = Array.isArray(event.E) ? event.E : [];
  const odds = {
    home: null,
    draw: null,
    away: null,
    doubleChance: {
      homeDraw: null,
      drawAway: null,
      homeAway: null
    },
    totalGoals: {
      over: {},
      under: {}
    },
    btts: {
      yes: null,
      no: null
    }
  };

  // Types de paris FIFA
  const BET_TYPES = {
    1: 'home',
    2: 'away', 
    3: 'draw',
    4: 'homeDraw',
    5: 'drawAway',
    6: 'homeAway',
    7: 'handicapHome',
    8: 'handicapAway',
    9: 'over',
    10: 'under',
    11: 'teamOver',
    12: 'teamUnder',
    13: 'bttsYes',
    14: 'bttsNo'
  };

  // Groupes de marchés
  const MARKET_GROUPS = {
    1: 'matchResult',
    2: 'handicap',
    8: 'doubleChance',
    15: 'teamTotals',
    17: 'totalGoals',
    62: 'btts'
  };

  for (const market of markets) {
    const group = market.G;
    const type = market.T;
    const line = market.P;
    const price = market.C;

    // Résultat 1X2 (Groupe 1)
    if (group === 1) {
      if (type === 1) odds.home = Number(price);
      if (type === 2) odds.draw = Number(price);
      if (type === 3) odds.away = Number(price);
    }

    // Double chance (Groupe 8)
    if (group === 8) {
      if (type === 4) odds.doubleChance.homeDraw = Number(price);
      if (type === 5) odds.doubleChance.drawAway = Number(price);
      if (type === 6) odds.doubleChance.homeAway = Number(price);
    }

    // Total buts (Groupe 17)
    if (group === 17) {
      if (type === 9 && line) odds.totalGoals.over[line] = Number(price);
      if (type === 10 && line) odds.totalGoals.under[line] = Number(price);
    }

    // BTTS (Groupe 62)
    if (group === 62) {
      if (type === 13) odds.btts.yes = Number(price);
      if (type === 14) odds.btts.no = Number(price);
    }
  }

  // Marchés avancés (AE)
  if (Array.isArray(event.AE)) {
    for (const advancedGroup of event.AE) {
      const group = advancedGroup.G;
      const variants = Array.isArray(advancedGroup.ME) ? advancedGroup.ME : [];

      for (const variant of variants) {
        const type = variant.T;
        const line = variant.P;
        const price = variant.C;

        // Total buts avancés
        if (group === 17) {
          if (type === 9 && line && !odds.totalGoals.over[line]) {
            odds.totalGoals.over[line] = Number(price);
          }
          if (type === 10 && line && !odds.totalGoals.under[line]) {
            odds.totalGoals.under[line] = Number(price);
          }
        }
      }
    }
  }

  return odds;
}

async function handleMatches(req, res) {
  try {
    const matches = await liveFeedClient.fetchMatches();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      matches: matches,
      count: matches.length
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleMatchById(req, res, matchId) {
  try {
    const matches = await liveFeedClient.fetchMatches();
    const match = matches.find(m => m.id === matchId);
    
    if (!match) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: "Match non trouvé"
      }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      match: match
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération du match:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handlePrediction(req, res) {
  try {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { team_home, team_away, league, market_data } = JSON.parse(body);
        
        if (!team_home || !team_away || !league) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: false,
            error: "Paramètres manquants: team_home, team_away, league requis"
          }));
          return;
        }

        const prediction = await predictionClient.predictMatch(team_home, team_away, league, market_data);
        
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          prediction: prediction
        }));
      } catch (error) {
        console.error("Erreur lors de la prédiction:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handlePredictionHealth(req, res) {
  try {
    const health = await predictionClient.healthCheck();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      health: health
    }));
  } catch (error) {
    console.error("Erreur lors du health check:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleAiInsight(req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        if (!payload.teamHome || !payload.teamAway || !payload.league || !payload.prediction) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: false,
            error: "Paramètres manquants: teamHome, teamAway, league, prediction requis"
          }));
          return;
        }

        const insight = await aiModelClient.generateMatchInsight(payload);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          insight
        }));
      } catch (error) {
        console.error("Erreur lors de l'analyse IA:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  } catch (error) {
    console.error("Erreur de traitement IA:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleAiModels(req, res) {
  try {
    const models = await aiModelClient.listModels();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      defaultModel: config.aiModelName,
      models
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des modèles IA:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleAiAssistantChat(req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        const filters = payload.filters || {};
        const compareRequest = payload.compare || null;
        const userTime = payload.userTime || null;

        const matches = await liveFeedClient.fetchMatches();
        const filteredMatches = applyAssistantMatchFilters(matches, filters);
        const previewMatches = filteredMatches
          .slice(0, 12)
          .map((match) => ({
            id: match.id,
            team1: match.team1,
            team2: match.team2,
            league: match.league,
            status: match.status,
            startTime: match.startTime,
            odds: match.odds || {},
            confidence: deriveSystemConfidence(match),
            timing: deriveMatchTiming(match, userTime)
          }));

        const couponSeed = previewMatches.slice(0, 4).map((match) => ({
          matchId: match.id,
          teamHome: match.team1,
          teamAway: match.team2,
          pari: "1",
          cote: match.odds?.home || 1.5,
          confidence: deriveSystemConfidence(match)
        }));

        const compareMode = await buildCompareMode(compareRequest);

        const siteContext = {
          scope: "FURY_X_ONE_ONLY",
          creator: {
            name: "SOLITAIRE HACK",
            signature: "SOLITAIRE HACK ????",
            phones: ["+225 01 00 15 05 93", "+225 05 76 45 98 75"],
            telegram: "https://t.me/FURYXONE225P1",
            whatsapp: "https://chat.whatsapp.com/GK4Yf48KxUJL9raPNYSZ4M"
          },
          stats: {
            totalMatches: matches.length,
            filteredMatches: filteredMatches.length,
            imminentMatches: previewMatches.filter((match) => match.timing.phase === "imminent").length,
            liveMatches: previewMatches.filter((match) => match.timing.phase === "live").length,
            pages: ["/", "/coupon.html", "/match.html", "/creator.html"]
          },
          matches: previewMatches,
          coupon: {
            suggestion: couponSeed
          },
          compareMode,
          userTime: buildUserTimeContext(userTime),
          predictionSource: {
            endpoint: "/api/prediction",
            upstream: config.predictionApiUrl
          },
          quickActions: [
            "Analyser les matchs live",
            "Cr?er un coupon 3 matchs",
            "Me parler du cr?ateur",
            "Comparer deux matchs"
          ]
        };

        const answer = await aiModelClient.chatWithSiteAssistant({
          model: payload.model,
          messages,
          siteContext
        });

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          answer,
          siteContext
        }));
      } catch (error) {
        console.error("Erreur assistant IA site:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  } catch (error) {
    console.error("Erreur traitement assistant IA site:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

function applyAssistantMatchFilters(matches, filters) {
  const list = Array.isArray(matches) ? matches : [];
  const league = String(filters.league || "").trim().toLowerCase();
  const status = String(filters.status || "").trim().toLowerCase();
  const minOdd = Number(filters.minOdd);
  const maxOdd = Number(filters.maxOdd);
  const minConfidence = Number(filters.minConfidence);

  return list.filter((match) => {
    const confidence = deriveSystemConfidence(match);
    const odds = [match?.odds?.home, match?.odds?.draw, match?.odds?.away].map(Number).filter(Number.isFinite);
    const bestOdd = odds.length ? Math.min(...odds) : null;

    if (league && !String(match?.league || "").toLowerCase().includes(league)) return false;
    if (status && !String(match?.status || "").toLowerCase().includes(status)) return false;
    if (Number.isFinite(minConfidence) && confidence < minConfidence) return false;
    if (Number.isFinite(minOdd) && (!Number.isFinite(bestOdd) || bestOdd < minOdd)) return false;
    if (Number.isFinite(maxOdd) && Number.isFinite(bestOdd) && bestOdd > maxOdd) return false;
    return true;
  });
}

function deriveSystemConfidence(match) {
  const odds = [match?.odds?.home, match?.odds?.draw, match?.odds?.away].map(Number).filter(Number.isFinite);
  if (!odds.length) return 50;
  const minOdd = Math.min(...odds);
  return Math.max(45, Math.min(92, Math.round((1 / minOdd) * 100)));
}

function buildUserTimeContext(userTime) {
  const now = parseUserTime(userTime) || new Date();
  return {
    iso: now.toISOString(),
    locale: String(userTime?.locale || ""),
    timezone: String(userTime?.timeZone || ""),
    unixMs: now.getTime()
  };
}

function parseUserTime(userTime) {
  if (!userTime || !userTime.iso) return null;
  const date = new Date(userTime.iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deriveMatchTiming(match, userTime) {
  const now = parseUserTime(userTime) || new Date();
  const start = match?.startTime ? new Date(match.startTime) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { phase: "unknown", startsInMinutes: null };
  }

  const diffMinutes = Math.round((start.getTime() - now.getTime()) / 60000);
  const rawStatus = String(match?.status || "").toLowerCase();

  if (diffMinutes <= 0 && diffMinutes >= -35) {
    return { phase: "live", startsInMinutes: diffMinutes };
  }

  if (diffMinutes > 0 && diffMinutes <= 20) {
    return { phase: "imminent", startsInMinutes: diffMinutes };
  }

  if (diffMinutes < -35 || rawStatus.includes("term")) {
    return { phase: "passed", startsInMinutes: diffMinutes };
  }

  return { phase: "scheduled", startsInMinutes: diffMinutes };
}

async function buildCompareMode(compareRequest) {
  if (!compareRequest || !compareRequest.matchId) return null;

  try {
    const matches = await liveFeedClient.fetchMatches();
    const match = matches.find((item) => String(item.id) === String(compareRequest.matchId));
    if (!match) return null;

    const systemPrediction = await predictionClient.predictMatch(match.team1, match.team2, match.league, match.raw);
    return {
      match: {
        id: match.id,
        team1: match.team1,
        team2: match.team2,
        league: match.league
      },
      systemPrediction
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

async function handlePredictionFamilies(req, res) {
  try {
    const families = await predictionClient.getFamilies();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      families: families
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des familles:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handlePredictionLeagues(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const family = url.pathname.split("/").pop();
    
    if (!family) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: "Paramètre 'family' requis"
      }));
      return;
    }

    const leagues = await predictionClient.getLeagues(family);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      leagues: leagues
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des ligues:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handlePredictionModelInfo(req, res) {
  try {
    const info = await predictionClient.getModelInfo();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      info
    }));
  } catch (error) {
    console.error("Erreur model-info:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handlePredictionBatch(req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const matches = Array.isArray(payload.matches) ? payload.matches : [];
        const batch = await predictionClient.batchPredict(matches);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, batch }));
      } catch (error) {
        console.error("Erreur batch-predict:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  } catch (error) {
    console.error("Erreur traitement batch-predict:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handlePredictionTeamStats(req, res) {
  try {
    const team = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname.split("/").pop() || "");
    const stats = await predictionClient.getTeamStats(team);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, stats }));
  } catch (error) {
    console.error("Erreur team-stats:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handlePredictionLeagueStats(req, res) {
  try {
    const league = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname.split("/").pop() || "");
    const stats = await predictionClient.getLeagueStats(league);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: true, stats }));
  } catch (error) {
    console.error("Erreur league-stats:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleCoupon(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const size = parseInt(url.searchParams.get("size")) || 3;
    const risk = url.searchParams.get("risk") || "balanced";

    const matches = await liveFeedClient.fetchMatches();
    const upcomingMatches = matches.filter(m => m.status === "a_venir" || m.status === "upcoming");
    
    if (upcomingMatches.length < size) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: true,
        coupon: [],
        summary: { combinedOdd: 0, expectedReturn: 0 },
        meta: { risk, size }
      }));
      return;
    }

    const selectedMatches = upcomingMatches;
    const coupon = selectedMatches.map(m => ({
      matchId: m.id,
      teamHome: m.team1,
      teamAway: m.team2,
      pari: "1",
      cote: m.odds?.home || 1.5,
      confidence: 75
    }));

    const combinedOdd = coupon.reduce((acc, item) => acc * (item.cote || 1), 1);
    const expectedReturn = combinedOdd * 1000;

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      coupon: coupon,
      summary: {
        combinedOdd: combinedOdd,
        expectedReturn: expectedReturn
      },
      meta: { risk, size }
    }));
  } catch (error) {
    console.error("Erreur lors de la génération du coupon:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleCouponLadder(req, res) {
  try {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { size = 3, risk = "balanced", stake = 1000 } = JSON.parse(body);
        
        const matches = await liveFeedClient.fetchMatches();
        const upcomingMatches = matches.filter(m => m.status === "a_venir" || m.status === "upcoming");
        
        const ladder = {
          totalStake: stake,
          coupons: [
            {
              name: "TICKET 1",
              stake: stake,
              matches: upcomingMatches.map(m => ({
                homeTeam: m.team1,
                awayTeam: m.team2,
                odds: m.odds?.home || 1.5
              }))
            }
          ]
        };

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          ladder: ladder
        }));
      } catch (error) {
        console.error("Erreur lors de la génération du ladder:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleCouponMulti(req, res) {
  try {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { size = 3, risk = "balanced" } = JSON.parse(body);
        
        const matches = await liveFeedClient.fetchMatches();
        const upcomingMatches = matches.filter(m => m.status === "a_venir" || m.status === "upcoming");
        
        const strategies = [
          {
            name: "Stratégie 1",
            risk: risk,
            matches: upcomingMatches.map(m => ({
              homeTeam: m.team1,
              awayTeam: m.team2
            }))
          }
        ];

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          strategies: strategies
        }));
      } catch (error) {
        console.error("Erreur lors de la génération du multi:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleCouponValidate(req, res) {
  try {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const { selections = [], driftThresholdPercent = 6 } = JSON.parse(body);
        
        const summary = {
          ok: selections.length,
          toFix: 0,
          total: selections.length
        };

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          status: "VALID",
          summary: summary,
          issues: []
        }));
      } catch (error) {
        console.error("Erreur lors de la validation du coupon:", error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handlePenaltyMatches(req, res) {
  try {
    const matches = await penaltyClient.fetchPenaltyMatches();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      matches: matches,
      count: matches.length,
      sportType: "penalty"
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des matchs de penalty:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handlePenaltyMatchById(req, res, matchId) {
  try {
    const matches = await penaltyClient.fetchPenaltyMatches();
    const match = matches.find(m => m.id === matchId);
    
    if (!match) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: "Match de penalty non trouvé"
      }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      match: match
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération du match de penalty:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}



async function handleClearCache(req, res) {
  try {
    const result = await predictionClient.clearCache();
    
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      result: result
    }));
  } catch (error) {
    console.error("Erreur lors du nettoyage du cache:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handle888starzProxy(req, res, url) {
  try {
    // Extraire le chemin de l'endpoint 888starz
    const apiPath = url.pathname.replace("/api/888starz/", "");
    const baseUrl = "https://888starz.bet/service-api";
    const targetUrl = `${baseUrl}/${apiPath}`;
    
    // Paramètres par défaut obligatoires
    const defaultParams = {
      lng: "fr",
      gr: "789",
      country: "96",
      partner: "233"
    };
    
    // Fusionner les paramètres de la requête avec les paramètres par défaut
    const params = new URLSearchParams(url.search);
    for (const [key, value] of Object.entries(defaultParams)) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
    
    // Construire l'URL complète
    const fullUrl = `${targetUrl}?${params.toString()}`;
    
    // Headers requis par l'API 888starz
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      "Referer": "https://888starz.bet/fr/live/",
      "Origin": "https://888starz.bet"
    };
    
    // Faire la requête vers l'API 888starz
    const protocol = https;
    
    const proxyReq = protocol.request(fullUrl, {
      method: req.method,
      headers: headers
    }, (proxyRes) => {
      let data = "";
      
      proxyRes.on("data", (chunk) => {
        data += chunk;
      });
      
      proxyRes.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          });
          res.end(JSON.stringify(jsonData));
        } catch (error) {
          console.error("Erreur de parsing JSON:", error);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: false,
            error: "Erreur de parsing de la réponse"
          }));
        }
      });
    });
    
    proxyReq.on("error", (error) => {
      console.error("Erreur de proxy 888starz:", error);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    });
    
    proxyReq.end();
    
  } catch (error) {
    console.error("Erreur lors du proxy 888starz:", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}



function serveStaticFile(requestPath, res) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Accès refusé");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Fichier introuvable");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

async function handleImageProxy(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("URL manquante");
    return;
  }

  try {
    const protocol = imageUrl.startsWith("https") ? https : http;
    
    protocol.get(imageUrl, (proxyRes) => {
      const contentType = proxyRes.headers["content-type"] || "image/png";
      
      res.writeHead(200, {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, max-age=3600"
      });

      proxyRes.pipe(res);
    }).on("error", (error) => {
      console.error("Erreur de proxy d'image:", error);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Erreur de récupération de l'image");
    });
  } catch (error) {
    console.error("Erreur de proxy d'image:", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Erreur de récupération de l'image");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // API endpoints
  if (url.pathname === "/api/matches") {
    await handleMatches(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/matches/")) {
    const matchId = url.pathname.split("/")[3];
    await handleMatchById(req, res, matchId);
    return;
  }

  if (url.pathname === "/api/prediction") {
    await handlePrediction(req, res);
    return;
  }

  if (url.pathname === "/api/prediction/health") {
    await handlePredictionHealth(req, res);
    return;
  }

  if (url.pathname === "/api/prediction/insight") {
    await handleAiInsight(req, res);
    return;
  }

  if (url.pathname === "/api/prediction/models") {
    await handleAiModels(req, res);
    return;
  }

  if (url.pathname === "/api/assistant/chat") {
    await handleAiAssistantChat(req, res);
    return;
  }

  if (url.pathname === "/api/prediction/families") {
    await handlePredictionFamilies(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/prediction/leagues/")) {
    await handlePredictionLeagues(req, res);
    return;
  }

  if (url.pathname === "/api/prediction/model-info") {
    await handlePredictionModelInfo(req, res);
    return;
  }

  if (url.pathname === "/api/prediction/batch") {
    await handlePredictionBatch(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/prediction/team-stats/")) {
    await handlePredictionTeamStats(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/prediction/league-stats/")) {
    await handlePredictionLeagueStats(req, res);
    return;
  }

  if (url.pathname === "/api/coupon") {
    await handleCoupon(req, res);
    return;
  }

  if (url.pathname === "/api/coupon/ladder") {
    await handleCouponLadder(req, res);
    return;
  }

  if (url.pathname === "/api/coupon/multi") {
    await handleCouponMulti(req, res);
    return;
  }

  if (url.pathname === "/api/coupon/validate") {
    await handleCouponValidate(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/proxy/image")) {
    await handleImageProxy(req, res);
    return;
  }

  if (url.pathname === "/api/penalties") {
    await handlePenaltyMatches(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/penalties/")) {
    const matchId = url.pathname.split("/")[3];
    await handlePenaltyMatchById(req, res, matchId);
    return;
  }


  if (url.pathname === "/api/prediction/clear-cache") {
    await handleClearCache(req, res);
    return;
  }

  // 888starz API proxy endpoints
  if (url.pathname.startsWith("/api/888starz/")) {
    await handle888starzProxy(req, res, url);
    return;
  }

  // Fallback pour les fichiers statiques
  serveStaticFile(url.pathname, res);
});

server.listen(port, () => {
  console.log(`FURY X ONE 👿 disponible sur http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt du serveur...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT reçu, arrêt du serveur...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});
