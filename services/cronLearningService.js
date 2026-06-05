"use strict";

/**
 * Cron Learning Service - automatic collection of finished matches.
 * Signed: SOLITAIRE HACK
 */

const { getMatchStatus, extractMatchScore } = require("./matchStatus");
const { predictFromTrainedModel } = require("./trainedModelPredictor");
const { fetchLiveFeedEvents } = require("./liveFeedClient");
const FinishedMatchStore = require("./finishedMatchStore");

class CronLearningService {
  constructor(options = {}) {
    this.interval = Number(options.interval) > 0 ? Number(options.interval) : 60 * 1000;
    this.matchStore = new FinishedMatchStore(options.databaseUrl || "");
    this.trackerKey = String(options.trackerKey || "default").trim() || "default";
    this.isRunning = false;
    this.timer = null;
    this.collectedMatchIds = new Set();
    this.trackingState = null;
    this.lastClassification = null;
    this.bootstrapPromise = null;
  }

  async loadExistingData() {
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    this.bootstrapPromise = (async () => {
      try {
        if (!this.matchStore.isConfigured()) {
          return;
        }

        await this.matchStore.ensureReady();
        this.collectedMatchIds = await this.matchStore.getFinishedMatchIds();
        this.trackingState = await this.matchStore.getTrackingState(this.trackerKey);
        this.lastClassification = this.trackingState?.last_snapshot?.counts || null;

        console.log(`[Cron Learning] ${this.collectedMatchIds.size} matchs terminés déjà collectés`);
        if (this.trackingState) {
          console.log(`[Cron Learning] ${Number(this.trackingState.total_runs || 0)} exécutions de tracking chargées`);
        }
      } catch (error) {
        console.error(`[Cron Learning] Erreur de chargement depuis la base: ${error.message}`);
      }
    })();

    return this.bootstrapPromise;
  }

  async fetchMatches() {
    try {
      return await fetchLiveFeedEvents();
    } catch (error) {
      console.error(`[Cron Learning] Live feed indisponible: ${error.message}`);
      return [];
    }
  }

  formatMatch(event) {
    const status = getMatchStatus(event);
    const scoreInfo = extractMatchScore(event);

    return {
      id: event.I,
      league: event.L || event.LE || "Compétition virtuelle",
      sport: event.SN || "FIFA",
      country: event.CN || event.CE || "Monde",
      team1: event.O1 || "Équipe 1",
      team2: event.O2 || "Équipe 2",
      team1Code: event.O1E || event.O1 || "Équipe 1",
      team2Code: event.O2E || event.O2 || "Équipe 2",
      startTime: event.S || null,
      status: status.label,
      statusNormalized: status.normalized,
      currentScore: scoreInfo.currentScore,
      currentPeriod: scoreInfo.currentPeriod,
      currentPeriodString: scoreInfo.currentPeriodString,
      timeSeconds: scoreInfo.timeSeconds,
      markets: Array.isArray(event.E) ? event.E : [],
      odds: this.extractOdds(event),
      raw: event,
    };
  }

  extractOdds(event) {
    const markets = Array.isArray(event.E) ? event.E : [];
    for (const market of markets) {
      if (market.T !== 1) continue;
      const odds = {};
      for (const outcome of market.O || []) {
        if (outcome.T === 1) odds.home = Number(outcome.C);
        if (outcome.T === 2) odds.draw = Number(outcome.C);
        if (outcome.T === 3) odds.away = Number(outcome.C);
      }
      if (Object.keys(odds).length === 3) return odds;
    }
    return { home: null, draw: null, away: null };
  }

  async collectFinishedMatches() {
    const startedAt = new Date();

    try {
      await this.loadExistingData();

      const events = await this.fetchMatches();
      const formattedMatches = events.map((event) => this.formatMatch(event));

      const finishedMatches = formattedMatches.filter((match) => match.statusNormalized === "terminé");
      const newFinishedMatches = finishedMatches.filter((match) => !this.collectedMatchIds.has(String(match.id)));

      // Exécuter une requête de monitoring actif pour générer l'activité SQL
      if (this.matchStore.isConfigured()) {
        const queryStartTime = Date.now();
        await this.matchStore.getActiveMatches();
        console.log(`📊 Query executed in ${Date.now() - queryStartTime}ms`);
      }

      if (newFinishedMatches.length > 0) {
        const enrichedMatches = await Promise.all(
          newFinishedMatches.map(async (match) => {
            const prediction = await this.getPredictionForMatch(match).catch((error) => {
              console.error(`[Cron Learning] Erreur de prédiction pour ${match.id}: ${error.message}`);
              return null;
            });

            return {
              ...match,
              prediction,
            };
          })
        );

        await this.saveFinishedMatches(enrichedMatches);
        console.log(`[Cron Learning] ${newFinishedMatches.length} nouveaux matchs terminés collectés`);
      } else {
        console.log("[Cron Learning] Aucun nouveau match terminé détecté");
      }

      await this.trackMatches(formattedMatches);
      await this.recordTrackingState({
        status: "success",
        startedAt,
        completedAt: new Date(),
        matches: formattedMatches,
      });

      return {
        total: formattedMatches.length,
        finished: finishedMatches.length,
        newFinished: newFinishedMatches.length,
        live: formattedMatches.filter((m) => m.statusNormalized === "en_cours").length,
        upcoming: formattedMatches.filter((m) => m.statusNormalized === "a_venir").length,
      };
    } catch (error) {
      await this.recordTrackingState({
        status: "error",
        startedAt,
        completedAt: new Date(),
        errorText: error.message,
      }).catch(() => {});
      console.error(`[Cron Learning] Erreur lors de la collecte: ${error.message}`);
      throw error;
    }
  }

