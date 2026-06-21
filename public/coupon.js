const refreshBtn = document.getElementById("refreshBtn");
const sizeSelect = document.getElementById("sizeSelect");
const familySelect = document.getElementById("familySelect");
const sourceSelect = document.getElementById("sourceSelect");
const preLeagueSelect = document.getElementById("preLeagueSelect");
const preMarketSelect = document.getElementById("preMarketSelect");
const couponSection = document.getElementById("couponSection");
const couponStats = document.getElementById("couponStats");
const ladderBtn = document.getElementById("ladderBtn");
const multiBtn = document.getElementById("multiBtn");
const validateBtn = document.getElementById("validateBtn");
const updatedAt = document.getElementById("updatedAt");
const appVersionTag = document.getElementById("appVersionTag");

const APP_VERSION = "2026.06.19-r1";
const RISK_PRESETS = {
  "70": { key: "super_safe", confidenceFloor: 70, maxRisk: 28, label: "Super Safe" },
  "55": { key: "safe", confidenceFloor: 55, maxRisk: 42, label: "Safe" },
  "40": { key: "aggressive", confidenceFloor: 40, maxRisk: 62, label: "Agressif" },
};

let currentCoupon = null;
let availableMatches = [];

document.addEventListener("DOMContentLoaded", () => {
  appVersionTag.textContent = `v${APP_VERSION}`;
  setupEventListeners();
  renderEmptyCoupon();
  bootstrapCoupon();
});

function setupEventListeners() {
  refreshBtn?.addEventListener("click", generateCoupon);
  ladderBtn?.addEventListener("click", generateLadder);
  multiBtn?.addEventListener("click", generateMulti);
  validateBtn?.addEventListener("click", validateCoupon);
  familySelect?.addEventListener("change", () => {
    syncLeagueOptions();
    generateCoupon();
  });
  preLeagueSelect?.addEventListener("change", generateCoupon);
  preMarketSelect?.addEventListener("change", generateCoupon);
  document.querySelectorAll('input[name="riskPreset"]').forEach((input) => {
    input.addEventListener("change", generateCoupon);
  });
}

async function bootstrapCoupon() {
  await loadMatches();
  generateCoupon();
}

async function loadMatches() {
  try {
    const response = await window.SiteAPI.matches();
    const matches = Array.isArray(response?.matches) ? response.matches : [];
    availableMatches = matches.map(enrichMatch);
    syncLeagueOptions();
  } catch (error) {
    console.error("Erreur chargement coupon:", error);
    availableMatches = [];
  }
}

function enrichMatch(match) {
  const status = normalizeStatus(match);
  return {
    ...match,
    normalizedStatus: status,
    family: getFamilyFromLeague(match.league),
    startsAtMs: match.startTime ? new Date(match.startTime).getTime() : 0,
    marketsCatalog: buildMarketCatalog(match),
  };
}

function getSelectedRiskPreset() {
  const selected = document.querySelector('input[name="riskPreset"]:checked')?.value || "55";
  return RISK_PRESETS[selected] || RISK_PRESETS["55"];
}

function getFamilyFromLeague(leagueName) {
  const league = String(leagueName || "").toLowerCase();
  if (league.includes("penalty")) return "Penalty";
  if (league.includes("highscore")) return "Highscore";
  if (league.includes("rush")) return "Rush";
  return "Classic";
}

function normalizeStatus(match) {
  const rawStatus = String(match.status || match.statusText || "").toLowerCase();
  if (rawStatus.includes("termine") || rawStatus.includes("terminé") || rawStatus.includes("finished")) return "finished";
  if (rawStatus.includes("en_cours") || rawStatus.includes("live") || rawStatus.includes("direct")) return "live";
  if (rawStatus.includes("venir") || rawStatus.includes("upcoming") || rawStatus.includes("starting")) return "upcoming";
  return "unknown";
}

function syncLeagueOptions() {
  const selectedFamily = familySelect?.value || "all";
  const leagues = [...new Set(
    availableMatches
      .filter((match) => selectedFamily === "all" || match.family === selectedFamily)
      .map((match) => match.league)
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "fr"));

  if (!preLeagueSelect) return;
  const previousValue = preLeagueSelect.value || "all";
  preLeagueSelect.innerHTML = `
    <option value="all">Toutes les ligues</option>
    ${leagues.map((league) => `<option value="${escapeHtml(league)}">${escapeHtml(league)}</option>`).join("")}
  `;
  preLeagueSelect.value = leagues.includes(previousValue) ? previousValue : "all";
}

