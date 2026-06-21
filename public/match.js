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
const PREDICTION_TIMEOUT_HINT = "Le service de prédiction met trop de temps à répondre.";

let currentMatchData = null;
let currentPredictionData = null;

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

function renderBarRow(label, value, colorClass, emoji) {
  const ratio = Math.max(0, Math.min(100, (safeNumber(value) ?? 0) * 100));
  return `
    <div class="premium-bar-row fade-in-up">
      <div class="premium-bar-head">
        <span class="premium-bar-label">${emoji} ${label}</span>
        <span class="premium-bar-value ${colorClass}">${ratio.toFixed(1)}%</span>
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

function renderStatCard(label, value, tone = "cyan") {
  return `
    <div class="premium-stat-card tone-${tone} fade-in-up">
      <span class="premium-stat-label">${label}</span>
      <strong class="premium-stat-value">${value}</strong>
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

async function loadMatch() {
  if (!matchId) {
    if (matchDetail) {
      matchDetail.innerHTML = `
        <div class="error-message">
          <p>Identifiant du match manquant.</p>
        </div>
      `;
    }
    updatePredictionStatus(false, "Match introuvable");
    return;
  }

  if (matchDetail) {
    matchDetail.innerHTML = `
      <div class="loading-card premium-loading-card">
        <div class="loading-spinner"></div>
        <p>Chargement du match...</p>
      </div>
    `;
  }

  try {
    const data = await window.SiteAPI.matchById(matchId);
    if (!data?.success || !data?.match) {
      throw new Error(data?.error || "Match introuvable");
    }

    currentMatchData = data.match;
    window.currentMatchData = currentMatchData;
    renderMatchDetail(currentMatchData);

    const nowText = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
    if (updatedAt) updatedAt.textContent = nowText;
    if (mobileUpdatedAt) mobileUpdatedAt.textContent = nowText;
  } catch (error) {
    console.error("Erreur chargement match:", error);
    if (matchDetail) {
      matchDetail.innerHTML = `
        <div class="error-message">
          <p>Impossible de charger le match: ${escapeHtml(error.message)}</p>
        </div>
      `;
    }
    updatePredictionStatus(false, "Erreur chargement match");
  }
}

function renderPredictionContent(match, prediction) {
  const x2 = prediction?.predictions?.["1x2"] || {};
  const totalGoals = prediction?.predictions?.total_goals || {};
  const handicap = prediction?.predictions?.handicap || {};
  const parity = prediction?.predictions?.parity || {};
  const btts = prediction?.predictions?.btts || {};
  const family = normalizeText(prediction?.family, "HIGHSCORE");
  const mainPrediction = getMainPrediction(x2, match);
  const predictedGoals = safeNumber(totalGoals.predicted);
  const handicapPredicted = safeNumber(handicap.predicted);
  const parityPair = safeNumber(parity.pair);
  const parityImpair = safeNumber(parity.impair);
  const overValue = safeNumber(totalGoals?.over_under?.over);
  const underValue = safeNumber(totalGoals?.over_under?.under);
  const bttsYes = safeNumber(btts.yes);
  const bttsNo = safeNumber(btts.no);

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

  const statsCards = [
    renderStatCard("Confiance IA", formatPercent(mainPrediction.confidence), "red"),
    renderStatCard("Famille", family, "cyan"),
    renderStatCard("Total buts", predictedGoals !== null ? predictedGoals.toFixed(1) : "N/A", "amber"),
    renderStatCard("BTTS", bttsYes !== null && bttsNo !== null ? `${(Math.max(bttsYes, bttsNo) * 100).toFixed(0)}%` : "N/A", "green"),
    renderStatCard("Parité pair", parityPair !== null ? `${(parityPair * 100).toFixed(0)}%` : "N/A", "cyan"),
    renderStatCard("Handicap", handicapPredicted !== null ? handicapPredicted.toFixed(1) : normalizeText(handicap?.platform_value, "N/A"), "red"),
  ].join("");

  return `
    <div class="prediction-detail premium-prediction-layout">
      <div class="prediction-main-result premium-main-result ${mainPrediction.accentClass} fade-in-up">
        <div class="prediction-main-label">🎯 PRÉDICTION PRINCIPALE</div>
        <div class="prediction-main-value" style="color:${mainPrediction.color}">${normalizeText(mainPrediction.label)}</div>
        <div class="prediction-main-confidence">Confiance ${formatPercent(mainPrediction.confidence)}</div>
        <div class="prediction-family-badge">Famille ${family}</div>
      </div>

      <div class="premium-section-card fade-in-up">
        <div class="section-title-wrap compact">
          <h4>📊 Analyse 1X2</h4>
        </div>
        <div class="premium-1x2-bars">
          ${renderBarRow("Domicile", x2.home, "home", "🏠")}
          ${renderBarRow("Nul", x2.draw, "draw", "⚖️")}
          ${renderBarRow("Extérieur", x2.away, "away", "✈️")}
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
            ${renderBarRow("Oui", bttsYes ?? 0, "home", "✅")}
            ${renderBarRow("Non", bttsNo ?? 0, "away", "⛔")}
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
    const data = await window.SiteAPI.prediction(
      currentMatchData.team1,
      currentMatchData.team2,
      currentMatchData.league,
    );

    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    currentPredictionData = data.prediction;
    window.currentPredictionData = currentPredictionData;

    if (data.prediction?.predictions) {
      resultDiv.innerHTML = renderPredictionContent(currentMatchData, data.prediction);
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
    const message = String(error?.message || "");
    const isTimeout = message.toLowerCase().includes("timeout");
    resultDiv.innerHTML = `
      <div class="error-message">
        <p>Impossible de charger la prédiction: ${escapeHtml(isTimeout ? PREDICTION_TIMEOUT_HINT : error.message)}</p>
        ${isTimeout ? "<p>Réessaie avec le bouton de rafraîchissement dans quelques secondes.</p>" : ""}
      </div>
    `;
    updatePredictionStatus(false, isTimeout ? "Prédiction expirée" : "Erreur d'analyse");
  }
}

function attachPredictionToolEvents() {
  const clearCacheBtn = document.getElementById("clearCacheBtn");
  if (!clearCacheBtn) return;

  clearCacheBtn.addEventListener("click", async () => {
    clearCacheBtn.disabled = true;
    clearCacheBtn.textContent = "Vidage...";

    try {
      const data = await window.SiteAPI.predictionClearCache();
      if (!data?.success) {
        throw new Error(data?.error || "Impossible de vider le cache");
      }
      updatePredictionStatus(true, "Cache vidé");
      await loadMatchPrediction();
    } catch (error) {
      console.error("Erreur clear cache:", error);
      updatePredictionStatus(false, "Erreur cache IA");
    } finally {
      clearCacheBtn.disabled = false;
      clearCacheBtn.textContent = "Vider le cache IA";
    }
  });
}

