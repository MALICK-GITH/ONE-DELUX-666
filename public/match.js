/**
 * FURY X ONE - Match Detail Script
 * Mobile-premium match analysis rendering
 */

const params = new URLSearchParams(window.location.search);
const matchId = params.get("id");

const matchDetail = document.getElementById("matchDetail");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");
const apiStatus = document.getElementById("apiStatus");
const predictionStatus = document.getElementById("predictionStatus");
const refreshPredictionBtn = document.getElementById("refreshPredictionBtn");

const mobileRefreshPredictionBtn = document.getElementById("mobileRefreshPredictionBtn");
const mobileGenerateVisualBtn = document.getElementById("mobileGenerateVisualBtn");
const mobileVisualFormatSelect = document.getElementById("mobileVisualFormatSelect");
const mobileVisualQualitySelect = document.getElementById("mobileVisualQualitySelect");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileNav = document.getElementById("mobileNav");
const mobileUpdatedAt = document.getElementById("mobileUpdatedAt");
const mobileAppVersionTag = document.getElementById("mobileAppVersionTag");
const mobileApiStatus = document.getElementById("mobileApiStatus");

const APP_VERSION = "2026.06.19-r2";
const DEFAULT_TEAM_LOGO = "/icons/icon-192x192.svg";

let currentMatchData = null;
let currentPredictionData = null;
let cachedPredictionLeagues = null;

window.currentMatchData = currentMatchData;
window.currentPredictionData = currentPredictionData;

document.addEventListener("DOMContentLoaded", () => {
  if (appVersionTag) appVersionTag.textContent = `v${APP_VERSION}`;
  if (mobileAppVersionTag) mobileAppVersionTag.textContent = `v${APP_VERSION}`;
  setupEventListeners();
  checkApiHealth();
  loadMatch();
});

function setupEventListeners() {
  if (refreshPredictionBtn) {
    refreshPredictionBtn.addEventListener("click", refreshPrediction);
  }

  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener("click", () => {
      mobileNav.classList.toggle("active");
    });
  }

  if (mobileRefreshPredictionBtn && refreshPredictionBtn) {
    mobileRefreshPredictionBtn.addEventListener("click", () => refreshPredictionBtn.click());
  }

  const visualFormatSelect = document.getElementById("visualFormatSelect");
  if (mobileVisualFormatSelect && visualFormatSelect) {
    mobileVisualFormatSelect.addEventListener("change", () => {
      visualFormatSelect.value = mobileVisualFormatSelect.value;
    });
    visualFormatSelect.addEventListener("change", () => {
      mobileVisualFormatSelect.value = visualFormatSelect.value;
    });
  }

  const visualQualitySelect = document.getElementById("visualQualitySelect");
  if (mobileVisualQualitySelect && visualQualitySelect) {
    mobileVisualQualitySelect.addEventListener("change", () => {
      visualQualitySelect.value = mobileVisualQualitySelect.value;
    });
    visualQualitySelect.addEventListener("change", () => {
      mobileVisualQualitySelect.value = visualQualitySelect.value;
    });
  }

  const generateVisualBtn = document.getElementById("generateVisualBtn");
  if (mobileGenerateVisualBtn && generateVisualBtn) {
    mobileGenerateVisualBtn.addEventListener("click", () => generateVisualBtn.click());
  }
}

async function checkApiHealth() {
  try {
    const data = await window.SiteAPI.predictionHealth();
    if (data.success && data.health) {
      updateApiStatus(true, "API connectée - Modèles chargés");
      updatePredictionStatus(true, "Prêt pour l'analyse");
    } else {
      updateApiStatus(false, "API non disponible");
      updatePredictionStatus(false, "Service indisponible");
    }
  } catch (error) {
    console.error("Erreur de connexion API:", error);
    updateApiStatus(false, "Erreur de connexion");
    updatePredictionStatus(false, "Connexion échouée");
  }
}

function updateApiStatus(isOnline, message) {
  if (!apiStatus) return;
  apiStatus.textContent = `API: ${isOnline ? "🟢" : "🔴"} ${message}`;
  apiStatus.style.color = isOnline ? "#00ff88" : "#ff4444";
  if (mobileApiStatus) {
    mobileApiStatus.textContent = apiStatus.textContent;
    mobileApiStatus.style.color = apiStatus.style.color;
  }
}