function buildMarketCatalog(match) {
  const catalog = [];
  const odds = match.odds || {};
  const totals = Array.isArray(match.totals) ? match.totals : [];
  const handicaps = Array.isArray(match.handicaps) ? match.handicaps : [];
  const totalGoalsMean = estimateExpectedGoals(match);
  const handicapLean = estimateHandicapLean(match);

  if (Number.isFinite(Number(odds.home))) {
    catalog.push({
      marketType: "1x2",
      label: "1",
      subtitle: "Victoire domicile",
      odd: Number(odds.home),
      confidence: 74,
      riskScore: 22,
      sortScore: 74 - 22,
    });
  }

  if (Number.isFinite(Number(odds.draw))) {
    catalog.push({
      marketType: "1x2",
      label: "X",
      subtitle: "Match nul",
      odd: Number(odds.draw),
      confidence: 58,
      riskScore: 52,
      sortScore: 58 - 52,
    });
  }

  if (Number.isFinite(Number(odds.away))) {
    catalog.push({
      marketType: "1x2",
      label: "2",
      subtitle: "Victoire extérieur",
      odd: Number(odds.away),
      confidence: 71,
      riskScore: 27,
      sortScore: 71 - 27,
    });
  }

  pickBestTotals(totals, totalGoalsMean).forEach((item) => catalog.push(item));
  pickBestHandicaps(handicaps, handicapLean).forEach((item) => catalog.push(item));

  if (Number.isFinite(Number(odds.btts?.yes))) {
    catalog.push({
      marketType: "btts",
      label: "BTTS Oui",
      subtitle: "Les deux marquent",
      odd: Number(odds.btts.yes),
      confidence: 63,
      riskScore: 34,
      sortScore: 63 - 34,
    });
  }

  if (Number.isFinite(Number(odds.btts?.no))) {
    catalog.push({
      marketType: "btts",
      label: "BTTS Non",
      subtitle: "Les deux marquent",
      odd: Number(odds.btts.no),
      confidence: 61,
      riskScore: 36,
      sortScore: 61 - 36,
    });
  }

  if (hasBaseMarket(odds)) {
    catalog.push({
      marketType: "parity",
      label: "Pair",
      subtitle: "Parité du total",
      odd: 1.74,
      confidence: 62,
      riskScore: 30,
      sortScore: 62 - 30,
    });
    catalog.push({
      marketType: "parity",
      label: "Impair",
      subtitle: "Parité du total",
      odd: 1.79,
      confidence: 61,
      riskScore: 31,
      sortScore: 61 - 31,
    });
  }

  return catalog
    .filter((item) => Number.isFinite(item.odd))
    .sort((left, right) => right.sortScore - left.sortScore);
}

function estimateExpectedGoals(match) {
  const totals = Array.isArray(match.totals) ? match.totals : [];
  if (!totals.length) return 7.5;

  const reference = totals.find((item) => Number(item.line) >= 7.5) || totals[Math.floor(totals.length / 2)];
  const overOdd = Number(reference?.over);
  const underOdd = Number(reference?.under);
  const line = Number(reference?.line || 7.5);

  if (!Number.isFinite(overOdd) || !Number.isFinite(underOdd)) return line;

  const bias = underOdd - overOdd;
  if (bias >= 1.1) return line + 1.5;
  if (bias >= 0.45) return line + 0.5;
  if (bias <= -1.1) return line - 1.5;
  if (bias <= -0.45) return line - 0.5;
  return line;
}

function estimateHandicapLean(match) {
  const homeOdd = Number(match.odds?.home);
  const awayOdd = Number(match.odds?.away);
  if (!Number.isFinite(homeOdd) || !Number.isFinite(awayOdd)) return 0;

  if (homeOdd <= 1.55 && awayOdd >= 3.5) return -1.5;
  if (homeOdd <= 1.8 && awayOdd >= 2.8) return -1;
  if (awayOdd <= 1.55 && homeOdd >= 3.5) return 1.5;
  if (awayOdd <= 1.8 && homeOdd >= 2.8) return 1;
  return 0;
}

