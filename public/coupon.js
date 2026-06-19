const refreshBtn = document.getElementById("refreshBtn");
const sizeSelect = document.getElementById("sizeSelect");
const familySelect = document.getElementById("familySelect");
const sourceSelect = document.getElementById("sourceSelect");
const preLeagueSelect = document.getElementById("preLeagueSelect");
const preMarketSelect = document.getElementById("preMarketSelect");
const preStatusSelect = document.getElementById("preStatusSelect");
const preConfidenceSelect = document.getElementById("preConfidenceSelect");
const preRiskThresholdSelect = document.getElementById("preRiskThresholdSelect");
const couponSection = document.getElementById("couponSection");
const couponStats = document.getElementById("couponStats");
const ladderBtn = document.getElementById("ladderBtn");
const multiBtn = document.getElementById("multiBtn");
const validateBtn = document.getElementById("validateBtn");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");

const APP_VERSION = "2026.06.18-r2";

let currentCoupon = null;
let availableMatches = [];
let filteredMatches = [];

document.addEventListener("DOMContentLoaded", () => {
  appVersionTag.textContent = `v${APP_VERSION}`;
  setupEventListeners();
  renderEmptyCoupon();
  loadLeagueOptions().finally(() => generateCoupon());
});

function setupEventListeners() {
  refreshBtn?.addEventListener("click", generateCoupon);
  ladderBtn?.addEventListener("click", generateLadder);
  multiBtn?.addEventListener("click", generateMulti);
  validateBtn?.addEventListener("click", validateCoupon);
  preLeagueSelect?.addEventListener("change", generateCoupon);
  familySelect?.addEventListener("change", syncLeagueOptions);
  familySelect?.addEventListener("change", generateCoupon);
  preMarketSelect?.addEventListener("change", generateCoupon);
  preStatusSelect?.addEventListener("change", generateCoupon);
  preConfidenceSelect?.addEventListener("change", generateCoupon);
  preRiskThresholdSelect?.addEventListener("change", generateCoupon);
  document.querySelectorAll('input[name="riskPreset"]').forEach((input) => {
    input.addEventListener("change", generateCoupon);
  });
}

async function loadLeagueOptions() {
  try {
    const matchesResponse = await window.SiteAPI.matches();
    const matches = matchesResponse.matches || [];
    availableMatches = matches;
    syncLeagueOptions();
  } catch (error) {
    console.error("Erreur chargement ligues:", error);
  }
}

function getFamilyFromLeague(leagueName) {
  const league = String(leagueName || "").toLowerCase();
  if (league.includes("penalty")) return "Penalty";
  if (league.includes("highscore")) return "Highscore";
  if (league.includes("rush")) return "Rush";
  return "Classic";
}

function syncLeagueOptions() {
  const selectedFamily = familySelect?.value || "all";
  const matches = availableMatches || [];
  const leagues = [...new Set(
    matches
      .filter((match) => selectedFamily === "all" || getFamilyFromLeague(match.league) === selectedFamily)
      .map((match) => match.league)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "fr"));

  if (preLeagueSelect) {
    preLeagueSelect.innerHTML = `
      <option value="all">Toutes</option>
      ${leagues.map((league) => `<option value="${escapeHtml(league)}">${escapeHtml(league)}</option>`).join("")}
    `;
  }
}

function formatPercent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : "N/A";
}

function formatDate(dateValue) {
  if (!dateValue) return "Non disponible";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Non disponible";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(match) {
  const rawStatus = String(match.status || match.statusText || "").toLowerCase();
  if (rawStatus.includes("live") || rawStatus.includes("direct") || rawStatus.includes("playing")) return "live";
  if (rawStatus.includes("en_cours")) return "live";
  if (rawStatus.includes("venir") || rawStatus.includes("upcoming") || rawStatus.includes("not started")) return "upcoming";
  return rawStatus || "unknown";
}

function getTotalMarkets(match) {
  const totals = [];
  const over = match.odds?.totalGoals?.over || {};
  const under = match.odds?.totalGoals?.under || {};
  Object.entries(over).forEach(([line, odd]) => {
    totals.push({ label: `Over ${line}`, value: odd, family: "over" });
  });
  Object.entries(under).forEach(([line, odd]) => {
    totals.push({ label: `Under ${line}`, value: odd, family: "under" });
  });
  return totals.filter((item) => Number.isFinite(Number(item.value)));
}

