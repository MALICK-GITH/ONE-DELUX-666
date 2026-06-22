/**
 * FURY X ONE - Main Application Script
 * Live feed, filters and quick prediction rendering
 */

const matchesContainer = document.getElementById("matches");
const statsContainer = document.getElementById("stats");
const refreshBtn = document.getElementById("refreshBtn");
const leagueSelect = document.getElementById("leagueSelect");
const emptyState = document.getElementById("emptyState");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");
const matchModes = document.getElementById("matchModes");

const mobileRefreshBtn = document.getElementById("mobileRefreshBtn");
const mobileLeagueSelect = document.getElementById("mobileLeagueSelect");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileNav = document.getElementById("mobileNav");
const mobileMatchModes = document.getElementById("mobileMatchModes");
const mobileUpdatedAt = document.getElementById("mobileUpdatedAt");
const mobileAppVersionTag = document.getElementById("mobileAppVersionTag");

const APP_VERSION = "2026.06.20-r1";
const DEFAULT_TEAM_LOGO = "/icons/icon-192x192.svg";

let allMatches = [];
let currentMode = "live";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return escapeHtml(value);
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatPercent(value) {
  const numeric = safeNumber(value);
  return numeric === null ? "-" : `${(numeric * 100).toFixed(0)}%`;
}

function formatOdd(value) {
  const numeric = safeNumber(value);
  return numeric === null ? "-" : numeric.toFixed(2);
}

function getMatchStatusKey(match) {
  return String(match?.normalizedStatus || match?.statusNormalized || match?.status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isLiveStatus(status) {
  return status === "en_cours" || status === "live" || status === "in_progress";
}

function isUpcomingStatus(status) {
  return status === "a_venir" || status === "avenir" || status === "upcoming";
}

function isFinishedStatus(status) {
  return status === "termine" || status === "finished" || status === "ended";
}

function getDisplayStatus(match) {
  const status = getMatchStatusKey(match);
  if (isLiveStatus(status)) return "En cours";
  if (isFinishedStatus(status)) return "Terminé";
  if (isUpcomingStatus(status)) return "À venir";
  return safeText(match?.status, "Disponible");
}

function formatKickoffTime(value) {
  if (value === undefined || value === null || value === "") return "Heure non définie";
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Heure non définie";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function getMatchScore(match) {
  const score = match?.score || {};
  const home = safeNumber(score.home);
  const away = safeNumber(score.away);
  if (home === null && away === null) return null;
  return { home: home ?? 0, away: away ?? 0 };
}

function getTeamLogo(logo) {
  return logo ? escapeHtml(logo) : DEFAULT_TEAM_LOGO;
}

function resolveBestMode(matches) {
  const list = Array.isArray(matches) ? matches : [];
  const liveCount = list.filter((match) => isLiveStatus(getMatchStatusKey(match))).length;
  const upcomingCount = list.filter((match) => isUpcomingStatus(getMatchStatusKey(match))).length;
  const finishedCount = list.filter((match) => isFinishedStatus(getMatchStatusKey(match))).length;

  if (currentMode === "live" && liveCount > 0) return "live";
  if (currentMode === "upcoming" && upcomingCount > 0) return "upcoming";
  if (currentMode === "finished" && finishedCount > 0) return "finished";
  if (liveCount > 0) return "live";
  if (upcomingCount > 0) return "upcoming";
  if (finishedCount > 0) return "finished";
  return "live";
}

function syncModeButtons() {
  const groups = [matchModes, mobileMatchModes].filter(Boolean);
  groups.forEach((group) => {
    group.querySelectorAll(".match-mode").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === currentMode);
    });
  });
}

function syncUpdatedAt(text) {
  if (updatedAt) updatedAt.textContent = text;
  if (mobileUpdatedAt) mobileUpdatedAt.textContent = text;
}

