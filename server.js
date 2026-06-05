const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const {
  extractTelegramParams,
  buildTelegramLadderText,
  buildTelegramCouponText,
  buildTelegramMultiText,
  buildTelegramValidationText,
  formatCouponItem,
} = require("./services/couponManager");
const {
  predictFromTrainedModel,
  getTrainedModelInfo,
} = require("./services/trainedModelPredictor");
const VisualGenerator = require("./services/visualGenerator");
const { fetchLiveFeedEvents } = require("./services/liveFeedClient");
// const {
//   buildMatchImageSvg,
//   buildCouponImageSvg
// } = require("./services/svgBuilder");
const {
  getMatchStatus,
  extractMatchScore,
  classifyMatchByStatus
} = require("./services/matchStatus");
const CronLearningService = require("./services/cronLearningService");
const config = require("./server/config");
const {
  sanitizeCouponRequest,
  sanitizePredictionRequest,
} = require("./server/utils/validation");

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

// Session state for coupon management
const sessionState = new Map();

// Initialize Visual Generator for premium image generation
const visualGenerator = new VisualGenerator();

// Initialize Cron Learning Service for automatic match collection
console.log(`[System] Initialisation CronLearningService avec URL: ${config.finishedMatchesStoreUrl ? 'Configurée' : 'Non configurée'}`);
if (config.finishedMatchesStoreUrl) {
  console.log(`[System] Base de données configurée: ${config.finishedMatchesStoreUrl.substring(0, 20)}...`);
}
const cronLearningService = new CronLearningService({
  interval: config.cronLearningIntervalMs,
  databaseUrl: config.finishedMatchesStoreUrl,
});

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

function toOddNumber(value) {
  const odd = Number(value);
  return Number.isFinite(odd) && odd > 0 ? odd : null;
}

function buildOutcomeLabel(outcome, homeTeam, awayTeam) {
  if (outcome === "home") return `Victoire ${homeTeam}`;
  if (outcome === "away") return `Victoire ${awayTeam}`;
  if (outcome === "draw") return "Match nul";
  return "Analyse indisponible";
}

function buildAiPrediction(match) {
  const trained = predictFromTrainedModel({
    league: match.league,
    teamHome: match.team1,
    teamAway: match.team2,
  });

  if (!trained.available) {
    return {
      available: false,
      label: "Modèle indisponible",
      confidence: null,
      recommendation: null,
      source: trained.reason || "unavailable",
      modelVersion: null,
      exactScore: null,
    };
  }

  const recommendation = trained.recommendation || null;
  const odd = match?.odds && recommendation ? match.odds[recommendation] ?? null : null;

  return {
    available: true,
    label: buildOutcomeLabel(recommendation, match.team1, match.team2),
    recommendation,
    odd: odd != null ? Number(odd).toFixed(2) : null,
    confidence: trained.confidence ?? null,
    modelVersion: trained.modelVersion || null,
    modelFile: trained.modelFile || null,
    reportFile: trained.reportFile || null,
    modelScope: trained.modelScope || null,
    exactScore: trained.exactScore || null,
    distribution: trained.distribution || null,
    coverage: trained.coverage || null,
    trainedAt: trained.trainedAt || null,
    trainSize: trained.trainSize ?? null,
    validSize: trained.validSize ?? null,
    metrics: trained.metrics || null,
    source: trained.source || "trained-finished-matches-model",
  };
}

function buildAdvancedPrediction(match, ai = null) {
  const modelPrediction = ai || buildAiPrediction(match);
  return {
    available: Boolean(modelPrediction.available),
    label: modelPrediction.label,
    recommendation: modelPrediction.recommendation,
    confidence: modelPrediction.confidence,
    modelVersion: modelPrediction.modelVersion,
    modelFile: modelPrediction.modelFile,
    reportFile: modelPrediction.reportFile,
    modelScope: modelPrediction.modelScope,
    exactScore: modelPrediction.exactScore,
    distribution: modelPrediction.distribution,
    coverage: modelPrediction.coverage,
    trainedAt: modelPrediction.trainedAt,
    trainSize: modelPrediction.trainSize,
    validSize: modelPrediction.validSize,
    metrics: modelPrediction.metrics,
    source: modelPrediction.source,
    ai: modelPrediction,
  };
}