function getHandicapMarkets(match) {
  const homeOdd = Number(match.odds?.home);
  const awayOdd = Number(match.odds?.away);
  if (!Number.isFinite(homeOdd) && !Number.isFinite(awayOdd)) return [];

  return [
    Number.isFinite(homeOdd)
      ? { label: "Handicap Home -0.5", value: Number((homeOdd * 1.08).toFixed(2)), side: "home" }
      : null,
    Number.isFinite(awayOdd)
      ? { label: "Handicap Away +0.5", value: Number((awayOdd * 1.08).toFixed(2)), side: "away" }
      : null,
  ].filter(Boolean);
}

function getParityMarkets(match) {
  const homeOdd = Number(match.odds?.home);
  const awayOdd = Number(match.odds?.away);
  const drawOdd = Number(match.odds?.draw);
  const hasBaseMarket = Number.isFinite(homeOdd) || Number.isFinite(awayOdd) || Number.isFinite(drawOdd);

  if (!hasBaseMarket) return [];

  return [
    { label: "Pair", value: 1.72, side: "pair" },
    { label: "Impair", value: 1.78, side: "impair" },
  ];
}

function computeSelection(match, riskMode, preferredMarket = "all") {
  const homeOdd = Number(match.odds?.home);
  const drawOdd = Number(match.odds?.draw);
  const awayOdd = Number(match.odds?.away);
  const totals = getTotalMarkets(match);
  const handicaps = getHandicapMarkets(match);
  const parities = getParityMarkets(match);

  const candidates = [];

  if (Number.isFinite(homeOdd)) candidates.push({ type: "1x2", label: "1", odd: homeOdd, confidence: 77, riskBase: 24 });
  if (Number.isFinite(drawOdd)) candidates.push({ type: "1x2", label: "X", odd: drawOdd, confidence: 58, riskBase: 50 });
  if (Number.isFinite(awayOdd)) candidates.push({ type: "1x2", label: "2", odd: awayOdd, confidence: 72, riskBase: 29 });

  totals.forEach((item) => {
    candidates.push({
      type: item.family,
      label: item.label,
      odd: Number(item.value),
      confidence: item.family === "over" ? 69 : 67,
      riskBase: item.family === "over" ? 35 : 33,
    });
  });

  handicaps.forEach((item) => {
    candidates.push({
      type: "handicap",
      label: item.label,
      odd: Number(item.value),
      confidence: 68,
      riskBase: 32,
    });
  });

  parities.forEach((item) => {
    candidates.push({
      type: "parity",
      label: item.label,
      odd: Number(item.value),
      confidence: 69,
      riskBase: 28,
    });
  });

  // Filtrer par marché préféré si spécifié
  let filteredCandidates = candidates.filter((item) => Number.isFinite(item.odd));
  
  if (preferredMarket !== "all") {
    if (preferredMarket === "1x2") {
      filteredCandidates = filteredCandidates.filter((item) => item.type === "1x2");
    } else if (preferredMarket === "over") {
      filteredCandidates = filteredCandidates.filter((item) => item.type === "over" || item.type === "under");
    } else if (preferredMarket === "parity") {
      filteredCandidates = filteredCandidates.filter((item) => item.type === "parity");
    } else if (preferredMarket === "exact") {
      filteredCandidates = filteredCandidates.filter((item) => item.type === "exact");
    } else if (preferredMarket === "handicap") {
      filteredCandidates = filteredCandidates.filter((item) => item.type === "handicap");
    }
  }

  // Si aucun candidat après filtrage, utiliser tous les candidats
  if (filteredCandidates.length === 0) {
    filteredCandidates = candidates.filter((item) => Number.isFinite(item.odd));
  }

  const sorted = filteredCandidates.sort((left, right) => {
    const leftScore = left.confidence - left.riskBase;
    const rightScore = right.confidence - right.riskBase;
    return rightScore - leftScore;
  });

  const conservative = sorted.find((item) => ["1x2", "under", "over"].includes(item.type)) || sorted[0];
  const balanced = sorted.find((item) => ["1x2", "over", "parity"].includes(item.type)) || sorted[0];
  const aggressive = sorted.find((item) => ["handicap", "parity", "over"].includes(item.type)) || sorted[0];

  const selectionByRisk = {
    conservative,
    balanced,
    aggressive,
  };

  return selectionByRisk[riskMode] || balanced || sorted[0] || {
    type: "1x2",
    label: "1",
    odd: 1.5,
    confidence: 50,
    riskBase: 50,
  };
}

