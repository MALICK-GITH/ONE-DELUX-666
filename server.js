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
  return {
    id: event.I,
    league: event.L || event.LE || "Compétition virtuelle",
    sport: event.SN || "FIFA",
    country: event.CN || event.CE || "Monde",
    team1: event.O1 || "Équipe 1",
    team2: event.O2 || "Équipe 2",
    team1Code: event.O1E || event.O1 || "Équipe 1",
    team2Code: event.O2E || event.O2 || "Équipe 2",
    startTime: event.S || null,
    status: event.ST || "Unknown",
    currentScore: {
      home: event.SC?.F?.[0] || 0,
      away: event.SC?.F?.[1] || 0
    },
    markets: Array.isArray(event.E) ? event.E : [],
    odds: extractOdds(event),
    raw: event
  };
}

function extractOdds(event) {
  const markets = Array.isArray(event.E) ? event.E : [];
  for (const market of markets) {
    if (market.T !== 1) continue;
    const odds = {};
    for (const outcome of market.O || []) {
      if (outcome.T === 1) odds.home = Number(outcome.C);
      if (outcome.T === 2) odds.draw = Number(outcome.C);
      if (outcome.T === 3) odds.away = Number(outcome.C);
    }
    if (Object.keys(odds).length === 3) return odds;
  }
  return { home: null, draw: null, away: null };
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