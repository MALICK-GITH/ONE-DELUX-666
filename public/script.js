/**
 * RUST SIT XPR - Main Application Script
 * Adapté de ONE-DELUX
 * Signé: SOLITAIRE HACK
 */

const matchesContainer = document.getElementById("matches");
const statsContainer = document.getElementById("stats");
const refreshBtn = document.getElementById("refreshBtn");
const leagueSelect = document.getElementById("leagueSelect");
const emptyState = document.getElementById("emptyState");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");
const matchModes = document.getElementById("matchModes");

let allMatches = [];
let currentMode = "upcoming";
const APP_VERSION = "2026.06.04-r1";

function getMatchStatusKey(match) {
  return String(match?.normalizedStatus || match?.statusNormalized || match?.status || "")
    .toLowerCase()
    .trim();
}

function formatKickoffTime(value) {
  if (value === undefined || value === null || value === "") {
    return "Heure non définie";
  }

  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Heure non définie";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMatchScore(match) {
  const score = match?.score || {};
  const home = Number.isFinite(Number(score.home)) ? Number(score.home) : null;
  const away = Number.isFinite(Number(score.away)) ? Number(score.away) : null;

  if (home === null && away === null) return null;
  return {
    home: home ?? 0,
    away: away ?? 0,
  };
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  appVersionTag.textContent = `v${APP_VERSION}`;
  setupEventListeners();
  loadMatches();
});

function setupEventListeners() {
  refreshBtn.addEventListener("click", loadMatches);

  leagueSelect.addEventListener("change", () => {
    filterAndRenderMatches();
  });

  // Mode buttons
  const modeButtons = matchModes.querySelectorAll(".match-mode");
  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      filterAndRenderMatches();
    });
  });
}

async function loadMatches() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Chargement...";

  try {
    let endpoint = "/api/matches";

    // Charger les données selon le mode actuel
    if (currentMode === "upcoming") {
      endpoint = "/api/matches/upcoming";
    } else if (currentMode === "live") {
      endpoint = "/api/matches/live";
    } else if (currentMode === "finished") {
      endpoint = "/api/matches/finished";
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    allMatches = data.matches || [];
    updateLeagueFilter(allMatches);
    filterAndRenderMatches();
    updateStatusStats().catch((statsError) => {
      console.warn("Impossible de charger les statistiques de statut:", statsError);
    });

    updatedAt.textContent = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
  } catch (error) {
    console.error("Erreur de chargement:", error);
    matchesContainer.innerHTML = `
      <div class="error-message">
        <p>Impossible de charger les matchs: ${error.message}</p>
      </div>
    `;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Actualiser";
  }
}

function updateLeagueFilter(matches) {
  const leagues = new Set(matches.map(m => m.league).filter(Boolean));
  const currentValue = leagueSelect.value;

  leagueSelect.innerHTML = '<option value="all">Toutes les ligues</option>';

  leagues.forEach(league => {
    const option = document.createElement("option");
    option.value = league;
    option.textContent = league;
    leagueSelect.appendChild(option);
  });

  if (leagues.has(currentValue)) {
    leagueSelect.value = currentValue;
  }
}

function filterAndRenderMatches() {
  const selectedLeague = leagueSelect.value;

  let filtered = allMatches;

  // Filter by league
  if (selectedLeague !== "all") {
    filtered = filtered.filter(m => m.league === selectedLeague);
  }

  // Filter by mode (simulated for now)
  if (currentMode === "live") {
    filtered = filtered.filter((m) => {
      const status = getMatchStatusKey(m);
      return status === "en_cours" || status === "live";
    });
  } else if (currentMode === "finished") {
    filtered = filtered.filter((m) => {
      const status = getMatchStatusKey(m);
      return status === "terminé" || status === "finished";
    });
  } else if (currentMode === "upcoming") {
    filtered = filtered.filter((m) => {
      const status = getMatchStatusKey(m);
      return status === "a_venir" || status === "upcoming";
    });
  }

  renderMatches(filtered);
}

function renderMatches(matches) {
  matchesContainer.innerHTML = "";

  if (!matches.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  matches.forEach(match => {
    const card = createMatchCard(match);
    matchesContainer.appendChild(card);
  });
}

async function updateStatusStats() {
  if (!statsContainer) return;

  if (!globalThis.SiteAPI?.matchStatus) {
    statsContainer.innerHTML = "";
    return;
  }

  const data = await globalThis.SiteAPI.matchStatus();
  const breakdown = data?.statusBreakdown || {};
  const total = Number(data?.totalMatches || 0);

  statsContainer.innerHTML = `
    <article class="stat-item">
      <span>Total</span>
      <strong>${total}</strong>
    </article>
    <article class="stat-item">
      <span>A venir</span>
      <strong>${Number(breakdown.a_venir || 0)}</strong>
    </article>
    <article class="stat-item">
      <span>En cours</span>
      <strong>${Number(breakdown.en_cours || 0)}</strong>
    </article>
    <article class="stat-item">
      <span>Termines</span>
      <strong>${Number(breakdown["terminé"] || 0)}</strong>
    </article>
  `;
}

function createMatchCard(match) {
  const article = document.createElement("article");
  article.className = "match-card";
  article.dataset.matchId = match.id;

  const prediction = match.primaryPrediction || {};
  const odds = match.odds || {};
  const score = getMatchScore(match);
  const isLiveOrFinished = getMatchStatusKey(match) === "en_cours" || getMatchStatusKey(match) === "live" || getMatchStatusKey(match) === "terminé" || getMatchStatusKey(match) === "finished";

  article.innerHTML = `
    <div class="match-header">
      <div class="match-info">
        <p class="match-league">${match.league || "Compétition virtuelle"}</p>
        <h3 class="match-title">${match.team1} vs ${match.team2}</h3>
        <p class="match-meta">
          <span class="match-status">${match.status || "Disponible"}</span>
          ${match.startTime ? `<span class="match-kickoff">Début: ${formatKickoffTime(match.startTime)}</span>` : ""}
          ${match.period ? `<span class="match-period">· ${match.period}</span>` : ""}
        </p>
      </div>
    </div>
    
    ${isLiveOrFinished && score ? `
      <div class="match-score-strip">
        <span class="score-label">Score</span>
        <strong class="score-value">${score.home} - ${score.away}</strong>
      </div>
    ` : ""}
    
    <div class="odds-section">
      <div class="odds-grid">
        <div class="odd-box">
          <span class="odd-label">1</span>
          <strong class="odd-value">${typeof odds.home === 'number' ? odds.home.toFixed(2) : odds.home || "-"}</strong>
        </div>
        <div class="odd-box">
          <span class="odd-label">X</span>
          <strong class="odd-value">${typeof odds.draw === 'number' ? odds.draw.toFixed(2) : odds.draw || "-"}</strong>
        </div>
        <div class="odd-box">
          <span class="odd-label">2</span>
          <strong class="odd-value">${typeof odds.away === 'number' ? odds.away.toFixed(2) : odds.away || "-"}</strong>
        </div>
      </div>
    </div>
    
    <div class="prediction-section">
      <a class="detail-link" href="/match.html?id=${encodeURIComponent(match.id)}">Voir les détails et prédictions →</a>
    </div>
  `;

  return article;
}