function computeRiskScore(match, selection) {
  const oddFactor = Math.min(40, Math.max(8, (Number(selection.odd) - 1) * 18));
  const statusFactor = normalizeStatus(match) === "live" ? 18 : 8;
  const marketFactor =
    selection.type === "handicap" ? 18 :
    selection.type === "parity" ? 14 :
    selection.type === "over" || selection.type === "under" ? 12 : 8;
  const confidenceFactor = Math.max(0, 100 - Number(selection.confidence || 50));

  return Math.round((oddFactor * 0.35) + (statusFactor * 0.15) + (marketFactor * 0.2) + (confidenceFactor * 0.3));
}

function computeRiskLabel(score) {
  if (score <= 28) return "Faible";
  if (score <= 45) return "Controle";
  if (score <= 65) return "Moyen";
  return "Eleve";
}

async function getPredictionFromAPI(match) {
  try {
    const data = await window.SiteAPI.prediction(match.team1, match.team2, match.league);
    if (data.success && data.prediction && data.prediction.predictions) {
      return data.prediction;
    }
    return null;
  } catch (error) {
    console.error("Erreur de prédiction API:", error);
    return null;
  }
}

function selectIntelligentPrediction(prediction, preferredMarket, match) {
  if (!prediction || !prediction.predictions) {
    return null;
  }

  const predictions = prediction.predictions;
  const x2 = predictions['1x2'] || {};
  const totalGoals = predictions['total_goals'] || {};
  const btts = predictions['btts'] || {};
  const parity = predictions['parity'] || {};
  const handicap = predictions['handicap'] || {};
  const exactScore = predictions['exact_score'] || {};

  let selectedPrediction = null;
  let selectedOdd = 1.5;
  let selectedConfidence = 50;

  // Sélection selon le marché préféré
  if (preferredMarket === "1x2") {
    const maxProb = Math.max(x2.home || 0, x2.draw || 0, x2.away || 0);
    if (maxProb === x2.home) {
      selectedPrediction = { type: "1x2", label: "1", confidence: x2.home * 100 };
      selectedOdd = match.odds?.home || 1.5;
    } else if (maxProb === x2.draw) {
      selectedPrediction = { type: "1x2", label: "X", confidence: x2.draw * 100 };
      selectedOdd = match.odds?.draw || 1.5;
    } else if (maxProb === x2.away) {
      selectedPrediction = { type: "1x2", label: "2", confidence: x2.away * 100 };
      selectedOdd = match.odds?.away || 1.5;
    }
  } else if (preferredMarket === "over" || preferredMarket === "all") {
    if (totalGoals.over_under) {
      const overProb = totalGoals.over_under.over || 0;
      const underProb = totalGoals.over_under.under || 0;
      if (overProb > underProb) {
        selectedPrediction = { type: "over", label: "Over", confidence: overProb * 100 };
        selectedOdd = match.odds?.totalGoals?.over?.[2.5] || 1.5;
      } else {
        selectedPrediction = { type: "under", label: "Under", confidence: underProb * 100 };
        selectedOdd = match.odds?.totalGoals?.under?.[2.5] || 1.5;
      }
    }
  } else if (preferredMarket === "parity") {
    if (parity.pair !== undefined && parity.impair !== undefined) {
      if (parity.pair > parity.impair) {
        selectedPrediction = { type: "parity", label: "Pair", confidence: parity.pair * 100 };
        selectedOdd = 1.72;
      } else {
        selectedPrediction = { type: "parity", label: "Impair", confidence: parity.impair * 100 };
        selectedOdd = 1.78;
      }
    }
  } else if (preferredMarket === "exact") {
    if (exactScore.prediction) {
      selectedPrediction = { type: "exact", label: exactScore.prediction, confidence: (exactScore.confidence || 0.5) * 100 };
      selectedOdd = match.odds?.exactScore || 5.0;
    }
  } else if (preferredMarket === "handicap") {
    if (handicap.predicted !== undefined) {
      const hValue = handicap.predicted;
      const hLabel = hValue > 0 ? `+${hValue.toFixed(1)}` : hValue.toFixed(1);
      selectedPrediction = { type: "handicap", label: hLabel, confidence: 70 };
      selectedOdd = match.odds?.handicap || 1.5;
    }
  }

  // Fallback: utiliser 1X2 si aucune sélection
  if (!selectedPrediction && x2.home) {
    const maxProb = Math.max(x2.home || 0, x2.draw || 0, x2.away || 0);
    if (maxProb === x2.home) {
      selectedPrediction = { type: "1x2", label: "1", confidence: x2.home * 100 };
      selectedOdd = match.odds?.home || 1.5;
    } else if (maxProb === x2.draw) {
      selectedPrediction = { type: "1x2", label: "X", confidence: x2.draw * 100 };
      selectedOdd = match.odds?.draw || 1.5;
    } else if (maxProb === x2.away) {
      selectedPrediction = { type: "1x2", label: "2", confidence: x2.away * 100 };
      selectedOdd = match.odds?.away || 1.5;
    }
  }

  return {
    type: selectedPrediction?.type || "1x2",
    label: selectedPrediction?.label || "1",
    odd: selectedOdd,
    confidence: selectedPrediction?.confidence || 50,
    riskBase: 30,
  };
}

