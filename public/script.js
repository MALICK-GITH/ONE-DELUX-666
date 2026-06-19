/**
 * FURY X ONE 👿 - Main Application Script
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
    const data = await window.SiteAPI.matches();
    
    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    allMatches = data.matches || [];
    updateLeagueFilter(allMatches);
    filterAndRenderMatches();
    updateStatusStats(allMatches);

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

  const matches = allMatches || [];
  const breakdown = {
    a_venir: matches.filter(m => m.isUpcoming).length,
    en_cours: matches.filter(m => m.isLive).length,
    terminé: matches.filter(m => m.isFinished).length,
  };
  const total = matches.length;

  statsContainer.innerHTML = `
    <article class="stat-item">
      <span>Total</span>
      <strong>${total}</strong>
    </article>
    <article class="stat-item">
      <span>A venir</span>
      <strong>${breakdown.a_venir}</strong>
    </article>
    <article class="stat-item">
      <span>En cours</span>
      <strong>${breakdown.en_cours}</strong>
    </article>
    <article class="stat-item">
      <span>Termines</span>
      <strong>${breakdown.terminé}</strong>
    </article>
  `;
}

function createMatchCard(match) {
  const article = document.createElement("article");
  article.className = "match-card";
  article.dataset.matchId = match.id;

  const odds = match.odds || {};
  const score = getMatchScore(match);
  const isLiveOrFinished = getMatchStatusKey(match) === "en_cours" || getMatchStatusKey(match) === "live" || getMatchStatusKey(match) === "terminé" || getMatchStatusKey(match) === "finished";

  article.innerHTML = `
    <div class="match-header">
      <div class="match-info">
        <p class="match-league">${match.league || "Compétition virtuelle"}</p>
        <div class="match-teams">
          ${match.homeLogo ? `<img src="${match.homeLogo}" alt="${match.team1}" class="team-logo" onerror="this.style.display='none'">` : ''}
          <h3 class="match-title">${match.team1} vs ${match.team2}</h3>
          ${match.awayLogo ? `<img src="${match.awayLogo}" alt="${match.team2}" class="team-logo" onerror="this.style.display='none'">` : ''}
        </div>
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
      <button class="prediction-btn" onclick="loadPrediction('${match.id}', '${match.team1}', '${match.team2}', '${match.league}')">🔮 Prédiction IA</button>
      <a class="detail-link" href="/match.html?id=${encodeURIComponent(match.id)}">Voir les détails →</a>
    </div>
  `;

  return article;
}

async function loadPrediction(matchId, team1, team2, league) {
  try {
    const data = await window.SiteAPI.prediction(team1, team2, league);
    
    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    const prediction = data.prediction;
    const matchCard = document.querySelector(`[data-match-id="${matchId}"]`);
    
    if (matchCard && prediction.predictions) {
      const predictionSection = matchCard.querySelector('.prediction-section');
      const x2 = prediction.predictions['1x2'] || {};
      const totalGoals = prediction.predictions.total_goals || {};
      const btts = prediction.predictions.btts || {};
      const meta = prediction.meta || {};
      
      predictionSection.innerHTML = `
        <div class="prediction-result">
          <span class="prediction-label">🔮 IA Prediction:</span>
          <div class="prediction-bars">
            <div class="prediction-bar">
              <span class="prediction-team">1</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${(x2.home * 100).toFixed(0)}%"></div>
              </div>
              <span class="prediction-percent">${(x2.home * 100).toFixed(0)}%</span>
            </div>
            <div class="prediction-bar">
              <span class="prediction-team">X</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${(x2.draw * 100).toFixed(0)}%"></div>
              </div>
              <span class="prediction-percent">${(x2.draw * 100).toFixed(0)}%</span>
            </div>
            <div class="prediction-bar">
              <span class="prediction-team">2</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${(x2.away * 100).toFixed(0)}%"></div>
              </div>
              <span class="prediction-percent">${(x2.away * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div class="prediction-details">
            ${prediction.predictions.exact_score ? `<span class="prediction-score">Score: ${prediction.predictions.exact_score.prediction}</span>` : ''}
            ${totalGoals.predicted ? `<span class="prediction-total">Total Buts: ${totalGoals.predicted.toFixed(1)} ${totalGoals.platform_value ? `(Plateforme: ${totalGoals.platform_value})` : ''}</span>` : ''}
            ${btts.yes ? `<span class="prediction-btts">BTTS: OUI ${(btts.yes * 100).toFixed(0)}% / NON ${(btts.no * 100).toFixed(0)}%</span>` : ''}
            ${meta.lambda_home ? `<span class="prediction-meta">λ Home: ${meta.lambda_home.toFixed(2)} / Away: ${meta.lambda_away.toFixed(2)}</span>` : ''}
          </div>
        </div>
        <a class="detail-link" href="/match.html?id=${encodeURIComponent(matchId)}">Voir les détails →</a>
      `;
    }
  } catch (error) {
    console.error("Erreur de prédiction:", error);
    alert("Impossible de charger la prédiction: " + error.message);
  }
}