function updateLeagueFilter(matches) {
  const leagues = [...new Set(matches.map((match) => match.league).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const currentDesktop = leagueSelect?.value || "all";
  const currentMobile = mobileLeagueSelect?.value || currentDesktop;

  const fillSelect = (select, value) => {
    if (!select) return;
    select.innerHTML = '<option value="all">Toutes les ligues</option>';
    leagues.forEach((league) => {
      const option = document.createElement("option");
      option.value = league;
      option.textContent = league;
      select.appendChild(option);
    });
    select.value = leagues.includes(value) ? value : "all";
  };

  fillSelect(leagueSelect, currentDesktop);
  fillSelect(mobileLeagueSelect, currentMobile);

  if (leagueSelect && mobileLeagueSelect) {
    mobileLeagueSelect.value = leagueSelect.value;
  }
}

function updateStatusStats(matches) {
  if (!statsContainer) return;
  const list = Array.isArray(matches) ? matches : [];
  const breakdown = {
    upcoming: list.filter((match) => match?.isUpcoming || isUpcomingStatus(getMatchStatusKey(match))).length,
    live: list.filter((match) => match?.isLive || isLiveStatus(getMatchStatusKey(match))).length,
    finished: list.filter((match) => match?.isFinished || isFinishedStatus(getMatchStatusKey(match))).length,
  };

  statsContainer.innerHTML = `
    <article class="stat-item">
      <span>Total</span>
      <strong>${list.length}</strong>
    </article>
    <article class="stat-item">
      <span>À venir</span>
      <strong>${breakdown.upcoming}</strong>
    </article>
    <article class="stat-item">
      <span>En cours</span>
      <strong>${breakdown.live}</strong>
    </article>
    <article class="stat-item">
      <span>Terminés</span>
      <strong>${breakdown.finished}</strong>
    </article>
  `;
}

function getFilteredMatches() {
  const selectedLeague = leagueSelect?.value || "all";
  let filtered = [...allMatches];

  if (selectedLeague !== "all") {
    filtered = filtered.filter((match) => match.league === selectedLeague);
  }

  if (currentMode === "live") {
    filtered = filtered.filter((match) => isLiveStatus(getMatchStatusKey(match)));
  } else if (currentMode === "finished") {
    filtered = filtered.filter((match) => isFinishedStatus(getMatchStatusKey(match)));
  } else if (currentMode === "upcoming") {
    filtered = filtered.filter((match) => isUpcomingStatus(getMatchStatusKey(match)));
  }

  return filtered;
}

function renderMatches(matches) {
  if (!matchesContainer) return;
  matchesContainer.innerHTML = "";

  if (!matches.length) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");
  matches.forEach((match) => matchesContainer.appendChild(createMatchCard(match)));
}

function filterAndRenderMatches() {
  renderMatches(getFilteredMatches());
}

function createMatchCard(match) {
  const article = document.createElement("article");
  article.className = "match-card";
  article.dataset.matchId = match.id;

  const odds = match.odds || {};
  const score = getMatchScore(match);
  const statusKey = getMatchStatusKey(match);
  const showScore = score && (isLiveStatus(statusKey) || isFinishedStatus(statusKey));
  const homeTeam = safeText(match.team1, "Équipe 1");
  const awayTeam = safeText(match.team2, "Équipe 2");

  article.innerHTML = `
    <div class="match-header">
      <div class="match-info">
        <p class="match-league">${safeText(match.league, "Compétition virtuelle")}</p>
        <div class="match-teams">
          <img src="${getTeamLogo(match.homeLogo)}" alt="${homeTeam}" class="team-logo" onerror="this.src='${DEFAULT_TEAM_LOGO}'">
          <h3 class="match-title">${homeTeam} vs ${awayTeam}</h3>
          <img src="${getTeamLogo(match.awayLogo)}" alt="${awayTeam}" class="team-logo" onerror="this.src='${DEFAULT_TEAM_LOGO}'">
        </div>
        <p class="match-meta">
          <span class="match-status">${getDisplayStatus(match)}</span>
          ${match.startTime ? `<span class="match-kickoff">Début: ${formatKickoffTime(match.startTime)}</span>` : ""}
          ${match.period ? `<span class="match-period">· ${safeText(match.period)}</span>` : ""}
        </p>
      </div>
    </div>

    ${showScore ? `
      <div class="match-score-strip">
        <span class="score-label">Score</span>
        <strong class="score-value">${score.home} - ${score.away}</strong>
      </div>
    ` : ""}

    <div class="odds-section">
      <div class="odds-grid">
        <div class="odd-box">
          <span class="odd-label">1</span>
          <strong class="odd-value">${formatOdd(odds.home)}</strong>
        </div>
        <div class="odd-box">
          <span class="odd-label">X</span>
          <strong class="odd-value">${formatOdd(odds.draw)}</strong>
        </div>
        <div class="odd-box">
          <span class="odd-label">2</span>
          <strong class="odd-value">${formatOdd(odds.away)}</strong>
        </div>
      </div>
    </div>

    <div class="prediction-section">
      <button class="prediction-btn" type="button" data-action="prediction">🔮 Prédiction IA</button>
      <a class="detail-link" href="/match.html?id=${encodeURIComponent(match.id)}">Voir les détails →</a>
    </div>
  `;

  const predictionBtn = article.querySelector('[data-action="prediction"]');
  if (predictionBtn) {
    predictionBtn.addEventListener("click", () => loadPrediction(match.id, match.team1, match.team2, match.league));
  }

  return article;
}

function renderPredictionRow(label, value) {
  return `
    <div class="prediction-bar">
      <span class="prediction-team">${label}</span>
      <div class="bar-container">
        <div class="bar-fill" style="width: ${safeNumber(value) !== null ? (safeNumber(value) * 100).toFixed(0) : 0}%"></div>
      </div>
      <span class="prediction-percent">${formatPercent(value)}</span>
    </div>
  `;
}

async function loadPrediction(matchId, team1, team2, league) {
  try {
    const data = await window.SiteAPI.prediction(team1, team2, league);
    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    const prediction = data.prediction;
    const matchCard = document.querySelector(`[data-match-id="${CSS.escape(String(matchId))}"]`);
    if (!matchCard || !prediction?.predictions) return;

    const predictionSection = matchCard.querySelector(".prediction-section");
    const x2 = prediction.predictions["1x2"] || {};
    const totalGoals = prediction.predictions.total_goals || {};
    const btts = prediction.predictions.btts || {};
    const parity = prediction.predictions.parity || {};
    const handicap = prediction.predictions.handicap || {};

    predictionSection.innerHTML = `
      <div class="prediction-result">
        <span class="prediction-label">🔮 IA Prediction</span>
        <div class="prediction-bars">
          ${renderPredictionRow("1", x2.home)}
          ${renderPredictionRow("X", x2.draw)}
          ${renderPredictionRow("2", x2.away)}
        </div>
        <div class="prediction-details">
          ${safeNumber(totalGoals.predicted) !== null ? `<span class="prediction-total">Total buts: ${safeNumber(totalGoals.predicted).toFixed(1)}${totalGoals.platform_value !== undefined ? ` (Plateforme: ${escapeHtml(totalGoals.platform_value)})` : ""}</span>` : ""}
          ${safeNumber(btts.yes) !== null ? `<span class="prediction-btts">BTTS: OUI ${formatPercent(btts.yes)} / NON ${formatPercent(btts.no)}</span>` : ""}
          ${safeNumber(parity.pair) !== null ? `<span class="prediction-btts">Parité: Pair ${formatPercent(parity.pair)} / Impair ${formatPercent(parity.impair)}</span>` : ""}
          ${handicap.platform_value !== undefined ? `<span class="prediction-total">Handicap: ${escapeHtml(handicap.platform_value)}</span>` : ""}
        </div>
      </div>
      <a class="detail-link" href="/match.html?id=${encodeURIComponent(matchId)}">Voir les détails →</a>
    `;
  } catch (error) {
    console.error("Erreur de prédiction:", error);
    alert(`Impossible de charger la prédiction: ${error.message}`);
  }
}

async function loadMatches() {
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Chargement...";
  }
  if (mobileRefreshBtn) {
    mobileRefreshBtn.disabled = true;
  }

  try {
    const data = await window.SiteAPI.matches();
    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    allMatches = Array.isArray(data.matches) ? data.matches : [];
    currentMode = resolveBestMode(allMatches);
    syncModeButtons();
    updateLeagueFilter(allMatches);
    updateStatusStats(allMatches);
    filterAndRenderMatches();
    syncUpdatedAt(`Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`);
  } catch (error) {
    console.error("Erreur de chargement:", error);
    if (matchesContainer) {
      matchesContainer.innerHTML = `
        <div class="error-message">
          <p>Impossible de charger les matchs: ${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "Actualiser";
    }
    if (mobileRefreshBtn) {
      mobileRefreshBtn.disabled = false;
    }
  }
}

function setupEventListeners() {
  refreshBtn?.addEventListener("click", loadMatches);
  mobileRefreshBtn?.addEventListener("click", loadMatches);

  leagueSelect?.addEventListener("change", () => {
    if (mobileLeagueSelect) mobileLeagueSelect.value = leagueSelect.value;
    filterAndRenderMatches();
  });

  mobileLeagueSelect?.addEventListener("change", () => {
    if (leagueSelect) leagueSelect.value = mobileLeagueSelect.value;
    filterAndRenderMatches();
  });

  [matchModes, mobileMatchModes].filter(Boolean).forEach((group) => {
    group.querySelectorAll(".match-mode").forEach((button) => {
      button.addEventListener("click", () => {
        currentMode = button.dataset.mode || "live";
        syncModeButtons();
        filterAndRenderMatches();
      });
    });
  });

  mobileMenuBtn?.addEventListener("click", () => {
    mobileNav?.classList.toggle("active");
  });

window.loadPrediction = loadPrediction;

document.addEventListener("DOMContentLoaded", () => {
  if (appVersionTag) appVersionTag.textContent = `v${APP_VERSION}`;
  if (mobileAppVersionTag) mobileAppVersionTag.textContent = `v${APP_VERSION}`;
  setupEventListeners();
  window.initAssistantWidget?.();
  loadMatches();
});

