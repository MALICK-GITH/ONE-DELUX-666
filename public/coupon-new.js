/**
 * FURY X ONE - Coupon Generator
 * Aligned with the prediction API output and platform market codes.
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

class CouponGenerator {
  constructor() {
    this.matchCount = 3;
    this.market = "1x2";
    this.league = "all";
    this.generatedCoupon = null;
    this.isGenerating = false;
    this.leagueCatalog = [];
    this.familyCatalog = [];
    this.init();
  }

  init() {
    this.matchCountSelect = document.getElementById("matchCountSelect");
    this.marketSelect = document.getElementById("marketSelect");
    this.leagueSelect = document.getElementById("leagueSelect");
    this.generateCouponBtn = document.getElementById("generateCouponBtn");
    this.generateImageBtn = document.getElementById("generateImageBtn");
    this.validateCouponBtn = document.getElementById("validateCouponBtn");
    this.couponSection = document.getElementById("couponSection");
    this.resultSection = document.getElementById("result");
    this.validationSection = document.getElementById("validation");
    this.statsSection = document.getElementById("couponStats");
    this.updatedAt = document.getElementById("updatedAt");

    this.matchCountSelect?.addEventListener("change", (event) => {
      this.matchCount = parseInt(event.target.value, 10) || 3;
    });

    this.marketSelect?.addEventListener("change", (event) => {
      this.market = event.target.value || "1x2";
    });

    this.leagueSelect?.addEventListener("change", (event) => {
      this.league = event.target.value || "all";
    });

    this.generateCouponBtn?.addEventListener("click", () => this.generateCoupon());
    this.generateImageBtn?.addEventListener("click", () => this.generateImage());
    this.validateCouponBtn?.addEventListener("click", () => this.validateCoupon());

    this.loadLeagues();
    this.renderEmptyCoupon();
    console.log("🎯 Coupon generator ready");
  }

  renderEmptyCoupon() {
    if (this.couponSection) {
      this.couponSection.innerHTML = '<div class="loading-card">Configurez vos options et cliquez sur "Générer Coupon"</div>';
    }
    if (this.resultSection) {
      this.resultSection.innerHTML = "<p>En attente de génération.</p>";
    }
    if (this.validationSection) {
      this.validationSection.innerHTML = "<p>Validation ticket en attente.</p>";
    }
    if (this.statsSection) {
      this.statsSection.innerHTML = "";
    }
  }

  async loadLeagues() {
    try {
      const response = await window.SiteAPI.get("/prediction/families");
      const leagues = Array.isArray(response?.leagues) ? response.leagues : [];
      const families = Array.isArray(response?.families) ? response.families : [];
      this.leagueCatalog = leagues;
      this.familyCatalog = families;
      this.populateLeagueSelect();
    } catch (error) {
      console.error("Error loading prediction leagues:", error);
      this.populateLeagueSelect([]);
    }
  }

  populateLeagueSelect() {
    if (!this.leagueSelect) return;

    const previousValue = this.leagueSelect.value || "all";
    const byFamily = new Map();

    for (const league of this.leagueCatalog) {
      const family = String(league?.family || "OTHER").trim() || "OTHER";
      if (!byFamily.has(family)) byFamily.set(family, []);
      byFamily.get(family).push(league);
    }

    const sortedFamilies = [...byFamily.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
    const html = [
      '<option value="all">Toutes les ligues</option>',
      ...sortedFamilies.map(([family, leagues]) => {
        const options = leagues
          .sort((left, right) => String(left.name || left.key || "").localeCompare(String(right.name || right.key || ""), "fr"))
          .map((league) => `<option value="${escapeHtml(league.name)}">${escapeHtml(league.name)}</option>`)
          .join("");
        return `<optgroup label="${escapeHtml(family)}">${options}</optgroup>`;
      }),
    ].join("");

    this.leagueSelect.innerHTML = html;
    this.leagueSelect.value = this.leagueCatalog.some((league) => league.name === previousValue) ? previousValue : "all";
    this.league = this.leagueSelect.value;
  }

  async generateCoupon() {
    if (this.isGenerating) return;

    this.isGenerating = true;
    this.generateCouponBtn.disabled = true;
    this.generateCouponBtn.textContent = "Génération en cours...";
    this.generateImageBtn.disabled = true;
    this.validateCouponBtn.disabled = true;

    if (this.couponSection) {
      this.couponSection.innerHTML = '<div class="loading-card">Chargement des matchs et analyse des marchés...</div>';
    }
    if (this.resultSection) {
      this.resultSection.innerHTML = "<p>Analyse en cours...</p>";
    }

    try {
      const matches = await this.fetchRealMatches();
      const filteredMatches = this.filterMatches(matches, this.league);
      const availableMatches = this.selectMatches(filteredMatches, Math.max(this.matchCount, 1) * 4);

      if (!availableMatches.length) {
        throw new Error("Aucun match disponible pour ce filtre");
      }

      if (this.couponSection) {
        this.couponSection.innerHTML = '<div class="loading-card">Calcul des prédictions et des codes marchés...</div>';
      }

      const predictions = await this.getPredictionsForMatches(availableMatches);
      const selectedCoupon = this.buildCoupon(predictions)
        .sort((left, right) => right.sortScore - left.sortScore)
        .slice(0, this.matchCount);

      this.generatedCoupon = this.buildCouponEnvelope(selectedCoupon, filteredMatches.length, predictions.length);
      this.displayCoupon(this.generatedCoupon);
      this.displayStats(this.generatedCoupon, filteredMatches.length, predictions.length);

      if (this.generateImageBtn) this.generateImageBtn.disabled = false;
      if (this.validateCouponBtn) this.validateCouponBtn.disabled = false;
      if (this.updatedAt) {
        this.updatedAt.textContent = `Mis à jour: ${new Date().toLocaleTimeString("fr-FR")}`;
      }
    } catch (error) {
      console.error("Erreur coupon:", error);
      if (this.couponSection) {
        this.couponSection.innerHTML = `<div class="error-card">Erreur: ${escapeHtml(error.message)}</div>`;
      }
      if (this.resultSection) {
        this.resultSection.innerHTML = "<p>Erreur lors de la génération.</p>";
      }
    } finally {
      this.isGenerating = false;
      this.generateCouponBtn.disabled = false;
      this.generateCouponBtn.textContent = "Générer Coupon";
    }
  }

  async fetchRealMatches() {
    const response = await window.SiteAPI.matches();
    const matches = Array.isArray(response?.matches) ? response.matches : [];
    return matches
      .map((match) => this.enrichMatch(match))
      .filter((match) => match.status === "upcoming" || match.status === "live");
  }

  enrichMatch(match) {
    const family = this.getFamilyFromLeague(match.league);
    const startTimeMs = match.startTime ? new Date(match.startTime).getTime() : Number(match.startTimeTimestamp || 0) * 1000;
    return {
      ...match,
      family,
      startTimeMs,
      odds: match.odds || {},
      markets: Array.isArray(match.markets) ? match.markets : [],
      advancedMarkets: Array.isArray(match.advancedMarkets) ? match.advancedMarkets : [],
      status: this.normalizeStatus(match),
    };
  }

  normalizeStatus(match) {
    const raw = String(match?.status || match?.statusText || "").toLowerCase();
    if (raw.includes("term")) return "finished";
    if (raw.includes("live") || raw.includes("cours") || match?.isLive) return "live";
    return "upcoming";
  }

  getFamilyFromLeague(leagueName) {
    const name = String(leagueName || "");
    const entry = this.leagueCatalog.find((league) => String(league.name || "").toLowerCase() === name.toLowerCase());
    if (entry?.family) return entry.family;

    const lower = name.toLowerCase();
    if (lower.includes("penalty")) return "PENALTY";
    if (lower.includes("rush")) return "RUSH";
    if (lower.includes("champions")) return "CHAMPIONS";
    if (lower.includes("world")) return "WORLD";
    return "CLASSIC";
  }

  filterMatches(matches, selectedLeague) {
    if (!selectedLeague || selectedLeague === "all") return matches;
    return matches.filter((match) => String(match.league || "").toLowerCase() === String(selectedLeague).toLowerCase());
  }

  selectMatches(matches, count) {
    const sorted = [...matches].sort((left, right) => {
      const startA = Number(left.startTimeMs || 0);
      const startB = Number(right.startTimeMs || 0);
      return startA - startB;
    });
    return sorted.slice(0, count);
  }

  async getPredictionsForMatches(matches) {
    const batches = matches.map((match) => this.buildPredictionRequest(match));
    const collected = [];

    if (batches.length) {
      try {
        const batchResponse = await window.SiteAPI.predictionBatch(batches);
        const items = Array.isArray(batchResponse?.batch?.predictions)
          ? batchResponse.batch.predictions
          : Array.isArray(batchResponse?.predictions)
            ? batchResponse.predictions
            : [];
        for (const item of items) {
          const envelope = item?.prediction || item?.predictions || item;
          if (item?.success || envelope) collected.push(this.normalizePredictionEnvelope(envelope));
        }
        if (collected.length) return collected;
      } catch (error) {
        console.warn("Batch prediction failed, falling back to single requests:", error);
      }
    }

    for (const match of matches) {
      try {
        const response = await window.SiteAPI.prediction(
          match.team1,
          match.team2,
          match.league,
          match
        );
        if (response?.success && response.prediction) {
          collected.push(this.normalizePredictionEnvelope(response.prediction));
        }
      } catch (error) {
        console.error("Error getting prediction:", error);
      }
    }

    return collected;
  }

  buildPredictionRequest(match) {
    return {
      I: String(match.id || match.I || ""),
      O1: match.team1 || match.O1 || match.team_home || "",
      O2: match.team2 || match.O2 || match.team_away || "",
      L: match.league || match.L || "",
      S: match.startTimeTimestamp || match.S || null,
      E: Array.isArray(match.markets) ? match.markets : Array.isArray(match.E) ? match.E : [],
      AE: Array.isArray(match.advancedMarkets) ? match.advancedMarkets : Array.isArray(match.AE) ? match.AE : [],
    };
  }

  normalizePredictionEnvelope(prediction) {
    return {
      ...prediction,
      predictions: prediction.predictions || {},
      platform_odds: prediction.platform_odds || {},
      source: prediction.source || "api",
    };
  }

  buildCoupon(predictions) {
    const selections = [];
    for (const prediction of predictions) {
      const primary = this.extractMarketPrediction(prediction, this.market);
      if (!primary) continue;
      selections.push({
        matchId: prediction.match_id || prediction.I || prediction.id || "",
        league: prediction.league || "",
        family: prediction.family || "N/A",
        source: prediction.source || "api",
        prediction,
        selection: primary,
        code: primary.platformCode || primary.code || "N/A",
        threshold: primary.threshold ?? null,
        sortScore: primary.sortScore || 0,
        confidence: primary.confidence || 0,
        riskScore: primary.riskScore || 0,
        cote: primary.odd || 1,
      });
    }
    return selections;
  }

  buildCouponEnvelope(selections, poolCount, analysedCount) {
    const combinedOdd = selections.reduce((acc, item) => acc * Number(item.cote || 1), 1);
    const averageConfidence = selections.length
      ? selections.reduce((acc, item) => acc + Number(item.confidence || 0), 0) / selections.length
      : 0;
    const averageRisk = selections.length
      ? selections.reduce((acc, item) => acc + Number(item.riskScore || 0), 0) / selections.length
      : 0;

    return {
      success: true,
      coupon: selections,
      meta: {
        market: this.market,
        league: this.league,
        matchCount: this.matchCount,
        poolCount,
        analysedCount,
      },
      summary: {
        combinedOdd,
        averageConfidence,
        averageRisk,
        projectedReturn: combinedOdd * 1000,
      },
    };
  }

  extractMarketPrediction(prediction, market) {
    const payload = prediction?.predictions || {};
    const matchResult = payload.match_result || {};
    const totalGoals = payload.total_goals || {};
    const parity = payload.total_parity || {};
    const overUnder = payload.over_under || {};
    const probabilities = matchResult.probabilities || {};
    const platformOdds = prediction?.platform_odds || {};

    switch (market) {
      case "1x2": {
        const outcome = this.pick1x2Outcome(probabilities);
        const oddMap = {
          home_win: this.resolveOdd(platformOdds.main?.home_win?.value, probabilities.home_win),
          draw: this.resolveOdd(platformOdds.main?.draw?.value, probabilities.draw),
          away_win: this.resolveOdd(platformOdds.main?.away_win?.value, probabilities.away_win),
        };
        return {
          type: "1x2",
          label: outcome.label,
          platformCode: outcome.platformCode,
          threshold: null,
          odd: oddMap[outcome.key] || 1,
          confidence: outcome.confidence,
          riskScore: this.estimateRisk(outcome.confidence, oddMap[outcome.key]),
          sortScore: this.sortScore(outcome.confidence, oddMap[outcome.key], 18),
          recommendation: outcome.label,
        };
      }
      case "over_under": {
        const threshold = this.resolveThreshold(overUnder.threshold, totalGoals, platformOdds);
        const direction = this.pickOverUnderDirection(overUnder, totalGoals, threshold);
        const lineOdd = this.pickThresholdOdd(platformOdds.over_under, threshold, direction);
        return {
          type: "over_under",
          label: `${direction === "over" ? "Over" : "Under"} ${this.formatLine(threshold)}`,
          platformCode: direction === "over" ? "T=9" : "T=10",
          threshold,
          odd: lineOdd,
          confidence: this.resolveConfidence(overUnder.confidence, totalGoals.confidence, 0.58),
          riskScore: this.estimateRisk(this.resolveConfidence(overUnder.confidence, totalGoals.confidence, 0.58), lineOdd, 12),
          sortScore: this.sortScore(this.resolveConfidence(overUnder.confidence, totalGoals.confidence, 0.58), lineOdd, 12),
          recommendation: direction.toUpperCase(),
        };
      }
      case "double_chance": {
        const result = this.pickDoubleChance(probabilities);
        const odd = this.pickDoubleChanceOdd(platformOdds.main, result.platformCode);
        return {
          type: "double_chance",
          label: result.label,
          platformCode: result.platformCode,
          threshold: null,
          odd,
          confidence: result.confidence,
          riskScore: this.estimateRisk(result.confidence, odd, 16),
          sortScore: this.sortScore(result.confidence, odd, 16),
          recommendation: result.label,
        };
      }
      case "btts": {
        const outcome = this.pickBtts(totalGoals, probabilities);
        return {
          type: "btts",
          label: outcome.label,
          platformCode: outcome.platformCode,
          threshold: null,
          odd: this.resolveOdd(outcome.odd, outcome.confidence),
          confidence: outcome.confidence,
          riskScore: this.estimateRisk(outcome.confidence, outcome.odd, 22),
          sortScore: this.sortScore(outcome.confidence, outcome.odd, 22),
          recommendation: outcome.label,
        };
      }
      case "score_range": {
        const range = this.pickScoreRange(totalGoals, prediction.family);
        return {
          type: "score_range",
          label: range.label,
          platformCode: `SR:${range.label}`,
          threshold: range.threshold,
          odd: this.resolveOdd(totalGoals.platform_value || totalGoals.predicted, totalGoals.confidence),
          confidence: totalGoals.confidence || 0.5,
          riskScore: this.estimateRisk(totalGoals.confidence || 0.5, 1.5, 18),
          sortScore: this.sortScore(totalGoals.confidence || 0.5, 1.5, 18),
          recommendation: `${this.formatLine(totalGoals.predicted)} buts`,
        };
      }
      case "clean_sheet": {
        const outcome = this.pickCleanSheet(probabilities, totalGoals);
        return {
          type: "clean_sheet",
          label: outcome.label,
          platformCode: outcome.platformCode,
          threshold: null,
          odd: outcome.odd,
          confidence: outcome.confidence,
          riskScore: this.estimateRisk(outcome.confidence, outcome.odd, 20),
          sortScore: this.sortScore(outcome.confidence, outcome.odd, 20),
          recommendation: outcome.label,
        };
      }
      case "draw_no_bet": {
        const outcome = this.pickDrawNoBet(probabilities, matchResult);
        return {
          type: "draw_no_bet",
          label: outcome.label,
          platformCode: outcome.platformCode,
          threshold: null,
          odd: outcome.odd,
          confidence: outcome.confidence,
          riskScore: this.estimateRisk(outcome.confidence, outcome.odd, 18),
          sortScore: this.sortScore(outcome.confidence, outcome.odd, 18),
          recommendation: outcome.label,
        };
      }
      case "win_both_halves": {
        const outcome = this.pickWinBothHalves(probabilities, totalGoals);
        return {
          type: "win_both_halves",
          label: outcome.label,
          platformCode: outcome.platformCode,
          threshold: null,
          odd: outcome.odd,
          confidence: outcome.confidence,
          riskScore: this.estimateRisk(outcome.confidence, outcome.odd, 25),
          sortScore: this.sortScore(outcome.confidence, outcome.odd, 25),
          recommendation: outcome.label,
        };
      }
      case "parity":
      default: {
        const outcome = this.pickParity(parity, totalGoals);
        return {
          type: "parity",
          label: outcome.label,
          platformCode: outcome.platformCode,
          threshold: null,
          odd: outcome.odd,
          confidence: outcome.confidence,
          riskScore: this.estimateRisk(outcome.confidence, outcome.odd, 20),
          sortScore: this.sortScore(outcome.confidence, outcome.odd, 20),
          recommendation: outcome.label,
        };
      }
    }
  }

  pick1x2Outcome(probabilities) {
    const home = Number(probabilities.home_win) || 0;
    const draw = Number(probabilities.draw) || 0;
    const away = Number(probabilities.away_win) || 0;
    const max = Math.max(home, draw, away);
    if (max === draw) return { key: "draw", label: "N", platformCode: "T=2", confidence: draw || 0 };
    if (max === away) return { key: "away_win", label: "2", platformCode: "T=3", confidence: away || 0 };
    return { key: "home_win", label: "1", platformCode: "T=1", confidence: home || 0 };
  }

  pickOverUnderDirection(overUnder, totalGoals, threshold) {
    if (String(overUnder.prediction || "").toLowerCase() === "over") return "over";
    if (String(overUnder.prediction || "").toLowerCase() === "under") return "under";
    const predicted = Number(totalGoals.predicted) || Number(threshold) || 0;
    return predicted >= Number(threshold) ? "over" : "under";
  }

  resolveThreshold(threshold, totalGoals, platformOdds) {
    const numericThreshold = Number(threshold);
    if (Number.isFinite(numericThreshold)) return numericThreshold;

    const predicted = Number(totalGoals.predicted);
    if (Number.isFinite(predicted) && Array.isArray(platformOdds.over_under) && platformOdds.over_under.length) {
      const lines = [...new Set(platformOdds.over_under.map((entry) => Number(entry.threshold)).filter(Number.isFinite))];
      if (lines.length) {
        lines.sort((a, b) => Math.abs(a - predicted) - Math.abs(b - predicted));
        return lines[0];
      }
    }

    return Number.isFinite(predicted) ? predicted : 7.5;
  }

  pickThresholdOdd(overUnderOdds, threshold, direction) {
    const target = Array.isArray(overUnderOdds) ? overUnderOdds : [];
    const line = Number(threshold);
    const match = target.find((entry) => Number(entry.threshold) === line && entry.type === direction);
    if (match) return Number(match.value) || 1;
    const fallback = target.find((entry) => entry.type === direction) || target[0];
    return Number(fallback?.value) || 1;
  }

  pickDoubleChance(probabilities) {
    const home = Number(probabilities.home_win) || 0;
    const draw = Number(probabilities.draw) || 0;
    const away = Number(probabilities.away_win) || 0;
    const oneX = home + draw;
    const x2 = draw + away;
    const oneTwo = home + away;
    const max = Math.max(oneX, x2, oneTwo);
    if (max === x2) return { label: "X2", platformCode: "T=5", confidence: x2 };
    if (max === oneTwo) return { label: "12", platformCode: "T=6", confidence: oneTwo };
    return { label: "1X", platformCode: "T=4", confidence: oneX };
  }

  pickDoubleChanceOdd(mainOdds, code) {
    if (code === "T=4") return Number(mainOdds?.home_win?.value) || 1;
    if (code === "T=5") return Number(mainOdds?.draw?.value) || 1;
    if (code === "T=6") return Number(mainOdds?.away_win?.value) || 1;
    return 1;
  }

  pickBtts(totalGoals, probabilities) {
    const predicted = Number(totalGoals.predicted) || 0;
    const yesConfidence = Math.min(0.88, Math.max(0.4, (predicted / 10) + 0.25));
    const noConfidence = Math.max(0.12, 1 - yesConfidence);
    if (predicted >= 2.6) {
      return { label: "BTTS Oui", platformCode: "T=13", odd: 1.6, confidence: yesConfidence };
    }
    return { label: "BTTS Non", platformCode: "T=14", odd: 2.2, confidence: noConfidence };
  }

  pickScoreRange(totalGoals, family) {
    const predicted = Number(totalGoals.predicted) || 0;
    const familyName = String(family || "").toUpperCase();
    const ranges = this.getScoreRangesForFamily(familyName);
    if (predicted <= 2) return { label: ranges[0], threshold: ranges[0] };
    if (predicted <= 4) return { label: ranges[1], threshold: ranges[1] };
    if (predicted <= 6) return { label: ranges[2], threshold: ranges[2] };
    return { label: ranges[ranges.length - 1], threshold: ranges[ranges.length - 1] };
  }

  getScoreRangesForFamily(family) {
    const map = {
      RUSH: ["0-2", "3-5", "6-8", "9+"],
      CLASSIC: ["0-2", "3-4", "5-6", "7+"],
      CHAMPIONS: ["0-2", "3-4", "5-6", "7+"],
      WORLD: ["0-2", "3-4", "5-6", "7+"],
      PENALTY: ["0-2", "3-5", "6-8", "9+"],
      HIGHSCORE: ["0-2", "3-5", "6-8", "9+"],
    };
    return map[family] || ["0-2", "3-5", "6-8", "9+"];
  }

  pickCleanSheet(probabilities, totalGoals) {
    const predicted = Number(totalGoals.predicted) || 0;
    const homeConf = Math.max(0.35, 1 - predicted / 8);
    const awayConf = Math.max(0.35, 1 - predicted / 8);
    if (predicted <= 2.5) {
      return { label: "Clean Sheet Domicile", platformCode: "CS-H", odd: 1.9, confidence: homeConf };
    }
    return { label: "Clean Sheet Extérieur", platformCode: "CS-A", odd: 2.1, confidence: awayConf };
  }

  pickDrawNoBet(probabilities, matchResult) {
    const label = matchResult.prediction === "away_win"
      ? "DNB Extérieur"
      : "DNB Domicile";
    const code = matchResult.prediction === "away_win" ? "DNB-A" : "DNB-H";
    const odd = matchResult.prediction === "away_win"
      ? (Number(probabilities.away_win) ? 1 / Number(probabilities.away_win) : 1.8)
      : (Number(probabilities.home_win) ? 1 / Number(probabilities.home_win) : 1.8);
    return { label, platformCode: code, odd, confidence: Math.max(Number(probabilities.home_win) || 0, Number(probabilities.away_win) || 0) };
  }

  pickWinBothHalves(probabilities, totalGoals) {
    const predicted = Number(totalGoals.predicted) || 0;
    const home = Number(probabilities.home_win) || 0;
    const away = Number(probabilities.away_win) || 0;
    if (home >= away && predicted >= 4) {
      return { label: "Home gagne 2 mi-temps", platformCode: "WBH-H", odd: 2.4, confidence: home };
    }
    return { label: "Away gagne 2 mi-temps", platformCode: "WBH-A", odd: 2.6, confidence: away };
  }

  resolveOdd(value, fallbackConfidence = 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    const confidence = Number(fallbackConfidence) || 0.5;
    return Number((1 / Math.max(0.18, confidence)).toFixed(2));
  }

  resolveConfidence(primary, fallback, defaultValue) {
    const values = [primary, fallback, defaultValue].map((value) => Number(value)).filter(Number.isFinite);
    return values.length ? values[0] : defaultValue;
  }

  formatLine(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(1).replace(/\.0$/, ".0") : String(value || "N/A");
  }

  estimateRisk(confidence, odd, bias = 20) {
    const conf = Math.max(0, Math.min(1, Number(confidence) || 0));
    const oddValue = Math.max(1, Number(odd) || 1);
    return Math.max(10, Math.min(95, Math.round((1 - conf) * 100 + Math.min(25, oddValue * 2) + bias)));
  }

  sortScore(confidence, odd, bias = 20) {
    const conf = Math.max(0, Math.min(1, Number(confidence) || 0));
    const oddValue = Math.max(1, Number(odd) || 1);
    return Math.round(conf * 100 + (10 / oddValue) * 10 - this.estimateRisk(conf, oddValue, bias));
  }

  displayCoupon(data) {
    const selections = data.coupon || [];
    if (!this.couponSection) return;

    if (!selections.length) {
      this.couponSection.innerHTML = `
        <div class="loading-card">
          Aucun coupon fiable trouvé avec ces réglages.
        </div>
      `;
      return;
    }

    this.couponSection.innerHTML = `
      <div class="coupon-container premium-coupon">
        <div class="coupon-header">
          <div>
            <h2>Coupon intelligent</h2>
            <p class="coupon-meta">${selections.length} matchs · ${escapeHtml(data.meta.market)} · ${escapeHtml(data.meta.league)}</p>
          </div>
          <div class="coupon-head-badge">API Sync</div>
        </div>
        <div class="coupon-items" id="couponItemsList">
          ${selections.map((item, index) => this.renderCouponItem(item, index)).join("")}
        </div>
      </div>
    `;

    if (this.resultSection) {
      this.resultSection.innerHTML = `<p>Coupon généré avec succès. ${selections.length} matchs analysés.</p>`;
    }
  }

  renderCouponItem(item, index) {
    const selection = item.selection || {};
    const prediction = item.prediction || {};
    const codeLine = selection.platformCode ? `${selection.platformCode}${selection.threshold !== null && selection.threshold !== undefined ? ` · ${selection.threshold}` : ""}` : "N/A";
    return `
      <article class="coupon-item">
        <div class="coupon-item-header">
          <span class="coupon-item-number">#${index + 1}</span>
          <div class="coupon-item-teams">
            <strong>${escapeHtml(prediction.team_home || prediction.O1 || "")}</strong>
            <span>vs</span>
            <strong>${escapeHtml(prediction.team_away || prediction.O2 || "")}</strong>
          </div>
        </div>
        <div class="coupon-item-league">
          <span>${escapeHtml(item.league)} · ${escapeHtml(item.family)}</span>
        </div>
        <div class="coupon-pick-line">
          <strong>${escapeHtml(selection.label || item.code || "N/A")}</strong>
          <span>${escapeHtml(item.selection.recommendation || "")}</span>
        </div>
        <div class="coupon-item-details">
          <span class="coupon-item-status">${escapeHtml(codeLine)}</span>
          <span class="coupon-item-time">${escapeHtml(this.formatDate(prediction.timestamp || prediction.S || prediction.startTimeTimestamp))}</span>
          <span class="coupon-confidence">${this.formatPercent(item.confidence)}</span>
          <span class="coupon-odd">Cote ${Number(item.cote || 1).toFixed(2)}</span>
        </div>
        <div class="coupon-intel-line">
          <span>Risque ${Math.round(item.riskScore)}/100</span>
          <span>${escapeHtml(this.describeMarketEdge(item))}</span>
        </div>
      </article>
    `;
  }

  displayStats(data, poolCount, analysedCount) {
    if (!this.statsSection) return;
    this.statsSection.innerHTML = `
      <div class="summary-item">
        <span>Source</span>
        <strong>${escapeHtml(data.meta.market)}</strong>
      </div>
      <div class="summary-item">
        <span>Pool IA</span>
        <strong>${poolCount}</strong>
      </div>
      <div class="summary-item">
        <span>Analysés</span>
        <strong>${analysedCount}</strong>
      </div>
      <div class="summary-item">
        <span>Confiance</span>
        <strong>${this.formatPercent(data.summary.averageConfidence)}</strong>
      </div>
      <div class="summary-item">
        <span>Risque IA</span>
        <strong>${Math.round(data.summary.averageRisk)}/100</strong>
      </div>
      <div class="summary-item">
        <span>Cote totale</span>
        <strong>${Number(data.summary.combinedOdd || 1).toFixed(2)}</strong>
      </div>
    `;
  }

  formatDate(value) {
    if (!value) return "Heure inconnue";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Heure inconnue";
    return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  formatPercent(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(1)}%` : "N/A";
  }

  describeMarketEdge(item) {
    if (item.selection?.type === "over_under") return "Seuil calculé sur la ligne la plus proche du total prévu";
    if (item.selection?.type === "1x2") return "Code 1X2 aligné sur la probabilité la plus forte";
    if (item.selection?.type === "double_chance") return "Couverture double chance calculée sur les couples de probabilités";
    if (item.selection?.type === "btts") return "BTTS dérivé du volume but attendu";
    if (item.selection?.type === "parity") return "Parité alignée sur la projection de buts";
    return "Sélection optimisée sur les marchés disponibles";
  }

  generateImage() {
    if (!this.generatedCoupon) {
      alert("Générez d'abord un coupon");
      return;
    }
    alert("Génération d'image disponible avec le ticket courant.");
  }

  validateCoupon() {
    if (!this.generatedCoupon) {
      alert("Générez d'abord un coupon");
      return;
    }

    const weakItems = this.generatedCoupon.coupon.filter((item) => item.confidence < 0.55 || item.riskScore > 60);
    if (!this.validationSection) return;

    this.validationSection.innerHTML = `
      <div class="validation-result">
        <h3>Résultat de la Validation</h3>
        ${weakItems.length ? '<div class="validation-warning">⚠️ Certaines sélections demandent une vérification</div>' : '<div class="validation-success">✅ Coupon validé avec succès</div>'}
        <ul class="validation-details">
          <li>${weakItems.length ? `${weakItems.length} sélection(s) faible(s)` : "Aucune faiblesse détectée"}</li>
          <li>${this.generatedCoupon.meta.market} · ${this.generatedCoupon.meta.league}</li>
          <li>Cote totale: ${Number(this.generatedCoupon.summary.combinedOdd || 1).toFixed(2)}</li>
        </ul>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.couponGenerator = new CouponGenerator();
});
