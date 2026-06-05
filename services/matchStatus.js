"use strict";

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isFinishedStatusText(value = "") {
  const text = normalizeText(value);
  if (!text) return false;

  return (
    text.includes("termine") ||
    text.includes("jeu termine") ||
    text.includes("full time") ||
    text.includes("ft") ||
    text.includes("finished") ||
    text.includes("final") ||
    text.includes("ended") ||
    text.includes("terminated") ||
    text.includes("closed") ||
    text.includes("done") ||
    text.includes("complete")
  );
}

function isLiveStatusText(value = "") {
  const text = normalizeText(value);
  if (!text) return false;

  return (
    text.includes("live") ||
    text.includes("inplay") ||
    text.includes("en cours") ||
    text.includes("pause") ||
    text.includes("break") ||
    text.includes("half time") ||
    text.includes("playing") ||
    text.includes("in progress") ||
    text.includes("ongoing")
  );
}

function isUpcomingStatusText(value = "") {
  const text = normalizeText(value);
  if (!text) return false;

  return (
    text.includes("debut dans") ||
    text.includes("before the start") ||
    text.includes("before game") ||
    text.includes("avant le debut") ||
    text.includes("pre match") ||
    text.includes("prematch") ||
    text.includes("upcoming") ||
    text.includes("not started") ||
    text.includes("match a venir") ||
    text.includes("a venir")
  );
}

function isFinishedMatch(match = {}) {
  const statusCode = Number(match?.SC?.GS || match?.statusCode || 0);
  if (statusCode === 3) return true;

  const statusText = match?.SC?.SLS || match?.statusText || match?.status || "";
  const phase = match?.SC?.CPS || match?.phase || "";
  const infoText = match?.SC?.I || match?.infoText || "";

  if (isFinishedStatusText(statusText)) return true;
  if (isFinishedStatusText(phase)) return true;
  if (isFinishedStatusText(infoText)) return true;

  return false;
}

function hasLiveIndicators(match = {}) {
  const statusText = match?.SC?.SLS || match?.statusText || match?.status || "";
  const phase = match?.SC?.CPS || match?.phase || "";
  const infoText = match?.SC?.I || match?.infoText || "";
  const fullScore = match?.SC?.FS || {};
  const currentPeriod = match?.SC?.CP || match?.currentPeriod || null;

  if (isLiveStatusText(statusText)) return true;
  if (isLiveStatusText(phase)) return true;
  if (isLiveStatusText(infoText)) return true;

  return (
    fullScore &&
    typeof fullScore === "object" &&
    (Number(fullScore.S1) > 0 || Number(fullScore.S2) > 0 || currentPeriod !== null)
  );
}

function isUpcomingMatch(match = {}) {
  const statusCode = Number(match?.SC?.GS || match?.statusCode || 0);
  if (statusCode === 128) return true;

  const statusText = match?.SC?.SLS || match?.statusText || match?.status || "";
  const phase = match?.SC?.CPS || match?.phase || "";
  const infoText = match?.SC?.I || match?.infoText || "";

  if (isUpcomingStatusText(statusText)) return true;
  if (isUpcomingStatusText(phase)) return true;
  if (isUpcomingStatusText(infoText)) return true;

  const fullScore = match?.SC?.FS || {};
  const currentPeriod = match?.SC?.CP || match?.currentPeriod || null;
  const hasScore = Number(fullScore?.S1) > 0 || Number(fullScore?.S2) > 0 || currentPeriod !== null;

  if (!hasScore && !hasLiveIndicators(match)) return true;

  return false;
}

function isLiveMatch(match = {}) {
  const statusCode = Number(match?.SC?.GS || match?.statusCode || 0);
  if (statusCode === 1) return true;
  if (statusCode === 2) return true;
  if (statusCode === 128) return false;

  return hasLiveIndicators(match);
}

function getMatchStatus(match = {}) {
  if (isFinishedMatch(match)) {
    return {
      status: "finished",
      normalized: "terminé",
      label: "Terminé",
    };
  }

  if (isUpcomingMatch(match)) {
    return {
      status: "upcoming",
      normalized: "a_venir",
      label: "A venir",
    };
  }

  if (isLiveMatch(match)) {
    return {
      status: "live",
      normalized: "en_cours",
      label: "En cours",
    };
  }

  return {
    status: "upcoming",
    normalized: "a_venir",
    label: "A venir",
  };
}

function extractMatchScore(match = {}) {
  const fullScore = match?.SC?.FS || {};
  const periodScores = match?.SC?.PS || [];

  return {
    currentScore: {
      home: fullScore?.S1 || 0,
      away: fullScore?.S2 || 0,
    },
    periodScores: periodScores.map((ps) => ({
      period: ps.P || "",
      scoreHome: ps.S1 || 0,
      scoreAway: ps.S2 || 0,
    })),
    currentPeriod: match?.SC?.CP || null,
    currentPeriodString: match?.SC?.CPS || match?.TN || "Match",
    timeSeconds: match?.SC?.TS || 0,
    statusDisplay: match?.SC?.SLS || match?.TI || "Disponible",
  };
}

function classifyMatchByStatus(matches = []) {
  const classified = {
    finished: [],
    live: [],
    upcoming: [],
    total: matches.length,
  };

  for (const match of matches) {
    const status = getMatchStatus(match);
    classified[status.status].push(match);
  }

  return classified;
}

module.exports = {
  normalizeText,
  isFinishedStatusText,
  isLiveStatusText,
  isUpcomingStatusText,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  getMatchStatus,
  extractMatchScore,
  classifyMatchByStatus,
};