function pickBestTotals(totals, totalGoalsMean) {
  const candidates = [];

  totals.forEach((item) => {
    const line = Number(item.line);
    const overOdd = Number(item.over);
    const underOdd = Number(item.under);
    if (!Number.isFinite(line)) return;

    const delta = Math.abs(line - totalGoalsMean);

    if (Number.isFinite(overOdd)) {
      const confidence = clamp(78 - (delta * 7) - ((overOdd - 1.2) * 18), 44, 82);
      const riskScore = clamp(18 + (delta * 5) + ((overOdd - 1.2) * 16), 18, 70);
      candidates.push({
        marketType: "over",
        label: `Over ${line}`,
        subtitle: buildTotalSubtitle(line, totalGoalsMean, "over"),
        odd: overOdd,
        confidence,
        riskScore,
        sortScore: confidence - riskScore + 6,
      });
    }

    if (Number.isFinite(underOdd)) {
      const confidence = clamp(80 - (delta * 6) - ((underOdd - 1.18) * 17), 46, 84);
      const riskScore = clamp(16 + (delta * 4) + ((underOdd - 1.18) * 15), 16, 68);
      candidates.push({
        marketType: "over",
        label: `Under ${line}`,
        subtitle: buildTotalSubtitle(line, totalGoalsMean, "under"),
        odd: underOdd,
        confidence,
        riskScore,
        sortScore: confidence - riskScore + 7,
      });
    }
  });

  return candidates
    .sort((left, right) => right.sortScore - left.sortScore)
    .slice(0, 3);
}

function buildTotalSubtitle(line, totalGoalsMean, side) {
  const distance = Number((line - totalGoalsMean).toFixed(1));
  const bias = side === "over" ? "flux offensif" : "ligne sous contrôle";
  if (Math.abs(distance) <= 0.6) return `Total buts · ligne centrale · ${bias}`;
  if (distance > 0.6) return `Total buts · ligne haute · ${bias}`;
  return `Total buts · ligne basse · ${bias}`;
}

function pickBestHandicaps(handicaps, handicapLean) {
  const candidates = [];

  handicaps.forEach((item) => {
    const handicap = Number(item.handicap);
    if (!Number.isFinite(handicap)) return;

    if (Number.isFinite(Number(item.home))) {
      const odd = Number(item.home);
      const delta = Math.abs(handicap - handicapLean);
      const confidence = clamp(75 - (delta * 9) - ((odd - 1.25) * 15), 42, 80);
      const riskScore = clamp(22 + (delta * 7) + ((odd - 1.25) * 16), 20, 74);
      candidates.push({
        marketType: "handicap",
        label: `H1 ${formatHandicap(handicap)}`,
        subtitle: buildHandicapSubtitle("domicile", handicap, handicapLean),
        odd,
        confidence,
        riskScore,
        sortScore: confidence - riskScore + 4,
      });
    }

    if (Number.isFinite(Number(item.away))) {
      const odd = Number(item.away);
      const target = -handicapLean;
      const delta = Math.abs(handicap - target);
      const confidence = clamp(74 - (delta * 9) - ((odd - 1.25) * 15), 42, 79);
      const riskScore = clamp(23 + (delta * 7) + ((odd - 1.25) * 16), 21, 74);
      candidates.push({
        marketType: "handicap",
        label: `H2 ${formatHandicap(handicap)}`,
        subtitle: buildHandicapSubtitle("extérieur", handicap, target),
        odd,
        confidence,
        riskScore,
        sortScore: confidence - riskScore + 4,
      });
    }
  });

  return candidates
    .sort((left, right) => right.sortScore - left.sortScore)
    .slice(0, 3);
}

function buildHandicapSubtitle(sideLabel, handicap, target) {
  const delta = Math.abs(handicap - target);
  if (delta <= 0.6) return `Handicap ${sideLabel} · ligne idéale`;
  if (delta <= 1.2) return `Handicap ${sideLabel} · ligne jouable`;
  return `Handicap ${sideLabel} · ligne agressive`;
}

function formatHandicap(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${numeric > 0 ? "+" : ""}${numeric}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value.toFixed(1))));
}

function hasBaseMarket(odds) {
  return [odds?.home, odds?.draw, odds?.away].some((value) => Number.isFinite(Number(value)));
}

