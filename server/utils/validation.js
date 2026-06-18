"use strict";

function toTrimmedString(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function toNumber(value, fallback = null, options = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (typeof options.min === "number" && parsed < options.min) return fallback;
  if (typeof options.max === "number" && parsed > options.max) return fallback;
  return parsed;
}

function toInteger(value, fallback = null, options = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (typeof options.min === "number" && parsed < options.min) return fallback;
  if (typeof options.max === "number" && parsed > options.max) return fallback;
  return parsed;
}

function normalizeRisk(value, fallback = "balanced") {
  const allowed = new Set(["conservative", "balanced", "aggressive"]);
  const risk = toTrimmedString(value, fallback).toLowerCase();
  return allowed.has(risk) ? risk : fallback;
}

function sanitizeCouponRequest(input = {}) {
  return {
    size: toInteger(input.size, 3, { min: 1, max: 20 }),
    league: toTrimmedString(input.league, "all") || "all",
    risk: normalizeRisk(input.risk, "balanced"),
    stake: toNumber(input.stake, 1000, { min: 0 }),
    driftThresholdPercent: toNumber(input.driftThresholdPercent, 6, { min: 0, max: 100 }),
  };
}

function sanitizePredictionRequest(input = {}) {
  const matchId = toTrimmedString(input.matchId || input.id, "");
  return {
    matchId,
    league: toTrimmedString(input.league, "Compétition virtuelle") || "Compétition virtuelle",
    teamHome: toTrimmedString(input.teamHome || input.homeTeam, "Équipe 1") || "Équipe 1",
    teamAway: toTrimmedString(input.teamAway || input.awayTeam, "Équipe 2") || "Équipe 2",
    homeOdd: toNumber(input.homeOdd, null, { min: 0 }),
    drawOdd: toNumber(input.drawOdd, null, { min: 0 }),
    awayOdd: toNumber(input.awayOdd, null, { min: 0 }),
    label: toTrimmedString(input.label, ""),
    confidence: toNumber(input.confidence, null, { min: 0, max: 100 }),
    model: toTrimmedString(input.model, ""),
  };
}

module.exports = {
  toTrimmedString,
  toNumber,
  toInteger,
  normalizeRisk,
  sanitizeCouponRequest,
  sanitizePredictionRequest,
};
