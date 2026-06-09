const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  predictFromTrainedModel,
  getTrainedModelInfo,
} = require("./services/trainedModelPredictor");
const VisualGenerator = require("./services/visualGenerator");
const { fetchLiveFeedEvents } = require("./services/liveFeedClient");
const config = require("./server/config");

const REQUIRED_NODE_MAJOR = 18;
const REQUIRED_NODE_MINOR = 17;
const port = config.port;

const publicDir = path.join(__dirname, "public");

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

// Initialize Visual Generator for premium image generation
const visualGenerator = new VisualGenerator();

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

async function fetchMatches() {
  try {
    const events = await fetchLiveFeedEvents();
    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error(`[Server] Error fetching matches: ${error.message}`);
    return [];
  }
}

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
    const events = await fetchLiveFeedEvents();
    const matches = events.map(formatMatch);

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      updatedAt: new Date().toISOString(),
      count: matches.length,
      matches
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de charger les matchs",
      details: error.message
    }));
  }
}

async function handleMatchById(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const matchId = url.pathname.split("/").pop();
    
    const events = await fetchLiveFeedEvents();
    const match = events.find((item) => String(item.I) === String(matchId));

    if (!match) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: "Match introuvable"
      }));
      return;
    }

    const formattedMatch = formatMatch(match);

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      match: formattedMatch
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de charger le match",
      details: error.message
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // API endpoints pour les matchs
  if (url.pathname === "/api/matches") {
    await handleMatches(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/matches/")) {
    const matchId = url.pathname.split("/").pop();
    await handleMatchById(req, res);
    return;
  }

  // Fallback pour les fichiers statiques
  serveStaticFile(url.pathname, res);
});

server.listen(port, () => {
  console.log(`RUST SIT XPR disponible sur http://localhost:${port}`);
  console.log("[System] API Live Feed 888starz.bet activée");
  console.log("[System] Endpoints disponibles: /api/matches, /api/matches/{id}");
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