function updatePredictionStatus(isOnline, message) {
  if (!predictionStatus) return;
  const indicator = predictionStatus.querySelector(".status-indicator");
  const text = predictionStatus.querySelector(".status-text");

  if (indicator) {
    indicator.style.backgroundColor = isOnline ? "#00ff88" : "#ff4444";
    indicator.style.boxShadow = isOnline
      ? "0 0 10px rgba(0, 255, 136, 0.5)"
      : "0 0 10px rgba(255, 68, 68, 0.5)";
  }

  if (text) {
    text.textContent = message;
  }
}

async function refreshPrediction() {
  if (!currentMatchData) return;

  if (refreshPredictionBtn) {
    refreshPredictionBtn.disabled = true;
    refreshPredictionBtn.textContent = "⏳ Rafraîchissement...";
  }

  if (mobileRefreshPredictionBtn) {
    mobileRefreshPredictionBtn.disabled = true;
  }

  updatePredictionStatus(true, "Rafraîchissement en cours...");

  try {
    await loadMatchPrediction();
    updatePredictionStatus(true, "Analyse mise à jour");
  } catch (error) {
    console.error("Erreur de rafraîchissement:", error);
    updatePredictionStatus(false, "Erreur de rafraîchissement");
  } finally {
    if (refreshPredictionBtn) {
      refreshPredictionBtn.disabled = false;
      refreshPredictionBtn.textContent = "🔄 Rafraîchir";
    }
    if (mobileRefreshPredictionBtn) {
      mobileRefreshPredictionBtn.disabled = false;
    }
  }
}