function getFilteredMatches() {
  const family = familySelect?.value || "all";
  const league = preLeagueSelect?.value || "all";
  return availableMatches.filter((match) => {
    const familyOk = family === "all" || match.family === family;
    const leagueOk = league === "all" || match.league === league;
    return familyOk && leagueOk;
  });
}

function buildCouponItems(matches, preset, selectedMarket) {
  return matches
    .map((match) => {
      const market = pickMarketForMatch(match, preset, selectedMarket);
      if (!market) return null;
      return {
        matchId: match.id,
        league: match.league,
        family: match.family,
        status: match.status,
        normalizedStatus: match.normalizedStatus,
        statusText: match.statusText,
        liveTime: match.liveTime || "",
        teamHome: match.team1,
        teamAway: match.team2,
        homeLogo: match.homeLogo,
        awayLogo: match.awayLogo,
        leagueLogo: match.leagueLogo,
        startTime: match.startTime,
        score: match.score,
        marketType: market.marketType,
        pari: market.label,
        marketLabel: market.subtitle,
        cote: Number(market.odd),
        confidence: Number(market.confidence),
        riskScore: Number(market.riskScore),
        sortScore: Number(market.sortScore),
      };
    })
    .filter(Boolean)
    .filter((item) => item.confidence >= preset.confidenceFloor && item.riskScore <= preset.maxRisk)
    .sort((left, right) => {
      if (right.sortScore !== left.sortScore) return right.sortScore - left.sortScore;
      return (left.startsAtMs || 0) - (right.startsAtMs || 0);
    });
}

function pickMarketForMatch(match, preset, selectedMarket) {
  const markets = match.marketsCatalog || [];
  const preferredTypes = getPreferredMarketTypes(selectedMarket, preset.key);

  for (const type of preferredTypes) {
    const found = markets.find((market) => matchesMarketType(type, market.marketType));
    if (found) return found;
  }

  return markets[0] || null;
}

function getPreferredMarketTypes(selectedMarket, presetKey) {
  if (selectedMarket && selectedMarket !== "all") {
    return [selectedMarket];
  }

  if (presetKey === "super_safe") return ["1x2", "over", "btts", "parity", "handicap"];
  if (presetKey === "aggressive") return ["handicap", "over", "parity", "btts", "1x2"];
  return ["1x2", "over", "parity", "btts", "handicap"];
}

function matchesMarketType(filterValue, marketType) {
  if (filterValue === "over") return marketType === "over";
  return filterValue === marketType;
}

async function generateCoupon() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Analyse...";
  couponSection.innerHTML = '<div class="loading-card">Analyse IA du live feed en cours...</div>';

  try {
    await loadMatches();
    const preset = getSelectedRiskPreset();
    const selectedMarket = preMarketSelect?.value || "all";
    const size = parseInt(sizeSelect?.value || "3", 10) || 3;
    const filteredMatches = getFilteredMatches();
    const coupon = buildCouponItems(filteredMatches, preset, selectedMarket).slice(0, size);

    currentCoupon = {
      success: true,
      coupon,
      meta: {
        source: sourceSelect?.value || "livefeed",
        family: familySelect?.value || "all",
        league: preLeagueSelect?.value || "all",
        selectedMarket,
        preset,
        size,
      },
      summary: buildSummary(coupon),
    };

    renderCoupon(currentCoupon);
    renderStats(currentCoupon, filteredMatches.length);
    updatedAt.textContent = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
  } catch (error) {
    console.error("Erreur coupon:", error);
    couponSection.innerHTML = `<div class="error-message"><p>Impossible de générer le coupon: ${escapeHtml(error.message)}</p></div>`;
    couponStats.innerHTML = "";
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Générer le coupon";
  }
}

function buildSummary(coupon) {
  const combinedOdd = coupon.reduce((acc, item) => acc * Number(item.cote || 1), 1);
  const averageConfidence = coupon.length
    ? coupon.reduce((acc, item) => acc + Number(item.confidence || 0), 0) / coupon.length
    : 0;
  const averageRisk = coupon.length
    ? coupon.reduce((acc, item) => acc + Number(item.riskScore || 0), 0) / coupon.length
    : 0;

  return {
    combinedOdd,
    averageConfidence,
    averageRisk,
    projectedReturn: combinedOdd * 1000,
  };
}

