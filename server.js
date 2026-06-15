const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const config = require("./server/config");
const LiveFeedClient = require("./services/liveFeedClient");
const PredictionClient = require("./services/predictionClient");
const PenaltyClient = require("./services/penaltyClient");

const REQUIRED_NODE_MAJOR = 18;
const REQUIRED_NODE_MINOR = 17;
const port = config.port;

const publicDir = path.join(__dirname, "public");
const liveFeedClient = new LiveFeedClient(config.liveFeedUrl);
const predictionClient = new PredictionClient(config.predictionApiUrl);
const penaltyClient = new PenaltyClient(config.penaltyApiUrl);

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
      if (type === 2) odds.away = Number(price);
      if (type === 3) odds.draw = Number(price);
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
        const { team_home, team_away, league } = JSON.parse(body);
        
        if (!team_home || !team_away || !league) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            success: false,
            error: "Paramètres manquants: team_home, team_away, league requis"
          }));
          return;
        }

        const prediction = await predictionClient.predictMatch(team_home, team_away, league);
        
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

  if (url.pathname === "/api/prediction/families") {
    await handlePredictionFamilies(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/prediction/leagues/")) {
    await handlePredictionLeagues(req, res);
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