async function loadMatch() {
  if (!matchId) {
    if (matchDetail) {
      matchDetail.innerHTML = `
        <div class="error-message">
          <p>Aucun identifiant de match fourni.</p>
        </div>
      `;
    }
    updatePredictionStatus(false, "Match introuvable");
    return;
  }

  if (matchDetail) {
    matchDetail.innerHTML = `
      <div class="loading-card">
        <div class="loading-spinner"></div>
        <p>Chargement du match...</p>
      </div>
    `;
  }

  try {
    const data = await window.SiteAPI.matchById(matchId);
    if (!data.success || !data.match) {
      throw new Error(data.error || "Match introuvable");
    }

    currentMatchData = data.match;
    window.currentMatchData = currentMatchData;
    renderMatchDetail(currentMatchData);
  } catch (error) {
    console.error("Erreur de chargement du match:", error);
    if (matchDetail) {
      matchDetail.innerHTML = `
        <div class="error-message">
          <p>Impossible de charger le match: ${escapeHtml(error.message)}</p>
        </div>
      `;
    }
    updatePredictionStatus(false, "Erreur de chargement");
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Non définie";
  const numeric = Number(timestamp);
  const date = Number.isFinite(numeric) ? new Date(numeric * 1000) : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Non définie";
  return date.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
}

function formatCompactDate(timestamp) {
  if (!timestamp) return "Heure inconnue";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Heure inconnue";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScore(match) {
  const score = match?.score || {};
  const home = Number.isFinite(Number(score.home)) ? Number(score.home) : null;
  const away = Number.isFinite(Number(score.away)) ? Number(score.away) : null;
  if (home === null && away === null) return null;
  return `${home ?? 0} - ${away ?? 0}`;
}

function formatPercent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(1)}%` : "N/A";
}

function formatOdds(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "-";
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value, fallback = "N/A") {
  if (value === undefined || value === null || value === "") return fallback;
  return escapeHtml(value);
}

function getTeamLogo(logo) {
  return logo ? escapeHtml(logo) : DEFAULT_TEAM_LOGO;
}

function getStatusVariant(status) {
  const raw = String(status || "").toLowerCase();
  if (raw.includes("term")) return "ended";
  if (raw.includes("cours") || raw.includes("live")) return "live";
  return "upcoming";
}

function getStatusLabel(match) {
  const status = String(match?.status || match?.statusText || "").toLowerCase();
  if (status.includes("term")) return "Terminé";
  if (status.includes("cours") || status.includes("live")) return "En cours";
  return "À venir";
}

function getKickoffMeta(match) {
  const start = match?.startTime ? new Date(match.startTime) : null;
  const hasValidStart = start && !Number.isNaN(start.getTime());
  const now = new Date();
  const period = match?.period ? String(match.period) : "";
  const liveTime = match?.liveTime ? String(match.liveTime) : "";

  if (getStatusVariant(match?.status) === "ended") {
    return `Terminé${period ? ` • ${period}` : ""}`;
  }

  if (getStatusVariant(match?.status) === "live") {
    if (liveTime) return `${liveTime}${period ? ` • ${period}` : ""}`;
    return `En direct${period ? ` • ${period}` : ""}`;
  }

  if (hasValidStart) {
    const diffMinutes = Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000));
    if (diffMinutes < 60) return `Début dans ${diffMinutes} min${period ? ` • ${period}` : ""}`;
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    if (diffHours < 12) {
      return `Début dans ${diffHours}h${remainingMinutes ? ` ${remainingMinutes} min` : ""}${period ? ` • ${period}` : ""}`;
    }
    return `${formatCompactDate(match.startTime)}${period ? ` • ${period}` : ""}`;
  }

  return period || "Horaire indisponible";
}

function getMainPrediction(x2, match) {
  const home = safeNumber(x2?.home) ?? 0;
  const draw = safeNumber(x2?.draw) ?? 0;
  const away = safeNumber(x2?.away) ?? 0;
  const maxProb = Math.max(home, draw, away);

  if (maxProb === away) {
    return {
      label: `Victoire ${match.team2}`,
      color: "#ff4444",
      accentClass: "accent-away",
      confidence: away,
    };
  }

  if (maxProb === draw) {
    return {
      label: "Match nul",
      color: "#ffaa00",
      accentClass: "accent-draw",
      confidence: draw,
    };
  }

  return {
    label: `Victoire ${match.team1}`,
    color: "#00ff88",
    accentClass: "accent-home",
    confidence: home,
  };
}

function getScoreRangesForFamily(family) {
  const familyUpper = String(family || "").toUpperCase();
  
  const ranges = {
    "RUSH": ["0-2", "3-5", "6-8", "9+"],
    "ENGLAND": ["0-8", "9-12", "13-16", "17+"],
    "CLASSIC": ["0-2", "3-4", "5-6", "7+"],
    "CHAMPIONS": ["0-2", "3-4", "5-6", "7+"],
    "WORLD": ["0-2", "3-4", "5-6", "7+"],
    "PENALTY": ["0-2", "3-5", "6-8", "9+"],
    "HIGHSCORE": ["0-2", "3-5", "6-8", "9+"]
  };
  
  return ranges[familyUpper] || ["0-2", "3-5", "6-8", "9+"];
}

function getScoreRangeLabels(family, scoreRangeData) {
  const ranges = getScoreRangesForFamily(family);
  const labels = {};
  
  ranges.forEach((range, index) => {
    const keys = Object.keys(scoreRangeData || {});
    const key = keys[index] || range;
    labels[range] = scoreRangeData?.[key] ?? 0;
  });
  
  return labels;
}

async function resolveExactPredictionLeagueName(league) {
  const requestedLeague = String(league || "").trim();
  if (!requestedLeague) return requestedLeague;

  try {
    if (!cachedPredictionLeagues) {
      cachedPredictionLeagues = window.SiteAPI.predictionLeagues()
        .then((response) => Array.isArray(response?.leagues) ? response.leagues : [])
        .catch(() => []);
    }

    const leagues = await cachedPredictionLeagues;
    const exact = leagues.find((item) => String(item?.name || "").toLowerCase() === requestedLeague.toLowerCase());
    return exact?.name || requestedLeague;
  } catch {
    return requestedLeague;
  }
}

function renderBarRow(label, value, colorClass, emoji, confidence = null) {
  const ratio = Math.max(0, Math.min(100, (safeNumber(value) ?? 0) * 100));
  const confidenceDisplay = confidence !== null ? `<span class="premium-bar-confidence">Confiance: ${(confidence * 100).toFixed(0)}%</span>` : '';
  
  return `
    <div class="premium-bar-row fade-in-up">
      <div class="premium-bar-head">
        <span class="premium-bar-label">${emoji} ${label}</span>
        <div class="premium-bar-metrics">
          <span class="premium-bar-value ${colorClass}">${ratio.toFixed(1)}%</span>
          ${confidenceDisplay}
        </div>
      </div>
      <div class="premium-bar-track">
        <div class="premium-bar-fill ${colorClass}" style="width:${ratio.toFixed(0)}%"></div>
      </div>
    </div>
  `;
}

function renderEmptyState(title, message) {
  return `
    <div class="prediction-empty-state fade-in-up">
      <strong>${title}</strong>
      <span>${message}</span>
    </div>
  `;
}

function renderStatCard(label, value, tone = "cyan", confidence = null) {
  const confidenceDisplay = confidence !== null ? `<span class="stat-confidence">Confiance: ${(confidence * 100).toFixed(0)}%</span>` : '';
  
  return `
    <div class="premium-stat-card tone-${tone} fade-in-up">
      <span class="premium-stat-label">${label}</span>
      <strong class="premium-stat-value">${value}</strong>
      ${confidenceDisplay}
    </div>
  `;
}

function renderInfoPill(label, value) {
  return `
    <div class="premium-info-pill fade-in-up">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderMatchDetail(match) {
  const odds = match?.odds || {};
  const homeTeam = normalizeText(match?.team1, "Équipe 1");
  const awayTeam = normalizeText(match?.team2, "Équipe 2");
  const league = normalizeText(match?.league, "Compétition virtuelle");
  const score = formatScore(match) || "0 - 0";
  const statusLabel = getStatusLabel(match);
  const kickoffMeta = getKickoffMeta(match);
  const statusVariant = getStatusVariant(match?.status || match?.statusText);

  matchDetail.innerHTML = `
    <div class="match-detail-container premium-match-layout">
      <section class="premium-surface match-hero-card fade-in-up">
        <div class="premium-surface-head">
          <span class="premium-chip cyan">${league}</span>
          <span class="premium-chip ${statusVariant}">${statusLabel}</span>
        </div>

        <div class="match-teams-premium">
          <div class="team-side-premium">
            <div class="team-logo-shell">
              <img src="${getTeamLogo(match?.homeLogo)}" alt="${homeTeam}" class="team-logo-hero" onerror="this.src='${DEFAULT_TEAM_LOGO}'" />
            </div>
            <span class="team-name-premium">${homeTeam}</span>
          </div>

          <div class="match-core-premium">
            <div class="match-title-premium">${homeTeam} <span>vs</span> ${awayTeam}</div>
            <div class="match-score-premium">${score}</div>
            <div class="match-subline-premium">${kickoffMeta}</div>
          </div>

          <div class="team-side-premium">
            <div class="team-logo-shell">
              <img src="${getTeamLogo(match?.awayLogo)}" alt="${awayTeam}" class="team-logo-hero" onerror="this.src='${DEFAULT_TEAM_LOGO}'" />
            </div>
            <span class="team-name-premium">${awayTeam}</span>
          </div>
        </div>

        <div class="premium-chip-row">
          ${renderInfoPill("Statut", statusLabel)}
          ${renderInfoPill("Horaire", formatCompactDate(match?.startTime))}
          ${match?.period ? renderInfoPill("Période", normalizeText(match.period)) : ""}
        </div>

        <div class="odds-grid-premium">
          <div class="premium-odd-card fade-in-up">
            <span class="premium-odd-label">1</span>
            <strong class="premium-odd-value">${formatOdds(odds.home)}</strong>
          </div>
          <div class="premium-odd-card fade-in-up">
            <span class="premium-odd-label">X</span>
            <strong class="premium-odd-value">${formatOdds(odds.draw)}</strong>
          </div>
          <div class="premium-odd-card fade-in-up">
            <span class="premium-odd-label">2</span>
            <strong class="premium-odd-value">${formatOdds(odds.away)}</strong>
          </div>
        </div>
      </section>

      <section class="premium-surface premium-analysis-card fade-in-up">
        <div class="section-title-wrap">
          <h3>🔮 Prédiction IA</h3>
          <p>Lecture premium du match, des probabilités et des signaux.</p>
        </div>
        <div id="predictionResult"><div class="loading-card premium-loading-card"><div class="loading-spinner"></div><p>Analyse IA en cours...</p></div></div>
      </section>
    </div>
  `;

  loadMatchPrediction();
}

