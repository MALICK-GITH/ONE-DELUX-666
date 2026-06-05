/**
 * RUST SIT XPR - Match Detail Script
 * Adapted from ONE-DELUX
 * Signed: SOLITAIRE HACK
 */

const params = new URLSearchParams(window.location.search);
const matchId = params.get("id");

const matchDetail = document.getElementById("matchDetail");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");
const visualFormatSelect = document.getElementById("visualFormatSelect");
const visualQualitySelect = document.getElementById("visualQualitySelect");

const APP_VERSION = "2026.06.04-r2";

document.addEventListener("DOMContentLoaded", () => {
  appVersionTag.textContent = `v${APP_VERSION}`;
  loadMatch();
  setupVisualGenerator();
});

function setupVisualGenerator() {
  const generateBtn = document.getElementById("generateVisualBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", handleGenerateVisual);
  }
}

function getVisualSettings() {
  return {
    exportFormat: visualFormatSelect?.value || "png",
    quality: Number(visualQualitySelect?.value || 0.92),
  };
}

let currentMatchData = null;

async function handleGenerateVisual() {
  if (!currentMatchData) {
    alert("Veuillez charger un match d'abord");
    return;
  }

  const generateBtn = document.getElementById("generateVisualBtn");
  generateBtn.disabled = true;
  generateBtn.textContent = "⏳ Génération...";

  try {
    const visualData = {
      league: currentMatchData.league,
      homeTeam: currentMatchData.team1,
      awayTeam: currentMatchData.team2,
      prediction: currentMatchData.primaryPrediction?.label || currentMatchData.primaryPrediction?.recommendation || "1",
      odds: currentMatchData.odds?.home || currentMatchData.primaryPrediction?.odd || 1.5,
      confidence: currentMatchData.primaryPrediction?.confidence || 0,
      matchId: currentMatchData.id,
      startTime: currentMatchData.startTime,
      generatedAt: new Date().toISOString(),
    };

    const result = await window.visualGenerator.generatePredictionImage(visualData, {
      ...getVisualSettings(),
    });

    if (result.success) {
      window.visualGenerator.showShareModal(result.imageUrl, result.blob, result.pdfBlob, result.fileExtension);
    } else {
      throw new Error(result.error || "Erreur lors de la génération");
    }
  } catch (error) {
    console.error("Erreur lors de la génération du visuel:", error);
    alert("Erreur lors de la génération du visuel: " + error.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "📸 Générer l'image";
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
    currentMatchData = match;
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
  const odds = match.odds || {};
  const details = match.details || {};
  const score = formatScore(match);
  const normalizedStatus = String(match.statusNormalized || match.normalizedStatus || "").toLowerCase().trim();
  const showScore = Boolean(score) && (
    normalizedStatus === "en_cours" ||
    normalizedStatus === "live" ||
    normalizedStatus === "terminé" ||
    normalizedStatus === "termine" ||
    normalizedStatus === "finished"
  );

  const html = `
    <div class="match-detail-container">
      <div class="match-detail-header">
        <h2>${match.team1} vs ${match.team2}</h2>
        <p class="match-detail-meta">${match.sport || "FIFA"} · ${match.league || "Compétition virtuelle"}</p>
      </div>

      ${showScore ? `
        <div class="match-score-banner">
          <span class="detail-label">Score actuel</span>
          <strong class="detail-score">${score}</strong>
        </div>
      ` : ""}

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
          <span class="detail-label">Début</span>
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
            <strong class="odd-value">${typeof odds.home === "number" ? odds.home.toFixed(2) : odds.home || "-"}</strong>
          </div>
          <div class="odd-box ${prediction.label?.includes("nul") ? "selected" : ""}">
            <span class="odd-label">X</span>
            <strong class="odd-value">${typeof odds.draw === "number" ? odds.draw.toFixed(2) : odds.draw || "-"}</strong>
          </div>
          <div class="odd-box ${prediction.label?.includes("Victoire " + match.team2) ? "selected" : ""}">
            <span class="odd-label">2</span>
            <strong class="odd-value">${typeof odds.away === "number" ? odds.away.toFixed(2) : odds.away || "-"}</strong>
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
        <h3>Prédiction du modèle</h3>
        <div class="prediction-card">
          <div class="prediction-header">
            <span class="prediction-label">Source unique</span>
            <strong class="prediction-value">${prediction.label || "Analyse indisponible"}</strong>
          </div>
          <div class="prediction-meta">
            ${prediction.confidence ? `<span class="prediction-confidence">Confiance: ${prediction.confidence}%</span>` : ""}
          </div>
          ${prediction.model ? `<p class="prediction-model">Modèle: ${prediction.model}</p>` : ""}
          ${prediction.exactScore ? `<p class="prediction-model">Score exact estimé: ${prediction.exactScore}</p>` : ""}
          ${prediction.modelVersion ? `<p class="prediction-model">Version du modèle: ${prediction.modelVersion}</p>` : ""}
          ${prediction.modelFile ? `<p class="prediction-model">Fichier modèle: ${prediction.modelFile}</p>` : ""}
          ${prediction.reportFile ? `<p class="prediction-model">Rapport: ${prediction.reportFile}</p>` : ""}
          ${prediction.metrics?.resultAccuracy ? `<p class="prediction-model">Accuracy validation: ${(prediction.metrics.resultAccuracy * 100).toFixed(2)}%</p>` : ""}
          ${prediction.trainSize ? `<p class="prediction-model">Train: ${prediction.trainSize} | Valid: ${prediction.validSize ?? "-"}</p>` : ""}
          <p class="prediction-text">
            La seule source de prédiction pour ${match.team1} vs ${match.team2} est le modèle entraîné.
            ${prediction.confidence ? `Confiance du modèle: ${prediction.confidence}%.` : ""}
            Le match est indiqué comme "${match.status || "disponible"}" dans la compétition ${match.league || "virtuelle"}.
          </p>
        </div>
      </div>

      <div class="match-actions">
        <a class="action-link" href="/coupon.html">Générer un coupon avec ce match →</a>
      </div>

      <footer class="model-signature">
        <span>Modèle entraîné et interface signés par SOLITAIRE HACK</span>
      </footer>
    </div>
  `;

  matchDetail.innerHTML = html;
}
