/**
 * RUST SIT XPR - Coupon Page Script
 * Adapté de ONE-DELUX
 * Signé: SOLITAIRE HACK
 */

const refreshBtn = document.getElementById("refreshBtn");
const sizeSelect = document.getElementById("sizeSelect");
const riskSelect = document.getElementById("riskSelect");
const couponSection = document.getElementById("couponSection");
const couponStats = document.getElementById("couponStats");
const ladderBtn = document.getElementById("ladderBtn");
const multiBtn = document.getElementById("multiBtn");
const validateBtn = document.getElementById("validateBtn");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");

let currentCoupon = null;
const APP_VERSION = "2026.06.04-r1";

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  appVersionTag.textContent = `v${APP_VERSION}`;
  setupEventListeners();
});

function setupEventListeners() {
  refreshBtn.addEventListener("click", generateCoupon);
  ladderBtn.addEventListener("click", generateLadder);
  multiBtn.addEventListener("click", generateMulti);
  validateBtn.addEventListener("click", validateCoupon);
}

async function generateCoupon() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Génération...";

  const size = parseInt(sizeSelect.value) || 3;
  const risk = riskSelect.value || "balanced";

  couponSection.innerHTML = '<div class="loading-card">Génération du coupon en cours...</div>';

  try {
    const response = await fetch(`/api/coupon?size=${size}&risk=${risk}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    currentCoupon = data;
    renderCoupon(data);
    updateStats(data);

    updatedAt.textContent = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
  } catch (error) {
    console.error("Erreur de génération:", error);
    couponSection.innerHTML = `
      <div class="error-message">
        <p>Impossible de générer le coupon: ${error.message}</p>
      </div>
    `;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Générer Coupon";
  }
}

function renderCoupon(data) {
  const coupon = data.coupon || [];
  const summary = data.summary || {};

  if (!coupon.length) {
    couponSection.innerHTML = '<div class="loading-card">Aucun match disponible pour le coupon</div>';
    return;
  }

  const html = `
    <div class="coupon-container">
      <div class="coupon-header">
        <h2>🎫 Coupon Généré</h2>
        <p class="coupon-meta">Taille: ${coupon.length} matchs | Risque: ${data.meta?.risk || "balanced"}</p>
      </div>
      
      <div class="coupon-items">
        ${coupon.map((item, index) => `
          <div class="coupon-item">
            <div class="coupon-item-header">
              <span class="coupon-item-number">${index + 1}</span>
              <div class="coupon-item-teams">
                <strong>${item.teamHome || "Équipe 1"}</strong>
                <span>vs</span>
                <strong>${item.teamAway || "Équipe 2"}</strong>
              </div>
            </div>
            <div class="coupon-item-details">
              <span class="coupon-prediction">${item.pari || "1"}</span>
              <span class="coupon-odd">Cote: ${typeof item.cote === 'number' ? item.cote.toFixed(2) : item.cote || "N/A"}</span>
              ${item.confidence ? `<span class="coupon-confidence">Confiance: ${item.confidence}%</span>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
      
      ${summary ? `
        <div class="coupon-summary">
          <div class="summary-item">
            <span>Cote combinée</span>
            <strong>${summary.combinedOdd ? summary.combinedOdd.toFixed(3) : "N/A"}</strong>
          </div>
          <div class="summary-item">
            <span>Gain potentiel</span>
            <strong>${summary.expectedReturn ? summary.expectedReturn.toFixed(2) + " FCFA" : "N/A"}</strong>
          </div>
          <div class="summary-item">
            <span>Sélections</span>
            <strong>${summary.totalSelections || coupon.length}</strong>
          </div>
        </div>
      ` : ""}
    </div>
  `;

  couponSection.innerHTML = html;
}

function updateStats(data) {
  const coupon = data.coupon || [];
  const summary = data.summary || {};

  couponStats.innerHTML = `
    <div class="stat-item">
      <span>Matchs</span>
      <strong>${coupon.length}</strong>
    </div>
    <div class="stat-item">
      <span>Cote</span>
      <strong>${summary.combinedOdd ? summary.combinedOdd.toFixed(3) : "N/A"}</strong>
    </div>
    <div class="stat-item">
      <span>Gain</span>
      <strong>${summary.expectedReturn ? summary.expectedReturn.toFixed(0) + " F" : "N/A"}</strong>
    </div>
  `;
}

async function generateLadder() {
  if (!currentCoupon) {
    alert("Générez d'abord un coupon simple");
    return;
  }

  ladderBtn.disabled = true;
  ladderBtn.textContent = "Génération...";

  const size = parseInt(sizeSelect.value) || 3;
  const risk = riskSelect.value || "balanced";

  try {
    const response = await fetch("/api/coupon/ladder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size, risk, stake: 1000 })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    renderLadder(data.ladder);
  } catch (error) {
    console.error("Erreur de génération ladder:", error);
    alert(`Impossible de générer le ladder: ${error.message}`);
  } finally {
    ladderBtn.disabled = false;
    ladderBtn.textContent = "Générer Ladder";
  }
}

function renderLadder(ladder) {
  const coupons = ladder?.coupons || [];

  const html = `
    <div class="ladder-container">
      <div class="ladder-header">
        <h2>📊 Ladder de Tickets</h2>
        <p class="ladder-meta">Mise totale: ${ladder?.totalStake || 1000} FCFA</p>
      </div>
      
      <div class="ladder-items">
        ${coupons.map((item, index) => `
          <div class="ladder-item">
            <div class="ladder-item-header">
              <span class="ladder-item-name">${item.name || `TICKET ${index + 1}`}</span>
              <span class="ladder-item-stake">Mise: ${item.stake || 0} FCFA</span>
            </div>
            <div class="ladder-item-matches">
              ${(item.matches || []).slice(0, 3).map(m => `
                <div class="ladder-match">
                  <span>${m.homeTeam} vs ${m.awayTeam}</span>
                  <span>${m.prediction?.recommendation || "1"}</span>
                  <span>${Number(m.odds || 1.5).toFixed(2)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  couponSection.innerHTML = html;
}

async function generateMulti() {
  if (!currentCoupon) {
    alert("Générez d'abord un coupon simple");
    return;
  }

  multiBtn.disabled = true;
  multiBtn.textContent = "Génération...";

  const size = parseInt(sizeSelect.value) || 3;
  const risk = riskSelect.value || "balanced";

  try {
    const response = await fetch("/api/coupon/multi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size, risk })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    renderMulti(data.strategies);
  } catch (error) {
    console.error("Erreur de génération multi:", error);
    alert(`Impossible de générer le multi: ${error.message}`);
  } finally {
    multiBtn.disabled = false;
    multiBtn.textContent = "Générer Multi";
  }
}

function renderMulti(strategies) {
  const html = `
    <div class="multi-container">
      <div class="multi-header">
        <h2>🎯 Coupon Multi</h2>
        <p class="multi-meta">${strategies.length} stratégies disponibles</p>
      </div>
      
      <div class="multi-items">
        ${strategies.map((strategy, index) => `
          <div class="multi-item">
            <div class="multi-item-header">
              <span class="multi-item-name">${strategy.name || `Stratégie ${index + 1}`}</span>
              <span class="multi-item-risk">${strategy.risk || "balanced"}</span>
            </div>
            <div class="multi-item-matches">
              ${(strategy.matches || []).slice(0, 3).map(m => `
                <div class="multi-match">
                  <span>${m.homeTeam} vs ${m.awayTeam}</span>
                  <span>${m.prediction?.recommendation || "1"}</span>
                  <span>${(m.prediction?.confidence || 0).toFixed(1)}%</span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  couponSection.innerHTML = html;
}

async function validateCoupon() {
  if (!currentCoupon || !currentCoupon.coupon) {
    alert("Générez d'abord un coupon");
    return;
  }

  validateBtn.disabled = true;
  validateBtn.textContent = "Validation...";

  const selections = currentCoupon.coupon.map(item => ({
    matchId: item.matchId,
    cote: item.cote
  }));

  try {
    const response = await fetch("/api/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, driftThresholdPercent: 6 })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Erreur inconnue");
    }

    renderValidation(data);
  } catch (error) {
    console.error("Erreur de validation:", error);
    alert(`Impossible de valider le coupon: ${error.message}`);
  } finally {
    validateBtn.disabled = false;
    validateBtn.textContent = "Valider Coupon";
  }
}

function renderValidation(data) {
  const summary = data.summary || {};
  const issues = data.issues || [];

  const html = `
    <div class="validation-container">
      <div class="validation-header">
        <h2>✅ Validation Coupon</h2>
        <p class="validation-status">Statut: ${data.status || "UNKNOWN"}</p>
      </div>
      
      <div class="validation-summary">
        <div class="summary-item">
          <span>OK</span>
          <strong>${summary.ok || 0}</strong>
        </div>
        <div class="summary-item">
          <span>À corriger</span>
          <strong>${summary.toFix || 0}</strong>
        </div>
        <div class="summary-item">
          <span>Total</span>
          <strong>${summary.total || 0}</strong>
        </div>
      </div>
      
      ${issues.length ? `
        <div class="validation-issues">
          <h3>Alertes détectées:</h3>
          ${issues.map(issue => `
            <div class="issue-item">
              <span class="issue-code">${issue.code || "ALERT"}</span>
              <span class="issue-message">${issue.message || "Message non disponible"}</span>
            </div>
          `).join("")}
        </div>
      ` : '<p class="validation-ok">Aucune alerte détectée. Coupon valide.</p>'}
    </div>
  `;

  couponSection.innerHTML = html;
}
