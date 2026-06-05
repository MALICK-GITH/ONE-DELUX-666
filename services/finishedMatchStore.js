"use strict";

const { Pool } = require("pg");

class FinishedMatchStore {
  constructor(databaseUrl) {
    this.databaseUrl = String(databaseUrl || "").trim();
    this.tableName = "finished_matches_dataset";
    this.pool = this.databaseUrl
      ? new Pool({
          connectionString: this.databaseUrl,
          ssl: this.shouldUseSsl(this.databaseUrl) ? { rejectUnauthorized: false } : undefined,
        })
      : null;
    this.readyPromise = null;
  }

  shouldUseSsl(databaseUrl) {
    return /supabase|neon|render|railway|amazonaws/i.test(databaseUrl);
  }

  isConfigured() {
    return Boolean(this.pool);
  }

  maskDatabaseUrl(url) {
    if (!url) return "non configurée";
    try {
      const masked = url.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
      return masked.substring(0, 50) + "...";
    } catch {
      return "***";
    }
  }

  async ensureReady() {
    if (!this.pool) return false;
    if (!this.readyPromise) {
      this.readyPromise = this.initialize();
    }
    await this.readyPromise;
    return true;
  }

  async initialize() {
    console.log(`[Database] Initialisation de la connexion à la base de données: ${this.maskDatabaseUrl(this.databaseUrl)}`);
    const client = await this.pool.connect();
    try {
      console.log(`[Database] Connexion réussie à la base de données`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS finished_matches_dataset (
          id BIGSERIAL PRIMARY KEY,
          match_id TEXT UNIQUE NOT NULL,
          team_home TEXT NOT NULL,
          team_away TEXT NOT NULL,
          league TEXT,
          score_home INTEGER,
          score_away INTEGER,
          finished_at TIMESTAMPTZ NOT NULL,
          source TEXT NOT NULL,
          raw_json JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log(`[Database] Table finished_matches_dataset vérifiée/créée`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS match_tracking_state (
          id BIGSERIAL PRIMARY KEY,
          tracker_key TEXT UNIQUE NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT true,
          interval_seconds INTEGER NOT NULL DEFAULT 60,
          total_runs INTEGER NOT NULL DEFAULT 0,
          last_started_at TIMESTAMPTZ,
          last_completed_at TIMESTAMPTZ,
          last_success_at TIMESTAMPTZ,
          last_error_at TIMESTAMPTZ,
          last_error_text TEXT,
          last_snapshot JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log(`[Database] Table match_tracking_state vérifiée/créée`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS match_tracking_runs (
          id BIGSERIAL PRIMARY KEY,
          tracker_key TEXT NOT NULL,
          source TEXT NOT NULL,
          status TEXT NOT NULL,
          live_count INTEGER NOT NULL DEFAULT 0,
          upcoming_count INTEGER NOT NULL DEFAULT 0,
          finished_count INTEGER NOT NULL DEFAULT 0,
          total_count INTEGER NOT NULL DEFAULT 0,
          snapshot JSONB,
          error_text TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log(`[Database] Table match_tracking_runs vérifiée/créée`);
    } finally {
      client.release();
    }
    console.log(`[Database] Initialisation terminée avec succès`);
  }

  async upsertFinishedMatches(matches = []) {
    if (!this.pool || !matches.length) {
      return { inserted: 0 };
    }

    await this.ensureReady();
    const client = await this.pool.connect();

    try {
      let inserted = 0;
      await client.query("BEGIN");

      for (const match of matches) {
        const result = await client.query(
          `
            INSERT INTO finished_matches_dataset (
              match_id,
              team_home,
              team_away,
              league,
              score_home,
              score_away,
              finished_at,
              source,
              raw_json,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
            ON CONFLICT (match_id) DO UPDATE SET
              team_home = EXCLUDED.team_home,
              team_away = EXCLUDED.team_away,
              league = EXCLUDED.league,
              score_home = EXCLUDED.score_home,
              score_away = EXCLUDED.score_away,
              finished_at = EXCLUDED.finished_at,
              source = EXCLUDED.source,
              raw_json = EXCLUDED.raw_json,
              updated_at = NOW()
            RETURNING match_id
          `,
          [
            String(match.match_id || match.id || ""),
            String(match.team_home || match.team1 || ""),
            String(match.team_away || match.team2 || ""),
            String(match.league || ""),
            Number.isFinite(Number(match.score_home)) ? Number(match.score_home) : null,
            Number.isFinite(Number(match.score_away)) ? Number(match.score_away) : null,
            match.finished_at ? new Date(match.finished_at) : new Date(),
            String(match.source || "cron-learning"),
            JSON.stringify(match.raw_match || null),
          ]
        );

        if (result.rowCount > 0) inserted += 1;
      }

      await client.query("COMMIT");
      return { inserted };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async upsertTrackingState({ trackerKey, enabled, intervalSeconds, snapshot, status, errorText }) {
    if (!this.pool) {
      return { inserted: 0 };
    }

    await this.ensureReady();
    const client = await this.pool.connect();

    try {
      const now = new Date();
      const payload = JSON.stringify(snapshot || null);
      const result = await client.query(
        `
          INSERT INTO match_tracking_state (
            tracker_key,
            enabled,
            interval_seconds,
            total_runs,
            last_started_at,
            last_completed_at,
            last_success_at,
            last_error_at,
            last_error_text,
            last_snapshot,
            updated_at,
            last_seen_at
          )
          VALUES (
            $1,
            $2,
            $3,
            1,
            CASE WHEN $4 = 'running' THEN $5::timestamp ELSE NULL END,
            CASE WHEN $4 IN ('success', 'error') THEN $5::timestamp ELSE NULL END,
            CASE WHEN $4 = 'success' THEN $5::timestamp ELSE NULL END,
            CASE WHEN $4 = 'error' THEN $5::timestamp ELSE NULL END,
            $6,
            $7::jsonb,
            $5::timestamp,
            $5::timestamp
          )
          ON CONFLICT (tracker_key) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            interval_seconds = EXCLUDED.interval_seconds,
            total_runs = match_tracking_state.total_runs + 1,
            last_started_at = CASE WHEN $4 = 'running' THEN $5::timestamp ELSE match_tracking_state.last_started_at END,
            last_completed_at = CASE WHEN $4 IN ('success', 'error') THEN $5::timestamp ELSE match_tracking_state.last_completed_at END,
            last_success_at = CASE WHEN $4 = 'success' THEN $5::timestamp ELSE match_tracking_state.last_success_at END,
            last_error_at = CASE WHEN $4 = 'error' THEN $5::timestamp ELSE match_tracking_state.last_error_at END,
            last_error_text = CASE WHEN $4 = 'error' THEN $6 ELSE match_tracking_state.last_error_text END,
            last_snapshot = COALESCE($7::jsonb, match_tracking_state.last_snapshot),
            updated_at = $5::timestamp,
            last_seen_at = $5::timestamp
          RETURNING tracker_key
        `,
        [
          String(trackerKey || "default"),
          Boolean(enabled),
          Number.isFinite(Number(intervalSeconds)) ? Number(intervalSeconds) : 60,
          String(status || "running"),
          now,
          errorText ? String(errorText) : null,
          payload,
        ]
      );

      return { inserted: result.rowCount > 0 ? 1 : 0 };
    } finally {
      client.release();
    }
  }

  async insertTrackingRun({
    trackerKey,
    source,
    status,
    liveCount,
    upcomingCount,
    finishedCount,
    totalCount,
    snapshot,
    errorText,
  }) {
    if (!this.pool) {
      return { inserted: 0 };
    }

    await this.ensureReady();
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
          INSERT INTO match_tracking_runs (
            tracker_key,
            source,
            status,
            live_count,
            upcoming_count,
            finished_count,
            total_count,
            snapshot,
            error_text
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
          RETURNING id
        `,
        [
          String(trackerKey || "default"),
          String(source || "liveFeed"),
          String(status || "success"),
          Number.isFinite(Number(liveCount)) ? Number(liveCount) : 0,
          Number.isFinite(Number(upcomingCount)) ? Number(upcomingCount) : 0,
          Number.isFinite(Number(finishedCount)) ? Number(finishedCount) : 0,
          Number.isFinite(Number(totalCount)) ? Number(totalCount) : 0,
          JSON.stringify(snapshot || null),
          errorText ? String(errorText) : null,
        ]
      );

      return { inserted: result.rowCount > 0 ? 1 : 0 };
    } finally {
      client.release();
    }
  }

  async getFinishedMatchIds() {
    if (!this.pool) {
      return new Set();
    }

    await this.ensureReady();
    const client = await this.pool.connect();

    try {
      const result = await client.query(`
        SELECT match_id
        FROM finished_matches_dataset
      `);

      return new Set(result.rows.map((row) => String(row.match_id || "").trim()).filter(Boolean));
    } finally {
      client.release();
    }
  }

  async getTrackingState(trackerKey) {
    if (!this.pool) {
      return null;
    }

    await this.ensureReady();
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
          SELECT
            tracker_key,
            enabled,
            interval_seconds,
            total_runs,
            last_started_at,
            last_completed_at,
            last_success_at,
            last_error_at,
            last_error_text,
            last_snapshot,
            created_at,
            updated_at,
            last_seen_at
          FROM match_tracking_state
          WHERE tracker_key = $1
          LIMIT 1
        `,
        [String(trackerKey || "default")]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = FinishedMatchStore;