function buildSystemSnapshot() {
  const memory = process.memoryUsage();
  const trainedModel = getTrainedModelInfo();
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    uptimeSeconds: Math.round(process.uptime()),
    pid: process.pid,
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
    services: {
      matches: true,
      coupon: true,
      aiPrediction: true,
      advancedPrediction: true,
    },
    signature: config.appSignature,
    model: trainedModel,
    timestamp: new Date().toISOString(),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload trop volumineux"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON invalide"));
      }
    });
    req.on("error", reject);
  });
}

function resolvePredictionMatch(input = {}) {
  const fallback = {
    id: input.matchId || input.id || null,
    league: input.league || "Compétition virtuelle",
    team1: input.teamHome || input.homeTeam || "Équipe 1",
    team2: input.teamAway || input.awayTeam || "Équipe 2",
    odds: {
      home: toOddNumber(input.homeOdd),
      draw: toOddNumber(input.drawOdd),
      away: toOddNumber(input.awayOdd),
    },
    primaryPrediction: {
      label: input.label || null,
      confidence: Number(input.confidence || 0) || null,
      model: input.model || null,
    },
  };

  return fallback;
}

async function fetchMatches() {
  const events = await fetchLiveFeedEvents();
  return events.map(formatMatch);
}

// Cron Learning Service Authentication Functions
function isAuthorizedCronRequest(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = url.searchParams.get('key');
    const cronSecret = config.cronSecret || process.env.CRON_SECRET || "default-secret";
    return key === cronSecret;
  } catch (error) {
    console.error("[Cron Auth] Erreur d'authentification:", error.message);
    return false;
  }
}

function rejectCronUnauthorized(res) {
  res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({
    success: false,
    error: "Unauthorized",
    message: "Clé secrète invalide ou manquante"
  }));
}

function pickMainPrediction(event) {
  const prediction = predictFromTrainedModel({
    league: event.L || event.LE || "Compétition virtuelle",
    teamHome: event.O1 || "Équipe 1",
    teamAway: event.O2 || "Équipe 2",
  });

  if (!prediction.available) {
    return {
      label: "Modèle indisponible",
      odd: null,
      source: prediction.reason || "unavailable",
      model: "Modèle entraîné",
      confidence: null,
      recommendation: null,
      exactScore: null,
      distribution: null,
      modelVersion: null,
    };
  }

  return {
    label: buildOutcomeLabel(prediction.recommendation, event.O1 || "Équipe 1", event.O2 || "Équipe 2"),
    odd: prediction.odd || null,
    source: prediction.source || "trained-finished-matches-model",
    model: `Modèle entraîné${prediction.modelVersion ? ` v${prediction.modelVersion}` : ""}`,
    confidence: prediction.confidence ?? null,
    recommendation: prediction.recommendation || null,
    exactScore: prediction.exactScore || null,
    distribution: prediction.distribution || null,
    modelVersion: prediction.modelVersion || null,
    modelFile: prediction.modelFile || null,
    reportFile: prediction.reportFile || null,
    metrics: prediction.metrics || null,
    available: true,
  };
}