function renderPredictionContent(match, prediction, modelInfo = null) {
  const matchResult = prediction?.predictions?.match_result || {};
  const x2 = {
    home: Number(matchResult.probabilities?.home_win) || 0,
    draw: Number(matchResult.probabilities?.draw) || 0,
    away: Number(matchResult.probabilities?.away_win) || 0,
    confidence: Number(matchResult.confidence) || 0,
  };
  const totalGoals = prediction?.predictions?.total_goals || {};
  const handicap = prediction?.platform_mapping?.handicap || {};
  const platformOdds = prediction?.platform_odds || {};
  const parity = prediction?.predictions?.total_parity || {};
  const overUnder = prediction?.predictions?.over_under || {};
  const btts = {};
  const scoreRange = prediction?.predictions?.score_range || {};
  const doubleChance = prediction?.predictions?.double_chance || {};
  const cleanSheet = prediction?.predictions?.clean_sheet || {};
  const drawNoBet = prediction?.predictions?.draw_no_bet || {};
  const winBothHalves = prediction?.predictions?.win_both_halves || {};
  const family = normalizeText(prediction?.family, "HIGHSCORE");
  const rawResult = matchResult.prediction ? normalizeText(matchResult.prediction) : null;
  const rawResultProba = safeNumber(matchResult.confidence);
  const topScores = [];
  const mainPrediction = getMainPrediction(x2, match);
  const predictedGoals = safeNumber(totalGoals.predicted);
  const handicapPredicted = safeNumber(handicap.predicted);
  const parityConfidence = safeNumber(parity.confidence);
  const parityPair = parity.prediction === "even"
    ? parityConfidence
    : parity.prediction === "odd"
      ? Math.max(0, 1 - (parityConfidence ?? 0))
      : null;
  const parityImpair = parity.prediction === "odd"
    ? parityConfidence
    : parity.prediction === "even"
      ? Math.max(0, 1 - (parityConfidence ?? 0))
      : null;
  const overValue = overUnder.prediction === "over"
    ? safeNumber(overUnder.confidence)
    : overUnder.prediction === "under"
      ? Math.max(0, 1 - (safeNumber(overUnder.confidence) ?? 0))
      : safeNumber(totalGoals?.over_under?.over);
  const underValue = overUnder.prediction === "under"
    ? safeNumber(overUnder.confidence)
    : overUnder.prediction === "over"
      ? Math.max(0, 1 - (safeNumber(overUnder.confidence) ?? 0))
      : safeNumber(totalGoals?.over_under?.under);
  const bttsYes = null;
  const bttsNo = null;
  
  // Dynamic score ranges based on family
  const dynamicScoreRanges = getScoreRangeLabels(family, scoreRange);
  
  const dc1x = safeNumber(doubleChance["1x"]);
  const dcx2 = safeNumber(doubleChance["x2"]);
  const dc12 = safeNumber(doubleChance["12"]);
  const cleanSheetHomeYes = safeNumber(cleanSheet.home_yes);
  const cleanSheetAwayYes = safeNumber(cleanSheet.away_yes);
  const dnbHome = safeNumber(drawNoBet.home);
  const dnbAway = safeNumber(drawNoBet.away);
  const bothHalvesYes = safeNumber(winBothHalves.yes);
  const bothHalvesNo = safeNumber(winBothHalves.no);

  const totalGoalsCard = predictedGoals !== null
    ? `
      <div class="premium-mini-card fade-in-up">
        <div class="mini-card-header">
          <h4>⚽ Total buts</h4>
          <span class="premium-mini-highlight">${predictedGoals.toFixed(1)}</span>
        </div>
        <p class="mini-card-copy">Projection IA du volume offensif global.</p>
        ${overValue !== null || underValue !== null ? `
          <div class="mini-split-values">
            <div>
              <span>Over</span>
              <strong>${overValue !== null ? `${(overValue * 100).toFixed(0)}%` : "-"}</strong>
            </div>
            <div>
              <span>Under</span>
              <strong>${underValue !== null ? `${(underValue * 100).toFixed(0)}%` : "-"}</strong>
            </div>
          </div>
        ` : ""}
      </div>
    `
    : renderEmptyState("Total buts indisponible", "Le moteur n'a pas renvoyé de projection fiable.");

  const parityCard = parityPair !== null || parityImpair !== null
    ? `
      <div class="premium-mini-card fade-in-up">
        <div class="mini-card-header">
          <h4>🔢 Pair / Impair</h4>
          <span class="premium-mini-highlight">${formatPercent(Math.max(parityPair ?? 0, parityImpair ?? 0))}</span>
        </div>
        <div class="mini-split-values">
          <div>
            <span>Pair</span>
            <strong>${parityPair !== null ? `${(parityPair * 100).toFixed(0)}%` : "-"}</strong>
          </div>
          <div>
            <span>Impair</span>
            <strong>${parityImpair !== null ? `${(parityImpair * 100).toFixed(0)}%` : "-"}</strong>
          </div>
        </div>
      </div>
    `
    : renderEmptyState("Parité indisponible", "Aucune parité exploitable n'est disponible.");

  const handicapCard = handicapPredicted !== null || handicap?.platform_value
    ? `
      <div class="premium-handicap-card fade-in-up">
        <div class="mini-card-header">
          <h4>⚖️ Handicap</h4>
          <span class="premium-mini-highlight">${handicapPredicted !== null ? handicapPredicted.toFixed(1) : normalizeText(handicap.platform_value, "-")}</span>
        </div>
        <p class="mini-card-copy">${handicap?.platform_name ? normalizeText(handicap.platform_name) : "Projection handicap disponible"}</p>
        ${handicap?.platform_value ? `<div class="premium-platform-line"><span>Option</span><strong>${normalizeText(handicap.platform_value)}</strong></div>` : ""}
      </div>
    `
    : `
      <div class="premium-handicap-card premium-handicap-empty fade-in-up">
        <div class="mini-card-header">
          <h4>⚖️ Handicap</h4>
        </div>
        <p class="mini-card-copy">⚠️ Handicap indisponible</p>
      </div>
    `;

  const platformOddsCard = platformOdds?.main
    ? `
      <div class="premium-section-card fade-in-up">
        <div class="section-title-wrap compact">
          <h4>💹 Cotes plateforme</h4>
          <p>Valeurs brutes retournées par l'API.</p>
        </div>
        <div class="stats-grid-premium">
          ${renderStatCard("1", platformOdds.main.home_win ? formatOdd(platformOdds.main.home_win.value) : "N/A", "green")}
          ${renderStatCard("X", platformOdds.main.draw ? formatOdd(platformOdds.main.draw.value) : "N/A", "amber")}
          ${renderStatCard("2", platformOdds.main.away_win ? formatOdd(platformOdds.main.away_win.value) : "N/A", "red")}
        </div>
      </div>
    `
    : "";

  const modelInfoCard = modelInfo?.models
    ? `
      <div class="premium-section-card fade-in-up">
        <div class="section-title-wrap compact">
          <h4>🧠 Modèle de ligue</h4>
          <p>${normalizeText(modelInfo.league || match.league)} · ${normalizeText(modelInfo.family || "N/A")}</p>
        </div>
        <div class="stats-grid-premium">
          ${Object.entries(modelInfo.models).map(([key, value]) => {
            const available = typeof value === "boolean" ? value : Boolean(value);
            const label = available ? "Disponible" : "Absent";
            const detail = typeof value === "object" && value
              ? [value.type, value.accuracy !== undefined ? `${Math.round(Number(value.accuracy) * 100)}%` : null, value.features !== undefined ? `${value.features} features` : null].filter(Boolean).join(" · ")
              : "Modèle de ligue";
            return `
              <article class="premium-stat-card">
                <span>${escapeHtml(key)}</span>
                <strong>${escapeHtml(label)}</strong>
                <small>${escapeHtml(detail)}</small>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `
    : "";

  const statsCards = [
    renderStatCard("Confiance IA", formatPercent(mainPrediction.confidence), "red"),
    renderStatCard("Famille", family, "cyan"),
    renderStatCard("Total buts", predictedGoals !== null ? predictedGoals.toFixed(1) : "N/A", "amber"),
    renderStatCard("BTTS", bttsYes !== null && bttsNo !== null ? `${(Math.max(bttsYes, bttsNo) * 100).toFixed(0)}%` : "N/A", "green"),
    renderStatCard("Parité pair", parityPair !== null ? `${(parityPair * 100).toFixed(0)}%` : "N/A", "cyan"),
    renderStatCard("Handicap", handicapPredicted !== null ? handicapPredicted.toFixed(1) : normalizeText(handicap?.platform_value, "N/A"), "red"),
    renderStatCard("Double chance", dc1x !== null || dcx2 !== null || dc12 !== null ? `${Math.round(Math.max(dc1x ?? 0, dcx2 ?? 0, dc12 ?? 0) * 100)}%` : "N/A", "green"),
    renderStatCard("Score range", Object.keys(dynamicScoreRanges).length > 0 ? `${Math.round(Math.max(...Object.values(dynamicScoreRanges)) * 100)}%` : "N/A", "amber"),
  ].join("");

  return `
    <div class="prediction-detail premium-prediction-layout">
      <div class="prediction-main-result premium-main-result ${mainPrediction.accentClass} fade-in-up">
        <div class="prediction-main-label">🎯 PRÉDICTION PRINCIPALE</div>
        <div class="prediction-main-value" style="color:${mainPrediction.color}">${normalizeText(mainPrediction.label)}</div>
        <div class="prediction-main-confidence">Confiance ${formatPercent(mainPrediction.confidence)}</div>
        <div class="prediction-family-badge">Famille ${family}</div>
      </div>

      ${rawResult ? `
        <div class="premium-section-card fade-in-up">
          <div class="section-title-wrap compact">
            <h4>🧾 Sortie brute du modèle</h4>
            <p>Valeur retournée par prediction.result et son score associé.</p>
          </div>
          <div class="stats-grid-premium">
            ${renderStatCard("Classe", rawResult, "cyan")}
            ${renderStatCard("Confiance", rawResultProba !== null ? formatPercent(rawResultProba) : "N/A", "green")}
          </div>
          ${topScores.length ? `
            <div class="prediction-history">
              <h4>Top scores</h4>
              <div class="history-grid">
                ${topScores.map((item) => `
                  <div class="history-item">
                    <div class="history-item-top">
                      <span>${normalizeText(item.score)}</span>
                      <strong>${formatPercent(item.proba)}</strong>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      ` : ""}

      ${platformOddsCard}
      ${modelInfoCard}

      <div class="premium-section-card fade-in-up">
        <div class="section-title-wrap compact">
          <h4>📊 Analyse 1X2</h4>
        </div>
        <div class="premium-1x2-bars">
          ${renderBarRow("Domicile", x2.home, "home", "🏠", x2.confidence)}
          ${renderBarRow("Nul", x2.draw, "draw", "⚖️", x2.confidence)}
          ${renderBarRow("Extérieur", x2.away, "away", "✈️", x2.confidence)}
        </div>
      </div>

      <div class="prediction-grid-duo">
        ${totalGoalsCard}
        ${parityCard}
      </div>

      ${handicapCard}

      ${(bttsYes !== null || bttsNo !== null) ? `
        <div class="premium-section-card fade-in-up">
          <div class="section-title-wrap compact">
            <h4>⚽ BTTS</h4>
            <p>Signal des deux équipes qui marquent.</p>
          </div>
          <div class="premium-1x2-bars">
            ${renderBarRow("Oui", bttsYes ?? 0, "home", "✅", btts.confidence)}
            ${renderBarRow("Non", bttsNo ?? 0, "away", "⛔", btts.confidence)}
          </div>
        </div>
      ` : ""}

      ${(dc1x !== null || dcx2 !== null || dc12 !== null) ? `
        <div class="premium-section-card fade-in-up">
          <div class="section-title-wrap compact">
            <h4>🛡️ Double chance</h4>
            <p>Lecture des couvertures principales.</p>
          </div>
          <div class="premium-1x2-bars">
            ${renderBarRow("1X", dc1x ?? 0, "home", "🧱", doubleChance.confidence)}
            ${renderBarRow("X2", dcx2 ?? 0, "draw", "🛡️", doubleChance.confidence)}
            ${renderBarRow("12", dc12 ?? 0, "away", "⚔️", doubleChance.confidence)}
          </div>
        </div>
      ` : ""}

      ${(Object.keys(dynamicScoreRanges).length > 0) ? `
        <div class="premium-section-card fade-in-up">
          <div class="section-title-wrap compact">
            <h4>🎯 Score range (${family})</h4>
            <p>Projection des plages de buts adaptées à la famille.</p>
          </div>
          <div class="premium-1x2-bars">
            ${Object.entries(dynamicScoreRanges).map(([range, value]) => {
              const emoji = range.includes("0") ? "0️⃣" : range.includes("3") ? "3️⃣" : range.includes("6") ? "6️⃣" : "9️⃣";
              const colorClass = value > 0.5 ? "home" : value > 0.3 ? "draw" : "away";
              return renderBarRow(range, value, colorClass, emoji, scoreRange.confidence);
            }).join('')}
          </div>
        </div>
      ` : ""}

      ${(cleanSheetHomeYes !== null || cleanSheetAwayYes !== null || dnbHome !== null || dnbAway !== null || bothHalvesYes !== null || bothHalvesNo !== null) ? `
        <div class="premium-section-card fade-in-up">
          <div class="section-title-wrap compact">
            <h4>🧠 Signaux avancés</h4>
            <p>Clean sheet, draw no bet et domination mi-temps.</p>
          </div>
          <div class="stats-grid-premium">
            ${renderStatCard("CS domicile", cleanSheetHomeYes !== null ? `${Math.round(cleanSheetHomeYes * 100)}%` : "N/A", "cyan", cleanSheet.confidence)}
            ${renderStatCard("CS extérieur", cleanSheetAwayYes !== null ? `${Math.round(cleanSheetAwayYes * 100)}%` : "N/A", "cyan", cleanSheet.confidence)}
            ${renderStatCard("DNB domicile", dnbHome !== null ? `${Math.round(dnbHome * 100)}%` : "N/A", "green", drawNoBet.confidence)}
            ${renderStatCard("DNB extérieur", dnbAway !== null ? `${Math.round(dnbAway * 100)}%` : "N/A", "green", drawNoBet.confidence)}
            ${renderStatCard("Gagne 2 mi-temps", bothHalvesYes !== null ? `${Math.round(bothHalvesYes * 100)}%` : "N/A", "red", winBothHalves.confidence)}
            ${renderStatCard("Ne gagne pas 2 mi-temps", bothHalvesNo !== null ? `${Math.round(bothHalvesNo * 100)}%` : "N/A", "amber", winBothHalves.confidence)}
          </div>
        </div>
      ` : ""}

      <div class="premium-section-card fade-in-up">
        <div class="section-title-wrap compact">
          <h4>📈 Historique & statistiques</h4>
          <p>Résumé rapide pour lecture mobile premium.</p>
        </div>
        <div class="stats-grid-premium">
          ${statsCards}
        </div>
      </div>

      <div class="prediction-tools fade-in-up">
        <button type="button" id="clearCacheBtn" class="api-action-btn secondary">Vider le cache IA</button>
      </div>
    </div>
  `;
}

async function loadMatchPrediction() {
  if (!currentMatchData) return;

  const resultDiv = document.getElementById("predictionResult");
  if (!resultDiv) return;

  updatePredictionStatus(true, "Analyse en cours...");
  resultDiv.innerHTML = '<div class="loading-card premium-loading-card"><div class="loading-spinner"></div><p>Analyse IA en cours...</p></div>';

  try {
    const exactLeague = await resolveExactPredictionLeagueName(currentMatchData.league);
    const data = await window.SiteAPI.prediction(
      currentMatchData.team1,
      currentMatchData.team2,
      exactLeague,
      currentMatchData,
    );
    const modelInfoResponse = await window.SiteAPI.predictionModelInfo(exactLeague).catch(() => null);

    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    currentPredictionData = data.prediction;
    window.currentPredictionData = currentPredictionData;

    if (data.prediction?.predictions) {
      resultDiv.innerHTML = renderPredictionContent(currentMatchData, data.prediction, modelInfoResponse?.info || null);
      attachPredictionToolEvents();
      updatePredictionStatus(true, "Analyse terminée");
      const nowText = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
      if (updatedAt) updatedAt.textContent = nowText;
      if (mobileUpdatedAt) mobileUpdatedAt.textContent = nowText;
      return;
    }

    throw new Error("Aucune prédiction exploitable reçue");
  } catch (error) {
    console.error("Erreur de prédiction:", error);
    resultDiv.innerHTML = `
      <div class="error-message">
        <p>Impossible de charger la prédiction: ${escapeHtml(error.message)}</p>
      </div>
    `;
    updatePredictionStatus(false, "Erreur d'analyse");
  }
}

function attachPredictionToolEvents() {
  const clearCacheBtn = document.getElementById("clearCacheBtn");

  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", async () => {
      try {
        await window.SiteAPI.predictionClearCache();
      } catch (error) {
        console.error("Erreur de vidage cache:", error);
      }
    });
  }
}