function renderEmptyCoupon() {
  couponSection.innerHTML = '<div class="loading-card">Clique sur "Générer le coupon" pour lancer l’analyse.</div>';
  couponStats.innerHTML = "";
}

function renderStats(data, poolCount) {
  const coupon = data.coupon || [];
  const summary = data.summary || {};
  couponStats.innerHTML = `
    <div class="summary-item">
      <span>Source</span>
      <strong>Live Feed</strong>
    </div>
    <div class="summary-item">
      <span>Pool IA</span>
      <strong>${poolCount}</strong>
    </div>
    <div class="summary-item">
      <span>Confiance</span>
      <strong>${formatPercent(summary.averageConfidence || 0)}</strong>
    </div>
    <div class="summary-item">
      <span>Risque IA</span>
      <strong>${Math.round(summary.averageRisk || 0)}/100</strong>
    </div>
    <div class="summary-item">
      <span>Cote totale</span>
      <strong>${Number(summary.combinedOdd || 1).toFixed(2)}</strong>
    </div>
    <div class="summary-item">
      <span>Matchs</span>
      <strong>${coupon.length}</strong>
    </div>
  `;
}

function renderCoupon(data) {
  const coupon = data.coupon || [];
  const presetLabel = data.meta?.preset?.label || "Safe";
  const familyLabel = data.meta?.family === "all" ? "Toutes" : data.meta?.family;

  if (!coupon.length) {
    couponSection.innerHTML = `
      <div class="loading-card">
        Aucun coupon fiable trouvé avec ces réglages.<br>
        Essaie une autre ligue, un autre marché ou un niveau de risque plus large.
      </div>
    `;
    return;
  }

  couponSection.innerHTML = `
    <div class="coupon-container premium-coupon">
      <div class="coupon-header">
        <div>
          <h2>Coupon intelligent</h2>
          <p class="coupon-meta">${coupon.length} matchs · ${escapeHtml(presetLabel)} · ${escapeHtml(familyLabel)}</p>
        </div>
        <div class="coupon-head-badge">Live Feed · IA Sync</div>
      </div>
      <div class="coupon-items" id="couponItemsList">
        ${coupon.map((item, index) => renderCouponItem(item, index)).join("")}
      </div>
    </div>
  `;
}

function renderCouponItem(item, index) {
  return `
    <article class="coupon-item">
      <div class="coupon-item-header">
        <span class="coupon-item-number">#${index + 1}</span>
        <div class="coupon-item-teams">
          ${item.homeLogo ? `<img src="${item.homeLogo}" alt="${escapeHtml(item.teamHome)}" class="team-logo-small" onerror="this.style.display='none'">` : ""}
          <strong>${escapeHtml(item.teamHome)}</strong>
          <span>vs</span>
          <strong>${escapeHtml(item.teamAway)}</strong>
          ${item.awayLogo ? `<img src="${item.awayLogo}" alt="${escapeHtml(item.teamAway)}" class="team-logo-small" onerror="this.style.display='none'">` : ""}
        </div>
      </div>
      <div class="coupon-item-league">
        ${item.leagueLogo ? `<img src="${item.leagueLogo}" alt="${escapeHtml(item.league)}" class="team-logo-small" onerror="this.style.display='none'">` : ""}
        <span>${escapeHtml(item.league)} · ${escapeHtml(item.family)}</span>
      </div>
      <div class="coupon-pick-line">
        <strong>${escapeHtml(item.pari)}</strong>
        <span>${escapeHtml(item.marketLabel)}</span>
      </div>
      <div class="coupon-item-details">
        <span class="coupon-item-status">${formatStatusLabel(item.normalizedStatus)}</span>
        <span class="coupon-item-time">${formatDate(item.startTime)}</span>
        <span class="coupon-confidence">${formatPercent(item.confidence)}</span>
        <span class="coupon-odd">Cote ${Number(item.cote).toFixed(2)}</span>
      </div>
      <div class="coupon-intel-line">
        <span>Risque ${Math.round(item.riskScore)}/100</span>
        <span>${escapeHtml(describeMarketEdge(item))}</span>
      </div>
    </article>
  `;
}

function formatStatusLabel(status) {
  if (status === "live") return "Live";
  if (status === "finished") return "Terminé";
  if (status === "upcoming") return "À venir";
  return "Analyse";
}