function formatMatch(event) {
  const markets = Array.isArray(event.E) ? event.E : [];
  const additionalEvents = Array.isArray(event.AE) ? event.AE : [];

  // Utiliser le service commun de statut pour éviter les divergences entre pages et API
  const statusInfo = getMatchStatus(event);
  const scoreInfo = extractMatchScore(event);

  const currentScore = scoreInfo.currentScore;
  const periodScores = Array.isArray(scoreInfo.periodScores) ? scoreInfo.periodScores : [];
  const currentPeriod = scoreInfo.currentPeriod || null;
  const currentPeriodString = scoreInfo.currentPeriodString || event.TN || event.TNS || "Match";
  const timeSeconds = scoreInfo.timeSeconds || 0;
  const statusDisplay = scoreInfo.statusDisplay || event.TI || "Disponible";
  const normalizedStatus = statusInfo.normalized;
  const isLive = statusInfo.status === "live";
  const isFinished = statusInfo.status === "finished";
  const isScheduled = statusInfo.status === "upcoming";

  const match = {
    id: event.I,
    league: event.L || event.LE || "Compétition virtuelle",
    sport: event.SN || "FIFA",
    country: event.CN || event.CE || "Monde",
    team1: event.O1 || "Équipe 1",
    team2: event.O2 || "Équipe 2",
    team1Code: event.O1E || event.O1 || "Équipe 1",
    team2Code: event.O2E || event.O2 || "Équipe 2",
    startTime: event.S || null,
    status: statusInfo.label || statusDisplay,
    statusText: statusDisplay,
    normalizedStatus,
    statusNormalized: normalizedStatus,
    period: currentPeriodString,
    currentPeriod: currentPeriod,
    timeSeconds: timeSeconds,
    isLive: isLive,
    isFinished: isFinished,
    isScheduled: isScheduled,
    score: isLive || isFinished ? currentScore : null,
    periodScores: periodScores,
    totalMarkets: event.EC || markets.length,
    odds: {
      home: markets.find((item) => item.T === 1)?.CV || null,
      draw: markets.find((item) => item.T === 2)?.CV || null,
      away: markets.find((item) => item.T === 3)?.CV || null
    },
    primaryPrediction: null,
    details: {
      over: markets.find((item) => item.T === 9)
        ? {
          line: markets.find((item) => item.T === 9).P,
          odd: markets.find((item) => item.T === 9).CV
        }
        : null,
      under: markets.find((item) => item.T === 10)
        ? {
          line: markets.find((item) => item.T === 10).P,
          odd: markets.find((item) => item.T === 10).CV
        }
        : null
    },
    additionalMarkets: additionalEvents.length > 0 ? additionalEvents : null
  };

  const aiPrediction = buildAiPrediction(match);

  return {
    ...match,
    primaryPrediction: aiPrediction,
    aiPrediction,
    advancedPrediction: buildAdvancedPrediction(match, aiPrediction)
  };
}

async function handleMatches(res) {
  try {
    const matches = await fetchMatches();

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      updatedAt: new Date().toISOString(),
      count: matches.length,
      matches
    }));
  } catch (error) {
    res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de charger les matchs",
      details: error.message
    }));
  }
}

async function handleUpcomingMatches(res) {
  try {
    const matches = await fetchMatches();
    // Utiliser le nouveau système ONE-DELUX pour filtrer les matchs à venir
    const upcoming = matches.filter(m => m.normalizedStatus === "a_venir");

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      updatedAt: new Date().toISOString(),
      count: upcoming.length,
      matches: upcoming
    }));
  } catch (error) {
    res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de charger les matchs à venir",
      details: error.message
    }));
  }
}

async function handleLiveMatches(res) {
  try {
    const matches = await fetchMatches();
    // Utiliser le nouveau système ONE-DELUX pour filtrer les matchs en cours
    const live = matches.filter(m => m.normalizedStatus === "en_cours");

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      updatedAt: new Date().toISOString(),
      count: live.length,
      matches: live
    }));
  } catch (error) {
    res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de charger les matchs en cours",
      details: error.message
    }));
  }
}

