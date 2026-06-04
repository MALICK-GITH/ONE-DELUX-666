const http = require("http");
const https = require("https");
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
const CronCollector = require("./services/cronCollector");
const { predictFromTrainedModel } = require("./services/trainedModelPredictor");

const REQUIRED_NODE_MAJOR = 18;
const REQUIRED_NODE_MINOR = 17;
const port = process.env.PORT || 3000;

const API_URL =
  "https://888starz.bet/service-api/LiveFeed/Get1x2_VZip?sports=85&count=40&lng=fr&gr=789&mode=4&country=96&partner=233&getEmpty=true&virtualSports=true&noFilterBlockEvent=true";

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

// Initialize CRON Collector for automatic finished matches collection
const cronCollector = new CronCollector({
  interval: 5 * 60 * 1000, // 5 minutes
  outputPath: path.join(__dirname, "data", "finished-matches.csv"),
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

function buildPredictionCandidate(label, odd, source) {
  return { label, odd, source };
}

function normalizeOutcomeLabel(label, homeTeam, awayTeam) {
  const value = String(label || "").toLowerCase();
  if (value.includes("nul")) return "draw";
  if (value.includes(String(homeTeam || "").toLowerCase())) return "home";
  if (value.includes(String(awayTeam || "").toLowerCase())) return "away";
  if (value === "home" || value === "draw" || value === "away") return value;
  return null;
}

function buildOutcomeLabel(outcome, homeTeam, awayTeam) {
  if (outcome === "home") return `Victoire ${homeTeam}`;
  if (outcome === "away") return `Victoire ${awayTeam}`;
  if (outcome === "draw") return "Match nul";
  return "Analyse indisponible";
}

function getOutcomeOdd(match, outcome) {
  if (!match || !match.odds) return null;
  if (outcome === "home") return match.odds.home;
  if (outcome === "draw") return match.odds.draw;
  if (outcome === "away") return match.odds.away;
  return null;
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
  const odd = getOutcomeOdd(match, recommendation);

  return {
    available: true,
    label: buildOutcomeLabel(recommendation, match.team1, match.team2),
    recommendation,
    odd: odd != null ? Number(odd).toFixed(2) : null,
    confidence: trained.confidence ?? null,
    modelVersion: trained.modelVersion || null,
    modelFile: trained.modelFile || null,
    modelScope: trained.modelScope || null,
    exactScore: trained.exactScore || null,
    distribution: trained.distribution || null,
    coverage: trained.coverage || null,
    trainedAt: trained.trainedAt || null,
    source: trained.source || "trained-finished-matches-model",
  };
}

function buildAdvancedPrediction(match, ai = null) {
  const modelPrediction = ai || buildAiPrediction(match);
  const marketOutcome = normalizeOutcomeLabel(match.primaryPrediction?.label, match.team1, match.team2);
  const marketConfidence = Number(match.primaryPrediction?.confidence || 0);
  const aiConfidence = Number(modelPrediction.confidence || 0);

  const consensusOutcome = marketOutcome && modelPrediction.recommendation === marketOutcome
    ? marketOutcome
    : (aiConfidence >= marketConfidence ? modelPrediction.recommendation : marketOutcome);
  const confidenceBoost = marketOutcome && modelPrediction.recommendation === marketOutcome ? 8 : 0;
  const confidencePenalty = marketOutcome && modelPrediction.recommendation && modelPrediction.recommendation !== marketOutcome ? 4 : 0;
  const confidence = Math.max(
    1,
    Math.min(99, Math.round(Math.max(marketConfidence, aiConfidence) + confidenceBoost - confidencePenalty))
  );

  return {
    available: Boolean(modelPrediction.available),
    label: buildOutcomeLabel(consensusOutcome, match.team1, match.team2),
    recommendation: consensusOutcome,
    confidence,
    odd: getOutcomeOdd(match, consensusOutcome) != null ? Number(getOutcomeOdd(match, consensusOutcome)).toFixed(2) : null,
    sources: {
      market: {
        label: match.primaryPrediction?.label || null,
        confidence: marketConfidence || null,
        model: match.primaryPrediction?.model || null,
      },
      ai: {
        label: modelPrediction.label,
        confidence: modelPrediction.confidence,
        modelVersion: modelPrediction.modelVersion,
        exactScore: modelPrediction.exactScore,
      },
    },
    consensus: marketOutcome && modelPrediction.recommendation
      ? marketOutcome === modelPrediction.recommendation
        ? "aligned"
        : "blended"
      : "market_only",
    ai: modelPrediction,
  };
}

function buildSystemSnapshot() {
  const memory = process.memoryUsage();
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
      cron: true,
      aiPrediction: true,
      advancedPrediction: true,
    },
    model: {
      available: Boolean(predictFromTrainedModel({}).available),
    },
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

function calculateConfidence(selectedOdd, candidateOdds) {
  const validOdds = candidateOdds.filter((odd) => Number.isFinite(odd) && odd > 0);

  if (!Number.isFinite(selectedOdd) || selectedOdd <= 0 || !validOdds.length) {
    return null;
  }

  const weights = validOdds.map((odd) => 1 / odd);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (!totalWeight) {
    return null;
  }

  const selectedWeight = 1 / selectedOdd;
  return Math.max(1, Math.min(99, Math.round((selectedWeight / totalWeight) * 100)));
}

function fetchMatches() {
  return new Promise((resolve, reject) => {
    https.get(API_URL, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'user-agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            const error = new Error(`API distante en erreur (${res.statusCode})`);
            error.status = res.statusCode;
            reject(error);
            return;
          }
          const parsed = JSON.parse(data);
          const events = Array.isArray(parsed.Value) ? parsed.Value.map(formatMatch) : [];
          resolve(events);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function pickMainPrediction(event) {
  const markets = Array.isArray(event.E) ? event.E : [];
  const additionalEvents = Array.isArray(event.AE) ? event.AE : [];

  // Filtrer les cotes bloquées (B: true)
  const availableMarkets = markets.filter((item) => !item.B);

  // Chercher dans les marchés principaux (E)
  const homeWin = availableMarkets.find((item) => item.T === 1 && item.G === 1);
  const draw = availableMarkets.find((item) => item.T === 2 && item.G === 1);
  const awayWin = availableMarkets.find((item) => item.T === 3 && item.G === 1);
  const over = availableMarkets.find((item) => item.T === 9 && item.G === 17);
  const under = availableMarkets.find((item) => item.T === 10 && item.G === 17);

  // Si pas trouvé dans E, chercher dans AE (marchés secondaires)
  const findInAE = (type, group) => {
    for (const ae of additionalEvents) {
      if (ae.G === group && Array.isArray(ae.ME)) {
        const found = ae.ME.find((me) => me.T === type && !me.B);
        if (found) return found;
      }
    }
    return null;
  };

  const overAE = over || findInAE(9, 17);
  const underAE = under || findInAE(10, 17);

  const oneXTwoCandidates = [
    homeWin ? buildPredictionCandidate(`Victoire ${event.O1}`, toOddNumber(homeWin.CV ?? homeWin.C), "1X2") : null,
    draw ? buildPredictionCandidate("Match nul", toOddNumber(draw.CV ?? draw.C), "1X2") : null,
    awayWin ? buildPredictionCandidate(`Victoire ${event.O2}`, toOddNumber(awayWin.CV ?? awayWin.C), "1X2") : null
  ].filter(Boolean);

  if (oneXTwoCandidates.length) {
    const selected = oneXTwoCandidates.reduce((best, current) => (current.odd < best.odd ? current : best));
    return {
      label: selected.label,
      odd: selected.odd,
      source: selected.source,
      model: "Heuristique de marché",
      confidence: calculateConfidence(
        selected.odd,
        oneXTwoCandidates.map((candidate) => candidate.odd)
      )
    };
  }

  const goalCandidates = [
    overAE ? buildPredictionCandidate(`Plus de ${overAE.P} buts`, toOddNumber(overAE.CV ?? overAE.C), "buts") : null,
    underAE ? buildPredictionCandidate(`Moins de ${underAE.P} buts`, toOddNumber(underAE.CV ?? underAE.C), "buts") : null
  ].filter(Boolean);

  if (goalCandidates.length) {
    const selected = goalCandidates.reduce((best, current) => (current.odd < best.odd ? current : best));
    return {
      label: selected.label,
      odd: selected.odd,
      source: selected.source,
      model: "Heuristique de marché",
      confidence: calculateConfidence(
        selected.odd,
        goalCandidates.map((candidate) => candidate.odd)
      )
    };
  }

  return {
    label: "Analyse indisponible",
    odd: null,
    source: null,
    model: "Heuristique de marché",
    confidence: null
  };
}

function formatMatch(event) {
  const primary = pickMainPrediction(event);
  const markets = Array.isArray(event.E) ? event.E : [];
  const additionalEvents = Array.isArray(event.AE) ? event.AE : [];
  const sc = event.SC || {};

  // Score actuel (FS: Full Score) - uniquement disponible en live
  const fullScore = sc.FS || {};
  const currentScore = {
    home: fullScore.S1 || 0,
    away: fullScore.S2 || 0
  };

  // Historique des scores par période (PS: Period Scores)
  const periodScores = Array.isArray(sc.PS) ? sc.PS : [];

  // Période actuelle (CP: Current Period, CPS: Current Period String)
  const currentPeriod = sc.CP || null;
  const currentPeriodString = sc.CPS || event.TN || event.TNS || "Match";

  // Temps écoulé en secondes (TS: Time Seconds)
  const timeSeconds = sc.TS || 0;

  // Statut affiché (SLS: Start Line Status)
  const statusDisplay = sc.SLS || event.TI || "Disponible";
  const statusLower = statusDisplay.toLowerCase();

  // Déterminer si le match est en live (FS existe et n'est pas vide)
  const isLive = fullScore && typeof fullScore === 'object' && (fullScore.S1 !== undefined || fullScore.S2 !== undefined);

  // Déterminer si le match est terminé
  const isFinished = 
    statusLower.includes("terminé") || 
    statusLower.includes("finished") || 
    statusLower.includes("final") || 
    statusLower.includes("ft") ||
    (fullScore.S1 !== undefined && fullScore.S2 !== undefined && !isLive && currentPeriod === null);

  // Déterminer si le match est à venir (pas encore commencé)
  const isScheduled = !isLive && !isFinished && (event.S && new Date(event.S) > new Date());

  // Déterminer le statut normalisé
  let normalizedStatus = "disponible";
  if (isFinished) normalizedStatus = "terminé";
  else if (isLive) normalizedStatus = "en_cours";
  else if (isScheduled) normalizedStatus = "a_venir";

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
    status: statusDisplay,
    normalizedStatus: normalizedStatus,
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
    primaryPrediction: {
      label: primary.label,
      odd: primary.odd ? primary.odd.toFixed(2) : null,
      confidence: primary.confidence,
      model: primary.model,
      source: primary.source
    },
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
    const upcoming = matches.filter(m =>
      m.status === "Paris avant le début du jeu" ||
      m.status?.includes("Début dans")
    );

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
    const live = matches.filter(m => m.isLive);

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
    const finished = matches.filter(m => m.isFinished);

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
    const size = Number(url.searchParams.get("size")) || 3;
    const league = url.searchParams.get("league") || "all";
    const risk = url.searchParams.get("risk") || "balanced";

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
        const payload = body ? JSON.parse(body) : {};
        const selections = Array.isArray(payload.selections) ? payload.selections : [];
        const driftThreshold = payload.driftThresholdPercent || 6;

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

  if (url.pathname === "/api/cron/start") {
    await handleCronStart(req, res);
    return;
  }

  if (url.pathname === "/api/cron/stop") {
    await handleCronStop(req, res);
    return;
  }

  if (url.pathname === "/api/cron/status") {
    await handleCronStatus(req, res);
    return;
  }

  if (url.pathname === "/api/health") {
    await handleHealth(req, res);
    return;
  }

  serveStaticFile(url.pathname, res);
});

async function handleCronStart(req, res) {
  try {
    cronCollector.start();
    const status = cronCollector.getStatus();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, status }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleCronStop(req, res) {
  try {
    cronCollector.stop();
    const status = cronCollector.getStatus();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, status }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleCronStatus(req, res) {
  try {
    const status = cronCollector.getStatus();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, status }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function parsePredictionInput(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const query = Object.fromEntries(url.searchParams.entries());

  if (req.method && req.method.toUpperCase() === "POST") {
    const body = await readJsonBody(req).catch(() => ({}));
    return { ...query, ...(body && typeof body === "object" ? body : {}) };
  }

  return query;
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
    const statusCounts = {
      disponible: 0,
      en_cours: 0,
      terminé: 0,
      a_venir: 0
    };

    matches.forEach(m => {
      const status = m.normalizedStatus || "disponible";
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

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

server.listen(port, () => {
  console.log(`RUST SIT XPR disponible sur http://localhost:${port}`);
  // console.log(`[CRON Collector] Démarrage automatique du collecteur de matchs terminés...`);
  // cronCollector.start();
});