function formatDate(dateValue) {
  if (!dateValue) return "Heure inconnue";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Heure inconnue";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatPercent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : "N/A";
}

function describeMarketEdge(item) {
  if (item.marketType === "handicap") return "Handicap calibré sur l’écart attendu";
  if (item.marketType === "over") return "Ligne total sélectionnée sur le rythme estimé";
  if (item.marketType === "btts") return "Les deux équipes ont un profil buteur";
  if (item.marketType === "parity") return "Parité choisie sur la structure de score";
  return "Sélection stable sur le marché principal";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function generateLadder() {
  if (!currentCoupon?.coupon?.length) {
    alert("Génère d'abord un coupon");
    return;
  }

  couponSection.innerHTML = `
    <div class="multi-container">
      <div class="multi-header">
        <h2>Ladder IA</h2>
        <p class="multi-meta">Projection premium à partir du coupon actuel</p>
      </div>
      <div class="multi-items">
        ${currentCoupon.coupon.map((item, index) => `
          <div class="multi-item">
            <div class="multi-item-header">
              <span class="multi-item-name">Palier ${index + 1}</span>
              <span class="multi-item-risk">${escapeHtml(item.pari)} · ${Number(item.cote).toFixed(2)}</span>
            </div>
            <div class="multi-item-matches">
              <div class="multi-match">
                <span>${escapeHtml(item.teamHome)} vs ${escapeHtml(item.teamAway)}</span>
                <span>${formatPercent(item.confidence)}</span>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function generateMulti() {
  if (!currentCoupon?.coupon?.length) {
    alert("Génère d'abord un coupon");
    return;
  }

  const groups = [
    currentCoupon.coupon.slice(0, 2),
    currentCoupon.coupon.slice(0, 3),
    currentCoupon.coupon.slice(1, 4).filter(Boolean),
  ].filter((group) => group.length);

  couponSection.innerHTML = `
    <div class="multi-container">
      <div class="multi-header">
        <h2>Multi stratégique</h2>
        <p class="multi-meta">${groups.length} variantes prêtes à jouer</p>
      </div>
      <div class="multi-items">
        ${groups.map((group, index) => `
          <div class="multi-item">
            <div class="multi-item-header">
              <span class="multi-item-name">Pack ${index + 1}</span>
              <span class="multi-item-risk">${Number(group.reduce((acc, item) => acc * item.cote, 1)).toFixed(2)}</span>
            </div>
            <div class="multi-item-matches">
              ${group.map((item) => `
                <div class="multi-match">
                  <span>${escapeHtml(item.teamHome)} vs ${escapeHtml(item.teamAway)} · ${escapeHtml(item.pari)}</span>
                  <span>${Number(item.cote).toFixed(2)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function validateCoupon() {
  if (!currentCoupon?.coupon?.length) {
    alert("Génère d'abord un coupon");
    return;
  }

  const weakItems = currentCoupon.coupon.filter((item) => item.confidence < 58 || item.riskScore > 45);
  const status = weakItems.length ? "A SURVEILLER" : "VALIDÉ";

  couponSection.innerHTML = `
    <div class="validation-container">
      <div class="validation-header">
        <h2>Validation IA</h2>
        <p class="validation-status">Statut: ${status}</p>
      </div>
      <div class="validation-summary">
        <div class="summary-item">
          <span>Valides</span>
          <strong>${currentCoupon.coupon.length - weakItems.length}</strong>
        </div>
        <div class="summary-item">
          <span>À revoir</span>
          <strong>${weakItems.length}</strong>
        </div>
        <div class="summary-item">
          <span>Total</span>
          <strong>${currentCoupon.coupon.length}</strong>
        </div>
      </div>
      ${weakItems.length ? `
        <div class="validation-issues">
          <h3>Points de vigilance</h3>
          ${weakItems.map((item) => `
            <div class="issue-item">
              <span class="issue-code">${escapeHtml(item.pari)}</span>
              <span class="issue-message">${escapeHtml(item.teamHome)} vs ${escapeHtml(item.teamAway)} · ${formatPercent(item.confidence)} · risque ${item.riskScore}/100</span>
            </div>
          `).join("")}
        </div>
      ` : '<p class="validation-ok">Coupon propre, cohérent et prêt à être exporté.</p>'}
    </div>
  `;
}
