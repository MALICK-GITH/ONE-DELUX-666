/**
 * RUST SIT XPR - Match Detail Script
 * Adapté de ONE-DELUX
 * Signé: SOLITAIRE HACK
 */

const params = new URLSearchParams(window.location.search);
const matchId = params.get("id");

const matchDetail = document.getElementById("matchDetail");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");

const APP_VERSION = "2026.06.04-r1";

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  appVersionTag.textContent = `v${APP_VERSION}`;
  loadMatch();
});

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Non définie";
  }

  return new Date(timestamp * 1000).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short"
  });
}

async function loadMatch() {
  if (!matchId) {
    matchDetail.innerHTML = `
      <div class="error-message">
        <p>Aucun identifiant de match fourni. Retournez à l'accueil pour sélectionner un match.</p>
      </div>
    `;
    return;
  }

  matchDetail.innerHTML = '<div class="loading-card">Chargement du match...</div>';

  try {
    const response = await fetch(`/api/matches/${encodeURIComponent(matchId)}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    const match = data.match;
    renderMatchDetail(match);

    updatedAt.textContent = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
  } catch (error) {
    console.error("Erreur de chargement:", error);
    matchDetail.innerHTML = `
      <div class="error-message">
        <p>Impossible de charger le match: ${error.message}</p>
      </div>
    `;
  }
}

function renderMatchDetail(match) {
  const prediction = match.primaryPrediction || {};
  const aiPrediction = match.aiPrediction || {};
  const advancedPrediction = match.advancedPrediction || {};
  const odds = match.odds || {};
  const details = match.details || {};

  const html = `
    <div class="match-detail-container">
      <div class="match-detail-header">
        <h2>${match.team1} vs ${match.team2}</h2>
        <p class="match-detail-meta">${match.sport || "FIFA"} · ${match.league || "Compétition virtuelle"}</p>
      </div>
      
      <div class="match-detail-grid">
        <div class="detail-box">
          <span class="detail-label">Statut</span>
          <strong class="detail-value">${match.status || "Disponible"}</strong>
        </div>
        <div class="detail-box">
          <span class="detail-label">Période</span>
          <strong class="detail-value">${match.period || "-"}</strong>
        </div>
        <div class="detail-box">
          <span class="detail-label">Heure</span>
          <strong class="detail-value">${formatTimestamp(match.startTime)}</strong>
        </div>
        <div class="detail-box">
          <span class="detail-label">Pays</span>
          <strong class="detail-value">${match.country || "-"}</strong>
        </div>
      </div>
      
      <div class="match-odds-section">
        <h3>Cotes principales</h3>
        <div class="odds-grid">
          <div class="odd-box ${prediction.label?.includes("Victoire " + match.team1) ? "selected" : ""}">
            <span class="odd-label">1</span>
            <strong class="odd-value">${typeof odds.home === 'number' ? odds.home.toFixed(2) : odds.home || "-"}</strong>
          </div>
          <div class="odd-box ${prediction.label?.includes("nul") ? "selected" : ""}">
            <span class="odd-label">X</span>
            <strong class="odd-value">${typeof odds.draw === 'number' ? odds.draw.toFixed(2) : odds.draw || "-"}</strong>
          </div>
          <div class="odd-box ${prediction.label?.includes("Victoire " + match.team2) ? "selected" : ""}">
            <span class="odd-label">2</span>
            <strong class="odd-value">${typeof odds.away === 'number' ? odds.away.toFixed(2) : odds.away || "-"}</strong>
          </div>
        </div>
      </div>
      
      ${details.over || details.under ? `
        <div class="match-details-section">
          <h3>Détails supplémentaires</h3>
          <div class="detail-grid">
            ${details.over ? `
              <div class="detail-box">
                <span class="detail-label">Over</span>
                <strong class="detail-value">${details.over.line} · ${details.over.odd}</strong>
              </div>
            ` : ""}
            ${details.under ? `
              <div class="detail-box">
                <span class="detail-label">Under</span>
                <strong class="detail-value">${details.under.line} · ${details.under.odd}</strong>
              </div>
            ` : ""}
          </div>
        </div>
      ` : ""}
      
      <div class="match-prediction-section">
        <h3>Prédiction principale</h3>
        <div class="prediction-card">
          <div class="prediction-header">
            <span class="prediction-label">Recommandation</span>
            <strong class="prediction-value">${prediction.label || "Analyse indisponible"}</strong>
          </div>
          <div class="prediction-meta">
            ${prediction.odd ? `<span class="prediction-odd">Cote: ${prediction.odd}</span>` : ""}
            ${prediction.confidence ? `<span class="prediction-confidence">Confiance: ${prediction.confidence}%</span>` : ""}
          </div>
          ${prediction.model ? `<p class="prediction-model">Modèle: ${prediction.model}</p>` : ""}
          <p class="prediction-text">
            La prédiction principale pour ${match.team1} vs ${match.team2} est ${prediction.label || "en cours d'analyse"}.
            ${prediction.odd ? `Cote: ${prediction.odd}.` : ""}
            ${prediction.confidence ? `Confiance du modèle: ${prediction.confidence}%.` : ""}
            Le match est indiqué comme "${match.status || "disponible"}" dans la compétition ${match.league || "virtuelle"}.
          </p>
        </div>
      </div>

      ${aiPrediction.available ? `
        <div class="match-prediction-section">
          <h3>Prédiction IA</h3>
          <div class="prediction-card">
            <div class="prediction-header">
              <span class="prediction-label">Modèle entraîné</span>
              <strong class="prediction-value">${aiPrediction.label || "Analyse indisponible"}</strong>
            </div>
            <div class="prediction-meta">
              ${aiPrediction.odd ? `<span class="prediction-odd">Cote cible: ${aiPrediction.odd}</span>` : ""}
              ${aiPrediction.confidence ? `<span class="prediction-confidence">Confiance: ${aiPrediction.confidence}%</span>` : ""}
            </div>
            ${aiPrediction.exactScore ? `<p class="prediction-model">Score exact estimé: ${aiPrediction.exactScore}</p>` : ""}
            ${aiPrediction.modelScope ? `<p class="prediction-model">Portée du modèle: ${aiPrediction.modelScope}</p>` : ""}
          </div>
        </div>
      ` : ""}

      ${advancedPrediction.recommendation ? `
        <div class="match-prediction-section">
          <h3>Lecture système</h3>
          <div class="prediction-card">
            <div class="prediction-header">
              <span class="prediction-label">Consensus</span>
              <strong class="prediction-value">${advancedPrediction.label || "Analyse indisponible"}</strong>
            </div>
            <div class="prediction-meta">
              ${advancedPrediction.confidence ? `<span class="prediction-confidence">Score système: ${advancedPrediction.confidence}%</span>` : ""}
              ${advancedPrediction.consensus ? `<span class="prediction-odd">Mode: ${advancedPrediction.consensus}</span>` : ""}
            </div>
            ${advancedPrediction.sources?.market?.label ? `<p class="prediction-model">Marché: ${advancedPrediction.sources.market.label}</p>` : ""}
            ${advancedPrediction.sources?.ai?.label ? `<p class="prediction-model">IA: ${advancedPrediction.sources.ai.label}</p>` : ""}
          </div>
        </div>
      ` : ""}
      
      <div class="match-actions">
        <a class="action-link" href="/coupon.html">Générer un coupon avec ce match →</a>
      </div>
    </div>
  `;

  matchDetail.innerHTML = html;
}
