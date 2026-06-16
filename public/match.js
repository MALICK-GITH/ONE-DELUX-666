/**
 * FURY X ONE 👿 - Match Detail Script
 * Adapted from ONE-DELUX
 * Signed: SOLITAIRE HACK
 */

const params = new URLSearchParams(window.location.search);
const matchId = params.get("id");

const matchDetail = document.getElementById("matchDetail");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");
const apiStatus = document.getElementById("apiStatus");
const predictionStatus = document.getElementById("predictionStatus");
const refreshPredictionBtn = document.getElementById("refreshPredictionBtn");

const APP_VERSION = "2026.06.15-r2";

document.addEventListener("DOMContentLoaded", () => {
  appVersionTag.textContent = `v${APP_VERSION}`;
  setupEventListeners();
  checkApiHealth();
  loadMatch();
});

let currentMatchData = null;
let currentPredictionData = null;

// Rendre les données accessibles globalement pour visualGenerator.js
window.currentMatchData = currentMatchData;
window.currentPredictionData = currentPredictionData;

function setupEventListeners() {
  if (refreshPredictionBtn) {
    refreshPredictionBtn.addEventListener("click", refreshPrediction);
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
  if (apiStatus) {
    apiStatus.textContent = `API: ${isOnline ? "🟢" : "🔴"} ${message}`;
    apiStatus.style.color = isOnline ? "#00ff88" : "#ff4444";
  }
}

function updatePredictionStatus(isOnline, message) {
  if (predictionStatus) {
    const indicator = predictionStatus.querySelector(".status-indicator");
    const text = predictionStatus.querySelector(".status-text");
    
    if (indicator) {
      indicator.style.backgroundColor = isOnline ? "#00ff88" : "#ff4444";
      indicator.style.boxShadow = isOnline ? "0 0 10px rgba(0, 255, 136, 0.5)" : "0 0 10px rgba(255, 68, 68, 0.5)";
    }
    
    if (text) {
      text.textContent = message;
    }
  }
}

async function refreshPrediction() {
  if (!currentMatchData) return;
  
  if (refreshPredictionBtn) {
    refreshPredictionBtn.disabled = true;
    refreshPredictionBtn.textContent = "⏳ Rafraîchissement...";
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
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Non définie";

  const numeric = Number(timestamp);
  const date = Number.isFinite(numeric) ? new Date(numeric * 1000) : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Non définie";

  return date.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function formatScore(match) {
  const score = match?.score || {};
  const home = Number.isFinite(Number(score.home)) ? Number(score.home) : null;
  const away = Number.isFinite(Number(score.away)) ? Number(score.away) : null;

  if (home === null && away === null) return null;
  return `${home ?? 0} - ${away ?? 0}`;
}

async function loadMatch() {
  console.log("loadMatch appelé, matchId:", matchId);
  
  if (!matchId) {
    console.error("Aucun matchId fourni");
    matchDetail.innerHTML = `
      <div class="error-message">
        <p>Aucun identifiant de match fourni. Retournez à l'accueil pour sélectionner un match.</p>
        <a href="/">← Retour à l'accueil</a>
      </div>
    `;
    return;
  }

  matchDetail.innerHTML = `
    <div class="loading-card">
      <div class="loading-spinner"></div>
      <p>Chargement de l'analyse IA...</p>
    </div>
  `;

  try {
    console.log("Appel API pour matchId:", matchId);
    const data = await window.SiteAPI.matchById(matchId);
    console.log("Réponse API reçue:", data);
    
    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    currentMatchData = data.match;
    window.currentMatchData = currentMatchData;
    console.log("Données du match chargées:", currentMatchData);
    renderMatchDetail(currentMatchData);
    updatedAt.textContent = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
  } catch (error) {
    console.error("Erreur de chargement du match:", error);
    matchDetail.innerHTML = `
      <div class="error-message">
        <p>Impossible de charger le match: ${error.message}</p>
        <a href="/">← Retour à l'accueil</a>
      </div>
    `;
  }
}

function renderMatchDetail(match) {
  const odds = match.odds || {};
  const score = match.score || {};
  const statusText = match.statusText || match.status || "Disponible";

  matchDetail.innerHTML = `
    <div class="match-detail-container">
      <div class="match-header">
        <p class="match-league">${match.league || "Compétition virtuelle"}</p>
        <div class="match-teams-detail">
          ${match.homeLogo ? `<img src="${match.homeLogo}" alt="${match.team1}" class="team-logo-large" onerror="this.style.display='none'">` : ''}
          <h1 class="match-title">${match.team1} vs ${match.team2}</h1>
          ${match.awayLogo ? `<img src="${match.awayLogo}" alt="${match.team2}" class="team-logo-large" onerror="this.style.display='none'">` : ''}
        </div>
        <p class="match-meta">
          <span class="match-status">${statusText}</span>
          ${match.period ? `<span class="match-period">· ${match.period}</span>` : ""}
        </p>
      </div>

      ${score ? `
        <div class="match-score">
          <span class="score-home">${score.home || 0}</span>
          <span class="score-separator">-</span>
          <span class="score-away">${score.away || 0}</span>
        </div>
      ` : ''}

      <div class="match-odds-section">
        <h3>Cotes</h3>
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

      <div class="match-prediction-section">
        <h3>🔮 Prédiction IA</h3>
        <div id="predictionResult"><div class="loading-card">Chargement de la prédiction...</div></div>
      </div>

      <div class="match-details-section">
        <h3>Détails</h3>
        <p><strong>Date:</strong> ${match.startTime ? new Date(match.startTime).toLocaleString("fr-FR") : "Non disponible"}</p>
        <p><strong>Statut:</strong> ${statusText}</p>
      </div>
    </div>
  `;

  // Charger automatiquement la prédiction après le rendu
  loadMatchPrediction();
}

async function loadMatchPrediction() {
  if (!currentMatchData) return;

  const resultDiv = document.getElementById("predictionResult");
  if (!resultDiv) return;

  updatePredictionStatus(true, "Analyse en cours...");
  resultDiv.innerHTML = '<div class="loading-card"><div class="loading-spinner"></div><p>Analyse IA en cours...</p></div>';

  try {
    const data = await window.SiteAPI.prediction(currentMatchData.team1, currentMatchData.team2, currentMatchData.league);
    
    if (!data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    currentPredictionData = data.prediction;
    window.currentPredictionData = currentPredictionData;
    
    if (data.prediction.predictions) {
      const x2 = data.prediction.predictions['1x2'] || {};
      const totalGoals = data.prediction.predictions['total_goals'] || {};
      const handicap = data.prediction.predictions['handicap'] || {};
      
      // Déterminer la prédiction principale
      const maxProb = Math.max(x2.home || 0, x2.draw || 0, x2.away || 0);
      let mainPrediction = "N/A";
      let mainPredictionColor = "#666";
      
      if (maxProb === x2.home) {
        mainPrediction = `Victoire ${currentMatchData.team1}`;
        mainPredictionColor = "#00ff88";
      } else if (maxProb === x2.draw) {
        mainPrediction = "Match Nul";
        mainPredictionColor = "#ffaa00";
      } else if (maxProb === x2.away) {
        mainPrediction = `Victoire ${currentMatchData.team2}`;
        mainPredictionColor = "#ff4444";
      }
      
      resultDiv.innerHTML = `
        <div class="prediction-detail">
          <div class="prediction-main-result" style="border-left: 4px solid ${mainPredictionColor}">
            <div class="prediction-main-label">🎯 PRÉDICTION PRINCIPALE</div>
            <div class="prediction-main-value" style="color: ${mainPredictionColor}">${mainPrediction}</div>
            <div class="prediction-main-confidence">Confiance: ${(maxProb * 100).toFixed(1)}%</div>
          </div>
          
          <div class="prediction-1x2">
            <h4>📊 Analyse 1X2</h4>
            <div class="prediction-bars">
              <div class="prediction-bar">
                <span class="prediction-team">🏠 Domicile</span>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${(x2.home * 100).toFixed(0)}%; background: linear-gradient(90deg, #00ff88, #00cc6a);"></div>
                </div>
                <span class="prediction-percent" style="color: #00ff88">${(x2.home * 100).toFixed(1)}%</span>
              </div>
              <div class="prediction-bar">
                <span class="prediction-team">⚖️ Nul</span>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${(x2.draw * 100).toFixed(0)}%; background: linear-gradient(90deg, #ffaa00, #ff8800);"></div>
                </div>
                <span class="prediction-percent" style="color: #ffaa00">${(x2.draw * 100).toFixed(1)}%</span>
              </div>
              <div class="prediction-bar">
                <span class="prediction-team">✈️ Extérieur</span>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${(x2.away * 100).toFixed(0)}%; background: linear-gradient(90deg, #ff4444, #cc2222);"></div>
                </div>
                <span class="prediction-percent" style="color: #ff4444">${(x2.away * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          ${data.prediction.predictions.exact_score ? `
            <div class="prediction-exact">
              <h4>🎯 Score Exact Prédit</h4>
              <div class="prediction-score-box">
                <span class="prediction-score">${data.prediction.predictions.exact_score.prediction}</span>
                <span class="prediction-score-confidence">Confiance: ${(data.prediction.predictions.exact_score.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          ` : ''}
          
          ${totalGoals.predicted ? `
            <div class="prediction-goals">
              <h4>⚽ Total Buts Prédit</h4>
              <div class="prediction-value-box">
                <span class="prediction-value">${totalGoals.predicted.toFixed(1)}</span>
                <span class="prediction-value-label">buts</span>
              </div>
              ${totalGoals.over_under ? `
                <div class="prediction-over-under-grid">
                  ${Object.keys(totalGoals.over_under).sort((a, b) => parseFloat(a) - parseFloat(b)).map(threshold => `
                    <div class="over-under-item">
                      <span class="threshold-label">Over ${threshold}</span>
                      <div class="threshold-bar">
                        <div class="bar-fill over" style="width: ${(totalGoals.over_under[threshold].over * 100).toFixed(0)}%;"></div>
                      </div>
                      <span class="threshold-percent">${(totalGoals.over_under[threshold].over * 100).toFixed(1)}%</span>
                    </div>
                    <div class="over-under-item">
                      <span class="threshold-label">Under ${threshold}</span>
                      <div class="threshold-bar">
                        <div class="bar-fill under" style="width: ${(totalGoals.over_under[threshold].under * 100).toFixed(0)}%;"></div>
                      </div>
                      <span class="threshold-percent">${(totalGoals.over_under[threshold].under * 100).toFixed(1)}%</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${data.prediction.predictions.parity ? `
            <div class="prediction-parity">
              <h4>🔢 Parité</h4>
              <div class="prediction-parity-box">
                <div class="parity-item">
                  <span class="parity-label">Pair</span>
                  <div class="parity-bar">
                    <div class="bar-fill" style="width: ${(data.prediction.predictions.parity.pair * 100).toFixed(0)}%; background: #00ff88;"></div>
                  </div>
                  <span class="parity-value" style="color: #00ff88">${(data.prediction.predictions.parity.pair * 100).toFixed(1)}%</span>
                </div>
                <div class="parity-item">
                  <span class="parity-label">Impair</span>
                  <div class="parity-bar">
                    <div class="bar-fill" style="width: ${(data.prediction.predictions.parity.impair * 100).toFixed(0)}%; background: #ff4444;"></div>
                  </div>
                  <span class="parity-value" style="color: #ff4444">${(data.prediction.predictions.parity.impair * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${handicap && Object.keys(handicap).length > 0 ? `
            <div class="prediction-handicap">
              <h4>⚖️ Handicap</h4>
              <div class="prediction-handicap-grid">
                ${Object.keys(handicap).sort((a, b) => parseFloat(a) - parseFloat(b)).map(h => {
                  const hData = handicap[h];
                  const hNum = parseFloat(h);
                  const hLabel = hNum > 0 ? `+${hNum}` : hNum;
                  return `
                    <div class="handicap-item">
                      <span class="handicap-label">${hLabel}</span>
                      <div class="handicap-probs">
                        <div class="handicap-prob">
                          <span class="prob-label">Home</span>
                          <div class="prob-bar">
                            <div class="bar-fill" style="width: ${(hData.home * 100).toFixed(0)}%; background: #00ff88;"></div>
                          </div>
                          <span class="prob-value">${(hData.home * 100).toFixed(1)}%</span>
                        </div>
                        <div class="handicap-prob">
                          <span class="prob-label">Nul</span>
                          <div class="prob-bar">
                            <div class="bar-fill" style="width: ${(hData.draw * 100).toFixed(0)}%; background: #ffaa00;"></div>
                          </div>
                          <span class="prob-value">${(hData.draw * 100).toFixed(1)}%</span>
                        </div>
                        <div class="handicap-prob">
                          <span class="prob-label">Away</span>
                          <div class="prob-bar">
                            <div class="bar-fill" style="width: ${(hData.away * 100).toFixed(0)}%; background: #ff4444;"></div>
                          </div>
                          <span class="prob-value">${(hData.away * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
      
      updatePredictionStatus(true, "Analyse terminée");
    }
  } catch (error) {
    console.error("Erreur de prédiction:", error);
    resultDiv.innerHTML = `
      <div class="error-message">
        <p>Impossible de charger la prédiction: ${error.message}</p>
      </div>
    `;
    updatePredictionStatus(false, "Erreur d'analyse");
  }
}