// async function syncFinishedMatches() {
//   try {
//     const matches = await fetchMatches();
//     const finished = matches.filter(m => m.isFinished);
//     const finishedMatchesPath = path.join(__dirname, "data", "finished-matches.csv");
// 
//     // Lire les matchs existants du CSV
//     const existingMatchIds = new Set();
//     if (fs.existsSync(finishedMatchesPath)) {
//       const content = fs.readFileSync(finishedMatchesPath, "utf8");
//       const lines = content.split("\n").filter(line => line.trim());
//       for (let i = 1; i < lines.length; i++) {
//         const cols = lines[i].split(",");
//         if (cols.length > 0) {
//           existingMatchIds.add(cols[0].replace(/"/g, ""));
//         }
//       }
//     }
// 
//     // Filtrer les nouveaux matchs terminés
//     const newFinishedMatches = finished.filter(m => !existingMatchIds.has(`match-${m.id}`));
// 
//     if (newFinishedMatches.length > 0) {
//       // Créer le répertoire si nécessaire
//       const dir = path.dirname(finishedMatchesPath);
//       if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//       }
// 
//       // Générer les lignes CSV
//       const header = "match_id,team_home,team_away,league,score_home,score_away,finished_at";
//       const rows = newFinishedMatches.map(m => {
//         const matchId = `match-${m.id}`;
//         const scoreHome = m.score?.home !== undefined ? m.score.home : "";
//         const scoreAway = m.score?.away !== undefined ? m.score.away : "";
//         return [
//           `"${matchId}"`,
//           `"${m.team1}"`,
//           `"${m.team2}"`,
//           `"${m.league}"`,
//           `"${scoreHome}"`,
//           `"${scoreAway}"`,
//           `"${new Date().toISOString()}"`
//         ].join(",");
//       });
// 
//       // Ajouter au fichier existant
//       let content;
//       if (fs.existsSync(finishedMatchesPath)) {
//         const existing = fs.readFileSync(finishedMatchesPath, "utf8");
//         const existingLines = existing.split("\n").filter(line => line.trim());
//         if (existingLines.length > 0) {
//           content = [header, ...existingLines.slice(1), ...rows].join("\n");
//         } else {
//           content = [header, ...rows].join("\n");
//         }
//       } else {
//         content = [header, ...rows].join("\n");
//       }
// 
//       fs.writeFileSync(finishedMatchesPath, content, "utf8");
//       console.log(`[SYNC] ${newFinishedMatches.length} nouveaux matchs terminés synchronisés`);
//       return { success: true, newCount: newFinishedMatches.length };
//     }
// 
//     return { success: true, newCount: 0 };
//   } catch (error) {
//     console.error(`[SYNC] Erreur de synchronisation: ${error.message}`);
//     return { success: false, error: error.message };
//   }
// }

async function handleFinishedMatches(res) {
  try {
    const matches = await fetchMatches();
    // Utiliser le nouveau système ONE-DELUX pour filtrer les matchs terminés
    const finished = matches.filter(m => m.normalizedStatus === "terminé");

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      updatedAt: new Date().toISOString(),
      count: finished.length,
      matches: finished
    }));
  } catch (error) {
    res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de charger les matchs terminés",
      details: error.message
    }));
  }
}

async function handleMatchById(matchId, res) {
  try {
    const matches = await fetchMatches();
    const match = matches.find((item) => String(item.id) === String(matchId));

    if (!match) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: "Match introuvable"
      }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      match
    }));
  } catch (error) {
    res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de charger le match",
      details: error.message
    }));
  }
}

async function handleCouponGeneration(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = sanitizeCouponRequest(Object.fromEntries(url.searchParams.entries()));
    const size = params.size;
    const league = params.league;
    const risk = params.risk;

    const matches = await fetchMatches();
    const selectedMatches = matches.slice(0, size);

    const coupon = selectedMatches.map((match) => ({
      matchId: match.id,
      teamHome: match.team1,
      teamAway: match.team2,
      pari: match.primaryPrediction.label || "1",
      cote: Number(match.primaryPrediction.odd) || 1.5,
      confidence: match.primaryPrediction.confidence || 50,
      league: match.league,
    }));

    const combinedOdd = coupon.reduce((acc, sel) => acc * sel.cote, 1);

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      coupon,
      summary: {
        combinedOdd: Number(combinedOdd.toFixed(3)),
        expectedReturn: combinedOdd * 1000,
        totalSelections: coupon.length,
      },
      meta: {
        size,
        league,
        risk,
        generatedAt: new Date().toISOString(),
      },
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de générer le coupon",
      details: error.message,
    }));
  }
}

