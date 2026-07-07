const DEFAULT_PREDICTION_STATS = {
  rolling_home: {
    avg_scored: 1.5,
    avg_conceded: 1.2,
    win_rate: 0.5,
  },
  rolling_away: {
    avg_scored: 1.5,
    avg_conceded: 1.2,
    win_rate: 0.5,
  },
  h2h: {
    h2h_home_wins: 0.5,
    h2h_avg_goals: 2.5,
    h2h_n: 0,
  },
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRollingStats(input = {}, fallback = {}) {
  return {
    avg_scored: toNumber(input.avg_scored, fallback.avg_scored ?? 1.5),
    avg_conceded: toNumber(input.avg_conceded, fallback.avg_conceded ?? 1.2),
    win_rate: toNumber(input.win_rate, fallback.win_rate ?? 0.5),
  };
}

function normalizeH2HStats(input = {}, fallback = {}) {
  return {
    h2h_home_wins: toNumber(input.h2h_home_wins, fallback.h2h_home_wins ?? 0.5),
    h2h_avg_goals: toNumber(input.h2h_avg_goals, fallback.h2h_avg_goals ?? 2.5),
    h2h_n: Math.max(0, Math.round(toNumber(input.h2h_n, fallback.h2h_n ?? 0))),
  };
}

function buildPredictionRequest(body = {}, fallback = {}) {
  const teamHome = body.team_home ?? body.home_team ?? body.teamHome ?? fallback.team_home ?? fallback.home_team ?? "";
  const teamAway = body.team_away ?? body.away_team ?? body.teamAway ?? fallback.team_away ?? fallback.away_team ?? "";
  const league = body.league ?? fallback.league ?? "";

  const rollingHome = normalizeRollingStats(
    body.rolling_home || body.rollingHome || {},
    fallback.rolling_home || DEFAULT_PREDICTION_STATS.rolling_home
  );
  const rollingAway = normalizeRollingStats(
    body.rolling_away || body.rollingAway || {},
    fallback.rolling_away || DEFAULT_PREDICTION_STATS.rolling_away
  );
  const h2h = normalizeH2HStats(
    body.h2h || {},
    fallback.h2h || DEFAULT_PREDICTION_STATS.h2h
  );

  return {
    league,
    team_home: teamHome,
    team_away: teamAway,
    rolling_home: rollingHome,
    rolling_away: rollingAway,
    h2h,
  };
}

function infer1x2Probabilities(resultProbas = {}) {
  let home = null;
  let draw = null;
  let away = null;

  for (const [key, value] of Object.entries(resultProbas || {})) {
    const normalizedKey = String(key).trim().toUpperCase();
    const numericValue = toNumber(value, 0);

    if (["V1", "1", "HOME", "HOME_WIN", "H"].includes(normalizedKey)) {
      home = numericValue;
      continue;
    }

    if (["N", "X", "DRAW", "D", "0"].includes(normalizedKey)) {
      draw = numericValue;
      continue;
    }

    if (["V2", "2", "AWAY", "AWAY_WIN", "A"].includes(normalizedKey)) {
      away = numericValue;
    }
  }

  const safeHome = home ?? 0;
  const safeDraw = draw ?? 0;
  const safeAway = away ?? 0;
  const confidence = Math.max(safeHome, safeDraw, safeAway);

  return {
    home: safeHome,
    draw: safeDraw,
    away: safeAway,
    confidence,
  };
}

function normalizeTopScores(topScores = []) {
  return Array.isArray(topScores)
    ? topScores
        .map((entry) => ({
          score: String(entry?.score ?? ""),
          proba: toNumber(entry?.proba, 0),
        }))
        .filter((entry) => entry.score)
    : [];
}

function buildCompatibilityPredictions(prediction = {}) {
  return {
    "1x2": infer1x2Probabilities(prediction.result_probas || {}),
    top_scores: normalizeTopScores(prediction.top_scores || []),
  };
}

function normalizePredictionResponse(response, context = {}) {
  if (!response || response.success === false || !response.prediction) {
    return response;
  }

  const prediction = response.prediction || {};
  const compatibility = buildCompatibilityPredictions(prediction);
  const matchLabel = context.team_home && context.team_away
    ? `${context.team_home} vs ${context.team_away}`
    : prediction.match || null;

  return {
    ...response,
    prediction: {
      ...prediction,
      match: matchLabel,
      league: response.league || context.league || prediction.league,
      predictions: {
        ...compatibility,
      },
    },
  };
}

module.exports = {
  DEFAULT_PREDICTION_STATS,
  buildPredictionRequest,
  buildCompatibilityPredictions,
  normalizePredictionResponse,
};
