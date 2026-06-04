/**
 * RUST SIT XPR - Main Application Script
 * Adapté de ONE-DELUX
 * Signé: SOLITAIRE HACK
 */

const matchesContainer = document.getElementById("matches");
const refreshBtn = document.getElementById("refreshBtn");
const leagueSelect = document.getElementById("leagueSelect");
const emptyState = document.getElementById("emptyState");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");
const matchModes = document.getElementById("matchModes");

let allMatches = [];
let currentMode = "upcoming";
const APP_VERSION = "2026.06.04-r1";

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
    filtered = filtered.filter(m => m.status === "En cours");
  } else if (currentMode === "finished") {
    filtered = filtered.filter(m => m.status === "Terminé");
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

function createMatchCard(match) {
  const article = document.createElement("article");
  article.className = "match-card";
  article.dataset.matchId = match.id;

  const prediction = match.primaryPrediction || {};
  const odds = match.odds || {};

  article.innerHTML = `
    <div class="match-header">
      <div class="match-info">
        <p class="match-league">${match.league || "Compétition virtuelle"}</p>
        <h3 class="match-title">${match.team1} vs ${match.team2}</h3>
        <p class="match-meta">
          <span class="match-status">${match.status || "Disponible"}</span>
          ${match.period ? `<span class="match-period">· ${match.period}</span>` : ""}
        </p>
      </div>
    </div>
    
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