async function handleCouponLadder(req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const size = params.size || 3;
        const league = params.league || "all";
        const risk = params.risk || "balanced";
        const stake = params.stake || 1000;

        const matches = await fetchMatches();
        const coupons = [];

        for (let i = 0; i < 3; i++) {
          const offset = i * size;
          const selectedMatches = matches.slice(offset, offset + size);

          if (selectedMatches.length === 0) break;

          const coupon = selectedMatches.map((match) => ({
            homeTeam: match.team1,
            awayTeam: match.team2,
            prediction: {
              recommendation: match.primaryPrediction.label || "1",
              confidence: match.primaryPrediction.confidence || 50,
            },
            odds: Number(match.primaryPrediction.odd) || 1.5,
          }));

          coupons.push({
            name: `TICKET ${i + 1}`,
            stake: stake / 3,
            matches: coupon,
          });
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          ladder: {
            coupons,
            totalStake: stake,
            meta: {
              size,
              league,
              risk,
              generatedAt: new Date().toISOString(),
            },
          },
        }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: "Impossible de générer le ladder",
          details: error.message,
        }));
      }
    });
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur serveur",
      details: error.message,
    }));
  }
}

async function handleCouponMulti(req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const size = params.size || 3;
        const league = params.league || "all";
        const risk = params.risk || "balanced";

        const matches = await fetchMatches();
        const strategies = [];

        const riskProfiles = {
          conservative: { name: "Conservateur", multiplier: 0.8 },
          balanced: { name: "Équilibré", multiplier: 1.0 },
          aggressive: { name: "Agressif", multiplier: 1.2 },
        };

        Object.entries(riskProfiles).forEach(([riskKey, profile]) => {
          const selectedMatches = matches.slice(0, size);
          const strategyMatches = selectedMatches.map((match) => ({
            homeTeam: match.team1,
            awayTeam: match.team2,
            prediction: {
              recommendation: match.primaryPrediction.label || "1",
              confidence: Math.min(99, (match.primaryPrediction.confidence || 50) * profile.multiplier),
            },
          }));

          strategies.push({
            name: profile.name,
            risk: riskKey,
            matches: strategyMatches,
          });
        });

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          strategies,
          meta: {
            size,
            league,
            risk,
            generatedAt: new Date().toISOString(),
          },
        }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: "Impossible de générer le multi",
          details: error.message,
        }));
      }
    });
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur serveur",
      details: error.message,
    }));
  }
}