async function mapCouponItem(match, riskMode, preferredMarket = "all") {
  // Essayer d'obtenir la prédiction depuis l'API
  const prediction = await getPredictionFromAPI(match);
  
  let selection;
  if (prediction) {
    // Utiliser la prédiction de l'API
    selection = selectIntelligentPrediction(prediction, preferredMarket, match);
  } else {
    // Fallback: utiliser la logique locale
    selection = computeSelection(match, riskMode, preferredMarket);
  }
  
  const riskScore = computeRiskScore(match, selection);

  return {
    matchId: match.id,
    teamHome: match.team1,
    teamAway: match.team2,
    league: match.league,
    startTime: match.startTime,
    status: match.status,
    statusText: match.statusText,
    homeLogo: match.homeLogo,
    awayLogo: match.awayLogo,
    pari: selection.label,
    marketType: selection.type,
    cote: Number(selection.odd || 1.5),
    confidence: Number(selection.confidence || 50),
    riskScore,
    riskLabel: computeRiskLabel(riskScore),
    liveState: normalizeStatus(match),
    availableMarkets: {
      exactScore: false,
      oneXTwo: Boolean(match.odds?.home || match.odds?.draw || match.odds?.away),
      totals: getTotalMarkets(match).length > 0,
      parity: getParityMarkets(match).length > 0,
      handicap: getHandicapMarkets(match).length > 0,
    },
    rawMatch: match,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmptyCoupon() {
  couponSection.innerHTML = '<div class="loading-card">Cliquez sur "Generer Coupon" pour commencer</div>';
  couponStats.innerHTML = "";
}

function renderCoupon(data) {
  const coupon = data.coupon || [];
  const summary = data.summary || {};
  const familyLabel = data.meta?.family && data.meta.family !== "all" ? data.meta.family : "Toutes";
  const riskLabel =
    Number(data.meta?.confidenceFloor || 55) >= 70 ? "Super Safe" :
    Number(data.meta?.confidenceFloor || 55) >= 55 ? "Safe" :
    "Agressif";

  if (!coupon.length) {
    couponSection.innerHTML = '<div class="loading-card">Aucun match disponible pour le coupon</div>';
    return;
  }

  // Calculer la cote combinée
  const combinedOdd = coupon.reduce((acc, item) => acc * (Number(item.cote) || 1), 1);
  
  const html = `
    <div class="coupon-container">
      <div class="coupon-header">
        <h2>Coupon</h2>
        <p class="coupon-meta">${coupon.length} matchs · ${riskLabel}</p>
        <div class="coupon-combined-odd">
          <span class="combined-odd-label">Cote Combinée:</span>
          <span class="combined-odd-value">${combinedOdd.toFixed(2)}</span>
        </div>
      </div>

      <div class="coupon-items" id="couponItemsList">
        ${coupon.map((item, index) => `
          <div class="coupon-item"
               data-league="${escapeHtml(item.league || "")}"
               data-confidence="${Number(item.confidence || 0)}"
               data-status="${escapeHtml(item.liveState || "unknown")}"
               data-market="${escapeHtml(item.marketType || "1x2")}"
               data-risk-score="${Number(item.riskScore || 0)}">
            <div class="coupon-item-header">
              <span class="coupon-item-number">${index + 1}</span>
              <div class="coupon-item-teams">
                ${item.homeLogo ? `<img src="${item.homeLogo}" alt="${escapeHtml(item.teamHome || item.team1)}" class="team-logo-small" onerror="this.style.display='none'">` : ""}
                <strong>${escapeHtml(item.teamHome || item.team1 || "Equipe 1")}</strong>
                <span>vs</span>
                <strong>${escapeHtml(item.teamAway || item.team2 || "Equipe 2")}</strong>
                ${item.awayLogo ? `<img src="${item.awayLogo}" alt="${escapeHtml(item.teamAway || item.team2)}" class="team-logo-small" onerror="this.style.display='none'">` : ""}
              </div>
              <div class="coupon-item-time">
                <span class="match-time">${item.startTime ? formatDate(item.startTime) : "N/A"}</span>
              </div>
            </div>

            ${item.league ? `<div class="coupon-item-league">${escapeHtml(item.league)} · ${escapeHtml(getFamilyFromLeague(item.league))}</div>` : ""}

            <div class="coupon-pick-line">
              <div class="pick-prediction">
                <strong>${escapeHtml(item.pari || "1")}</strong>
                <span>${escapeHtml(
                  item.marketType === "parity" ? "Parité" :
                  item.marketType === "handicap" ? "Handicap" :
                  item.marketType === "over" || item.marketType === "under" ? "Over / Under" :
                  item.marketType === "exact" ? "Score exact" :
                  "1X2"
                )}</span>
              </div>
              <div class="pick-odd">
                <span class="odd-label">Cote:</span>
                <span class="odd-value">${Number(item.cote || 1.5).toFixed(2)}</span>
              </div>
            </div>

            <div class="coupon-item-details">
              <span class="coupon-confidence">Confiance: ${formatPercent(item.confidence)}</span>
              <span class="coupon-risk">Risque: ${item.riskLabel || computeRiskLabel(item.riskScore)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  couponSection.innerHTML = html;
}

function updateStats(data) {
  const coupon = data.coupon || [];
  const averageConfidence = coupon.length
    ? coupon.reduce((acc, item) => acc + Number(item.confidence || 0), 0) / coupon.length
    : 0;
  const averageRisk = coupon.length
    ? coupon.reduce((acc, item) => acc + Number(item.riskScore || 0), 0) / coupon.length
    : 0;
  const combinedOdd = coupon.reduce((acc, item) => acc * (Number(item.cote) || 1), 1);

  couponStats.innerHTML = `
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Cote Combinée</span>
        <strong class="stat-value">${combinedOdd.toFixed(2)}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">Confiance Moyenne</span>
        <strong class="stat-value">${averageConfidence.toFixed(1)}%</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">Risque Moyen</span>
        <strong class="stat-value">${computeRiskLabel(averageRisk)}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">Nombre de Matchs</span>
        <strong class="stat-value">${coupon.length}</strong>
      </div>
    </div>
  `;
}

function applyPreGenerationFilters(items) {
  const selectedFamily = familySelect?.value || "all";
  const selectedLeague = preLeagueSelect?.value || "all";
  const selectedMarket = preMarketSelect?.value || "all";
  const selectedStatus = preStatusSelect?.value || "all";
  const minConfidence = Number(preConfidenceSelect?.value || 0);
  const maxRisk = Number(preRiskThresholdSelect?.value || 100);

  return items.filter((item) => {
    const familyMatches = selectedFamily === "all" || getFamilyFromLeague(item.league) === selectedFamily;
    const leagueMatches = selectedLeague === "all" || item.league === selectedLeague;
    const statusMatches = selectedStatus === "all" || item.liveState === selectedStatus;
    const confidenceMatches = Number(item.confidence || 0) >= minConfidence;
    const riskMatches = Number(item.riskScore || 0) <= maxRisk;
    const marketMatches =
      selectedMarket === "all" ||
      item.marketType === selectedMarket ||
      (selectedMarket === "over" && (item.marketType === "over" || item.marketType === "under"));

    return familyMatches && leagueMatches && statusMatches && confidenceMatches && riskMatches && marketMatches;
  });
}

async function generateCoupon() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Generation...";

  const size = parseInt(sizeSelect.value, 10) || 3;
  const selectedRiskPreset = document.querySelector('input[name="riskPreset"]:checked')?.value || "55";
  const risk = Number(selectedRiskPreset) >= 70 ? "conservative" : Number(selectedRiskPreset) >= 55 ? "balanced" : "aggressive";
  const selectedMarket = preMarketSelect?.value || "all";

  couponSection.innerHTML = '<div class="loading-card"><div class="loading-spinner"></div><p>Generation du coupon avec IA en cours...</p></div>';

  try {
    const matchesResponse = await window.SiteAPI.matches();
    const matches = matchesResponse.matches || [];
    availableMatches = matches.filter((match) => ["live", "upcoming", "unknown"].includes(normalizeStatus(match)));

    // Mapper les matchs avec les prédictions de l'API (async)
    const couponItems = await Promise.all(
      availableMatches.map((match) => mapCouponItem(match, risk, selectedMarket))
    );

    const coupon = applyPreGenerationFilters(
      couponItems
      .sort((left, right) => {
        const leftScore = Number(left.confidence || 0) - Number(left.riskScore || 0);
        const rightScore = Number(right.confidence || 0) - Number(right.riskScore || 0);
        return rightScore - leftScore;
      })
    )
      .slice(0, size);

    filteredMatches = coupon;
    const combinedOdd = coupon.reduce((acc, item) => acc * (Number(item.cote) || 1), 1);

    currentCoupon = {
      success: true,
      coupon,
      summary: {
        combinedOdd,
        expectedReturn: combinedOdd * 1000,
        totalSelections: coupon.length,
      },
      meta: {
        risk,
        size,
        family: familySelect?.value || "all",
        riskThreshold: Number(preRiskThresholdSelect?.value || 45),
        confidenceFloor: Number(selectedRiskPreset),
      },
    };

    renderCoupon(currentCoupon);
    updateStats(currentCoupon);
    updatedAt.textContent = `Mis a jour: ${new Date().toLocaleTimeString("fr-FR")}`;
  } catch (error) {
    console.error("Erreur de generation:", error);
    couponSection.innerHTML = `
      <div class="error-message">
        <p>Impossible de generer le coupon: ${error.message}</p>
      </div>
    `;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Generer Coupon";
  }
}

async function generateLadder() {
  if (!currentCoupon) {
    alert("Generez d'abord un coupon simple");
    return;
  }

  ladderBtn.disabled = true;
  ladderBtn.textContent = "Generation...";

  try {
    const selectedRiskPreset = document.querySelector('input[name="riskPreset"]:checked')?.value || "55";
    const risk = Number(selectedRiskPreset) >= 70 ? "conservative" : Number(selectedRiskPreset) >= 55 ? "balanced" : "aggressive";
    
    const response = await fetch("/api/coupon/ladder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: parseInt(sizeSelect.value, 10) || 3, risk: risk, stake: 1000 }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    const coupons = data.ladder?.coupons || [];
    couponSection.innerHTML = `
      <div class="multi-container">
        <div class="multi-header">
          <h2>Ladder intelligent</h2>
          <p class="multi-meta">${coupons.length} ticket(s)</p>
        </div>
        <div class="multi-items">
          ${coupons.map((item) => `
            <div class="multi-item">
              <div class="multi-item-header">
                <span class="multi-item-name">${escapeHtml(item.name || "Ticket")}</span>
                <span class="multi-item-risk">${Number(item.stake || 0)} FCFA</span>
              </div>
              <div class="multi-item-matches">
                ${(item.matches || []).map((match) => `
                  <div class="multi-match">
                    <span>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</span>
                    <span>${Number(match.odds || 0).toFixed(2)}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Erreur ladder:", error);
    alert(`Impossible de generer le ladder: ${error.message}`);
  } finally {
    ladderBtn.disabled = false;
    ladderBtn.textContent = "Generer Ladder";
  }
}

async function generateMulti() {
  if (!currentCoupon) {
    alert("Generez d'abord un coupon simple");
    return;
  }

  multiBtn.disabled = true;
  multiBtn.textContent = "Generation...";

  try {
    const selectedRiskPreset = document.querySelector('input[name="riskPreset"]:checked')?.value || "55";
    const risk = Number(selectedRiskPreset) >= 70 ? "conservative" : Number(selectedRiskPreset) >= 55 ? "balanced" : "aggressive";
    
    const response = await fetch("/api/coupon/multi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: parseInt(sizeSelect.value, 10) || 3, risk: risk }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    const strategies = data.strategies || [];
    couponSection.innerHTML = `
      <div class="multi-container">
        <div class="multi-header">
          <h2>Coupon multi</h2>
          <p class="multi-meta">${strategies.length} strategie(s)</p>
        </div>
        <div class="multi-items">
          ${strategies.map((strategy, index) => `
            <div class="multi-item">
              <div class="multi-item-header">
                <span class="multi-item-name">${escapeHtml(strategy.name || `Strategie ${index + 1}`)}</span>
                <span class="multi-item-risk">${escapeHtml(strategy.risk || "balanced")}</span>
              </div>
              <div class="multi-item-matches">
                ${(strategy.matches || []).map((match) => `
                  <div class="multi-match">
                    <span>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</span>
                    <span>1</span>
                    <span>0%</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Erreur multi:", error);
    alert(`Impossible de generer le multi: ${error.message}`);
  } finally {
    multiBtn.disabled = false;
    multiBtn.textContent = "Generer Multi";
  }
}

async function validateCoupon() {
  if (!currentCoupon || !currentCoupon.coupon) {
    alert("Generez d'abord un coupon");
    return;
  }

  validateBtn.disabled = true;
  validateBtn.textContent = "Validation...";

  try {
    const selections = currentCoupon.coupon.map((item) => ({
      matchId: item.matchId,
      cote: item.cote,
    }));

    const response = await fetch("/api/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, driftThresholdPercent: 6 }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    renderValidation(data);
  } catch (error) {
    console.error("Erreur validation:", error);
    alert(`Impossible de valider le coupon: ${error.message}`);
  } finally {
    validateBtn.disabled = false;
    validateBtn.textContent = "Valider Coupon";
  }
}

function renderValidation(data) {
  const summary = data.summary || {};
  const issues = data.issues || [];

  couponSection.innerHTML = `
    <div class="validation-container">
      <div class="validation-header">
        <h2>Validation Coupon</h2>
        <p class="validation-status">Statut: ${escapeHtml(data.status || "UNKNOWN")}</p>
      </div>

      <div class="validation-summary">
        <div class="summary-item">
          <span>OK</span>
          <strong>${summary.ok || 0}</strong>
        </div>
        <div class="summary-item">
          <span>A corriger</span>
          <strong>${summary.toFix || 0}</strong>
        </div>
        <div class="summary-item">
          <span>Total</span>
          <strong>${summary.total || 0}</strong>
        </div>
      </div>

      ${issues.length ? `
        <div class="validation-issues">
          <h3>Alertes detectees</h3>
          ${issues.map((issue) => `
            <div class="issue-item">
              <span class="issue-code">${escapeHtml(issue.code || "ALERT")}</span>
              <span class="issue-message">${escapeHtml(issue.message || "Message non disponible")}</span>
            </div>
          `).join("")}
        </div>
      ` : '<p class="validation-ok">Aucune alerte detectee. Coupon valide.</p>'}
    </div>
  `;
}