  async saveFinishedMatches(matches) {
    matches.forEach((match) => this.collectedMatchIds.add(String(match.id)));

    if (this.matchStore.isConfigured()) {
      await this.persistFinishedMatchesToDatabase(matches);
    }
  }

  async persistFinishedMatchesToDatabase(matches) {
    const payload = matches.map((match) => ({
      match_id: String(match.id || ""),
      team_home: match.team1 || "",
      team_away: match.team2 || "",
      league: match.league || "",
      score_home: Number(match.currentScore?.home || 0),
      score_away: Number(match.currentScore?.away || 0),
      finished_at: new Date().toISOString(),
      source: "cron-learning",
      raw_match: {
        ...(match.raw || {}),
        prediction: match.prediction || null,
      },
    }));

    const result = await this.matchStore.upsertFinishedMatches(payload);
    console.log(`[Cron Learning] ${result.inserted} match(s) inséré(s) en base`);
  }

  async getPredictionForMatch(match) {
    return predictFromTrainedModel({
      league: match.league,
      teamHome: match.team1,
      teamAway: match.team2,
    });
  }

  async trackMatches(matches) {
    const classified = {
      finished: matches.filter((m) => m.statusNormalized === "terminé"),
      live: matches.filter((m) => m.statusNormalized === "en_cours"),
      upcoming: matches.filter((m) => m.statusNormalized === "a_venir"),
      total: matches.length,
    };

    this.lastClassification = {
      finished: classified.finished.length,
      live: classified.live.length,
      upcoming: classified.upcoming.length,
      total: classified.total,
      lastUpdate: new Date().toISOString(),
    };

    console.log(
      `[Cron Learning] Classification: ${classified.finished.length} terminés, ${classified.live.length} en cours, ${classified.upcoming.length} à venir`
    );

    return classified;
  }

  async recordTrackingState({ status, startedAt, completedAt, matches = [], errorText = null }) {
    if (!this.matchStore.isConfigured()) {
      return;
    }

    const classified = {
      live: matches.filter((m) => m.statusNormalized === "en_cours").length,
      upcoming: matches.filter((m) => m.statusNormalized === "a_venir").length,
      finished: matches.filter((m) => m.statusNormalized === "terminé").length,
      total: matches.length,
    };

    const snapshot = {
      status,
      startedAt: startedAt ? startedAt.toISOString() : null,
      completedAt: completedAt ? completedAt.toISOString() : null,
      counts: classified,
      source: "liveFeed",
    };

    await this.matchStore.upsertTrackingState({
      trackerKey: this.trackerKey,
      enabled: true,
      intervalSeconds: Math.round(this.interval / 1000),
      snapshot,
      status,
      errorText,
    });

    await this.matchStore.insertTrackingRun({
      trackerKey: this.trackerKey,
      source: "liveFeed",
      status,
      liveCount: classified.live,
      upcomingCount: classified.upcoming,
      finishedCount: classified.finished,
      totalCount: classified.total,
      snapshot,
      errorText,
    });

    this.trackingState = await this.matchStore.getTrackingState(this.trackerKey);
  }

  start() {
    if (this.isRunning) {
      console.log("[Cron Learning] Déjà en cours d'exécution");
      return;
    }

    console.log(`[Cron Learning] Démarrage du service (intervalle: ${this.interval / 1000}s)`);
    this.isRunning = true;

    this.loadExistingData().catch((error) => {
      console.error(`[Cron Learning] Erreur de chargement initial: ${error.message}`);
    });

    this.collectFinishedMatches().catch((error) => {
      console.error(`[Cron Learning] Erreur lors de l'exécution initiale: ${error.message}`);
    });

    this.timer = setInterval(() => {
      this.collectFinishedMatches().catch((error) => {
        console.error(`[Cron Learning] Erreur lors de l'exécution planifiée: ${error.message}`);
      });
    }, this.interval);
  }

  stop() {
    if (!this.isRunning) return;

    console.log("[Cron Learning] Arrêt du service");
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStatus() {
    return {
      trackerKey: this.trackerKey,
      isRunning: this.isRunning,
      interval: this.interval,
      collectedCount: this.collectedMatchIds.size,
      trackedCount: Number(this.trackingState?.total_runs || 0),
      remoteStoreConfigured: this.matchStore.isConfigured(),
      lastClassification: this.lastClassification,
      lastUpdate: this.trackingState?.last_seen_at || this.trackingState?.updated_at || null,
      lastSnapshot: this.trackingState?.last_snapshot || null,
    };
  }
}

module.exports = CronLearningService;