async function handleCouponValidation(req, res) {
  try {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const rawPayload = body ? JSON.parse(body) : {};
        const validationPayload = sanitizeCouponRequest(rawPayload);
        const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
        const selections = Array.isArray(payload.selections) ? payload.selections : [];
        const driftThreshold = validationPayload.driftThresholdPercent || 6;

        const matches = await fetchMatches();
        const issues = [];
        let ok = 0;
        let toFix = 0;

        for (const selection of selections) {
          const match = matches.find((m) => String(m.id) === String(selection.matchId));
          if (!match) {
            issues.push({
              matchId: selection.matchId,
              code: "MATCH_NOT_FOUND",
              message: `Match ${selection.matchId} introuvable`,
            });
            toFix++;
            continue;
          }

          const currentOdd = Number(match.primaryPrediction.odd);
          const selectionOdd = Number(selection.cote);
          const drift = Math.abs((currentOdd - selectionOdd) / selectionOdd * 100);

          if (drift > driftThreshold) {
            issues.push({
              matchId: selection.matchId,
              code: "ODD_DRIFT",
              message: `Cote dérivée de ${drift.toFixed(1)}% (${selectionOdd} → ${currentOdd})`,
            });
            toFix++;
          } else {
            ok++;
          }
        }

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          status: toFix === 0 ? "VALID" : "NEEDS_REVIEW",
          summary: {
            ok,
            toFix,
            total: selections.length,
          },
          issues,
          validatedAt: new Date().toISOString(),
        }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: false,
          error: "Impossible de valider le coupon",
          details: error.message,
        }));
      }
    });
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur serveur",
      details: error.message,
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

  if (url.pathname === "/api/matches") {
    await handleMatches(res);
    return;
  }

  if (url.pathname === "/api/matches/upcoming") {
    await handleUpcomingMatches(res);
    return;
  }

  if (url.pathname === "/api/matches/live") {
    await handleLiveMatches(res);
    return;
  }

  if (url.pathname === "/api/matches/finished") {
    await handleFinishedMatches(res);
    return;
  }

  if (url.pathname === "/api/matches/status") {
    await handleStatusCheck(req, res);
    return;
  }

  if (url.pathname.startsWith("/api/matches/")) {
    const matchId = url.pathname.split("/").pop();
    await handleMatchById(matchId, res);
    return;
  }

  if (url.pathname === "/api/coupon") {
    await handleCouponGeneration(req, res);
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
    await handleCouponValidation(req, res);
    return;
  }

  if (url.pathname === "/api/ai/prediction") {
    await handleAiPrediction(req, res);
    return;
  }

  if (url.pathname === "/api/ai/advanced") {
    await handleAdvancedPrediction(req, res);
    return;
  }

  if (url.pathname === "/api/system") {
    await handleSystemInfo(req, res);
    return;
  }

  if (url.pathname === "/api/health") {
    await handleHealth(req, res);
    return;
  }

  // Auto Visual Generator routes
  if (url.pathname === "/api/visual/generate/prediction") {
    await handleGeneratePredictionVisual(req, res);
    return;
  }

  if (url.pathname === "/api/visual/generate/coupon") {
    await handleGenerateCouponVisual(req, res);
    return;
  }

  // SVG Image Generation routes - Adapté de ONE-DELUX (TEMPORAIREMENT DÉSACTIVÉS)
  // if (url.pathname === "/api/svg/generate/match") {
  //   await handleGenerateMatchSvg(req, res);
  //   return;
  // }

  // if (url.pathname === "/api/svg/generate/coupon") {
  //   await handleGenerateCouponSvg(req, res);
  //   return;
  // }

  // Cron Learning Service routes - Adapté de ONE-DELUX
  if (url.pathname === "/api/cron/learning/status") {
    if (!isAuthorizedCronRequest(req)) {
      rejectCronUnauthorized(res);
      return;
    }
    handleCronStatus(req, res);
    return;
  }

  if (url.pathname === "/api/cron/learning/start") {
    if (!isAuthorizedCronRequest(req)) {
      rejectCronUnauthorized(res);
      return;
    }
    handleCronStart(req, res);
    return;
  }

  if (url.pathname === "/api/cron/learning/stop") {
    if (!isAuthorizedCronRequest(req)) {
      rejectCronUnauthorized(res);
      return;
    }
    handleCronStop(req, res);
    return;
  }

  if (url.pathname === "/api/cron/learning/collect") {
    if (!isAuthorizedCronRequest(req)) {
      rejectCronUnauthorized(res);
      return;
    }
    handleCronCollect(req, res);
    return;
  }

  if (url.pathname === "/cron/learn") {
    if (!isAuthorizedCronRequest(req)) {
      rejectCronUnauthorized(res);
      return;
    }
    handleCronCollect(req, res);
    return;
  }

  serveStaticFile(url.pathname, res);
});

async function parsePredictionInput(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams.entries());
  const sanitizedQuery = sanitizePredictionRequest(query);

  if (req.method && req.method.toUpperCase() === "POST") {
    const body = await readJsonBody(req).catch(() => ({}));
    const payload = body && typeof body === "object" ? body : {};
    const sanitizedBody = sanitizePredictionRequest(payload);
    const merged = { ...sanitizedQuery };
    const keys = ["matchId", "league", "teamHome", "teamAway", "homeOdd", "drawOdd", "awayOdd", "label", "confidence", "model"];
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        merged[key] = sanitizedBody[key];
      }
    }
    return merged;
  }

  return sanitizedQuery;
}

async function resolveMatchFromPredictionRequest(req) {
  const input = await parsePredictionInput(req);

  if (input.matchId) {
    const matches = await fetchMatches();
    const match = matches.find((item) => String(item.id) === String(input.matchId));
    if (!match) {
      const error = new Error("Match introuvable");
      error.status = 404;
      throw error;
    }
    return match;
  }

  return resolvePredictionMatch(input);
}

async function handleAiPrediction(req, res) {
  try {
    const match = await resolveMatchFromPredictionRequest(req);
    const prediction = buildAiPrediction(match);

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      matchId: match.id || null,
      match: {
        id: match.id || null,
        league: match.league || null,
        teams: `${match.team1} vs ${match.team2}`,
        team1: match.team1 || null,
        team2: match.team2 || null,
      },
      prediction,
      generatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de générer la prédiction IA",
      details: error.message,
    }));
  }
}

async function handleAdvancedPrediction(req, res) {
  try {
    const match = await resolveMatchFromPredictionRequest(req);
    const prediction = buildAdvancedPrediction(match);

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      matchId: match.id || null,
      match: {
        id: match.id || null,
        league: match.league || null,
        teams: `${match.team1} vs ${match.team2}`,
        team1: match.team1 || null,
        team2: match.team2 || null,
      },
      prediction,
      generatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de générer la prédiction avancée",
      details: error.message,
    }));
  }
}

async function handleSystemInfo(req, res) {
  try {
    const snapshot = buildSystemSnapshot();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      system: snapshot,
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Impossible de lire l'état système",
      details: error.message,
    }));
  }
}

async function handleHealth(req, res) {
  try {
    const snapshot = buildSystemSnapshot();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      status: "ok",
      uptimeSeconds: snapshot.uptimeSeconds,
      timestamp: snapshot.timestamp,
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      status: "error",
      details: error.message,
    }));
  }
}

async function handleGeneratePredictionVisual(req, res) {
  try {
    const body = await readJsonBody(req);
    const data = body && typeof body === "object" ? body : {};
    
    const options = {
      format: data.format || 'square',
      exportFormat: data.exportFormat || 'png',
      quality: data.quality || 0.9
    };

    const result = await visualGenerator.generatePredictionVisual(data, options);

    if (result.success) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: true,
        imageUrl: result.path,
        format: result.format,
        dimensions: result.dimensions,
        timestamp: result.timestamp
      }));
    } else {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: result.error
      }));
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleGenerateCouponVisual(req, res) {
  try {
    const body = await readJsonBody(req);
    const data = body && typeof body === "object" ? body : {};
    
    const options = {
      format: data.format || 'square',
      exportFormat: data.exportFormat || 'png',
      quality: data.quality || 0.9
    };

    const result = await visualGenerator.generateCouponVisual(data, options);

    if (result.success) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: true,
        imageUrl: result.path,
        format: result.format,
        dimensions: result.dimensions,
        timestamp: result.timestamp
      }));
    } else {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        success: false,
        error: result.error
      }));
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

async function handleSyncFinished(req, res) {
  try {
    const result = await syncFinishedMatches();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      syncedAt: new Date().toISOString(),
      ...result
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur lors de la synchronisation",
      details: error.message
    }));
  }
}

async function handleStatusCheck(req, res) {
  try {
    const matches = await fetchMatches();
    const classified = classifyMatchByStatus(matches);
    const statusCounts = {
      en_cours: classified.live.length,
      terminé: classified.finished.length,
      a_venir: classified.upcoming.length,
      disponible: Math.max(0, matches.length - classified.live.length - classified.finished.length - classified.upcoming.length),
    };

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      checkedAt: new Date().toISOString(),
      totalMatches: matches.length,
      statusBreakdown: statusCounts,
      sampleMatches: matches.slice(0, 5).map(m => ({
        id: m.id,
        teams: `${m.team1} vs ${m.team2}`,
        status: m.status,
        normalizedStatus: m.normalizedStatus,
        isLive: m.isLive,
        isFinished: m.isFinished,
        score: m.score
      }))
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur lors de la vérification des statuts",
      details: error.message
    }));
  }
}

// Cron Learning Service Handlers - Adapté de ONE-DELUX
function handleCronStatus(req, res) {
  try {
    const status = cronLearningService.getStatus();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      status
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur lors de la vérification du statut du cron",
      details: error.message
    }));
  }
}

function handleCronStart(req, res) {
  try {
    cronLearningService.start();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      message: "Cron Learning Service démarré",
      status: cronLearningService.getStatus()
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur lors du démarrage du cron",
      details: error.message
    }));
  }
}

function handleCronStop(req, res) {
  try {
    cronLearningService.stop();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      message: "Cron Learning Service arrêté",
      status: cronLearningService.getStatus()
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur lors de l'arrêt du cron",
      details: error.message
    }));
  }
}

async function handleCronCollect(req, res) {
  try {
    const result = await cronLearningService.collectFinishedMatches();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: true,
      result,
      collectedAt: new Date().toISOString()
    }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      success: false,
      error: "Erreur lors de la collecte des matchs terminés",
      details: error.message
    }));
  }
}

// SVG Image Generation Handlers - Adapté de ONE-DELUX (TEMPORAIREMENT DÉSACTIVÉS)
// async function handleGenerateMatchSvg(req, res) {
//   try {
//     const body = await readJsonBody(req);
//     const data = body && typeof body === "object" ? body : {};
//
//     const svg = buildMatchImageSvg(data);
//     const filename = `match-ticket-${data.matchId || 'unknown'}-${Date.now()}.svg`;
//
//     res.writeHead(200, {
//       "Content-Type": "image/svg+xml; charset=utf-8",
//       "Content-Disposition": `attachment; filename="${filename}"`
//     });
//     res.end(svg);
//   } catch (error) {
//     res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
//     res.end(JSON.stringify({
//       success: false,
//       error: "Erreur lors de la génération du SVG match",
//       details: error.message
//     }));
//   }
// }
//
// async function handleGenerateCouponSvg(req, res) {
//   try {
//     const body = await readJsonBody(req);
//     const data = body && typeof body === "object" ? body : {};
//
//     const svg = buildCouponImageSvg(data);
//     const filename = `coupon-${Date.now()}.svg`;
//
//     res.writeHead(200, {
//       "Content-Type": "image/svg+xml; charset=utf-8",
//       "Content-Disposition": `attachment; filename="${filename}"`
//     });
//     res.end(svg);
//   } catch (error) {
//     res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
//     res.end(JSON.stringify({
//       success: false,
//       error: "Erreur lors de la génération du SVG coupon",
//       details: error.message
//     }));
//   }
// }

function startServerWithRetry(currentPort = port, attempt = 1) {
  const onError = (error) => {
    if (error.code === "EADDRINUSE" && attempt < config.maxPortTries) {
      server.removeListener("error", onError);
      startServerWithRetry(currentPort + 1, attempt + 1);
      return;
    }

    console.error(`Impossible de démarrer le serveur sur le port ${currentPort}: ${error.message}`);
    process.exit(1);
  };

  server.once("error", onError);
  server.listen(currentPort, () => {
    server.removeListener("error", onError);
    console.log(`RUST SIT XPR disponible sur http://localhost:${currentPort}`);
    
    // Démarrer le service Cron Learning (adapté de ONE-DELUX)
    console.log(`[ONE-DELUX Adaptation] Démarrage du Cron Learning Service pour collecte automatique des matchs terminés...`);
    cronLearningService.start();
  });
}

startServerWithRetry();
