function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function normalizeMarketList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const normalized = {};
      if (entry.T !== undefined) normalized.T = toNumber(entry.T, entry.T);
      if (entry.C !== undefined) normalized.C = toNumber(entry.C, entry.C);
      if (entry.P !== undefined) normalized.P = toNumber(entry.P, entry.P);
      if (entry.B !== undefined) normalized.B = entry.B;
      if (entry.G !== undefined) normalized.G = toNumber(entry.G, entry.G);

      const nestedMarkets = Array.isArray(entry.ME) ? normalizeMarketList(entry.ME) : undefined;
      if (nestedMarkets) normalized.ME = nestedMarkets;

      return normalized;
    })
    .filter(Boolean);
}

function buildPlatformOdds(markets = [], advancedMarkets = []) {
  const main = {};
  const overUnder = [];
  const handicap = [];

  const pushMarket = (market, groupOverride = null) => {
    if (!market || typeof market !== "object") return;
    const group = Number(groupOverride ?? market.G);
    const type = Number(market.T);
    const line = market.P !== undefined ? Number(market.P) : null;
    const value = Number(market.C);
    if (!Number.isFinite(value)) return;

    if (group === 1) {
      if (type === 1) main.home_win = { value };
      if (type === 2) main.draw = { value };
      if (type === 3) main.away_win = { value };
    }

    if (group === 17 && Number.isFinite(line)) {
      if (type === 9) overUnder.push({ type: "over", threshold: line, value });
      if (type === 10) overUnder.push({ type: "under", threshold: line, value });
    }

    if (group === 2 && Number.isFinite(line)) {
      if (type === 7) handicap.push({ type: "home", handicap: line, value });
      if (type === 8) handicap.push({ type: "away", handicap: line, value });
    }
  };

  (Array.isArray(markets) ? markets : []).forEach((market) => pushMarket(market));
  (Array.isArray(advancedMarkets) ? advancedMarkets : []).forEach((groupItem) => {
    const group = groupItem?.G;
    (Array.isArray(groupItem?.ME) ? groupItem.ME : []).forEach((market) => pushMarket(market, group));
  });

  return {
    main,
    over_under: overUnder,
    handicap,
  };
}

function resolveMatchId(body = {}, fallback = {}) {
  return toString(
    body.I ??
      body.match_id ??
      body.matchId ??
      body.id ??
      fallback.I ??
      fallback.match_id ??
      fallback.matchId ??
      fallback.id,
    ""
  );
}

function resolveHomeTeam(body = {}, fallback = {}) {
  return toString(
    body.O1 ??
      body.team_home ??
      body.teamHome ??
      body.home_team ??
      body.team1 ??
      fallback.O1 ??
      fallback.team_home ??
      fallback.teamHome ??
      fallback.home_team ??
      fallback.team1,
    ""
  );
}

function resolveAwayTeam(body = {}, fallback = {}) {
  return toString(
    body.O2 ??
      body.team_away ??
      body.teamAway ??
      body.away_team ??
      body.team2 ??
      fallback.O2 ??
      fallback.team_away ??
      fallback.teamAway ??
      fallback.away_team ??
      fallback.team2,
    ""
  );
}

function resolveLeague(body = {}, fallback = {}) {
  return toString(body.L ?? body.league ?? fallback.L ?? fallback.league, "");
}

function resolveTimestamp(body = {}, fallback = {}) {
  const value =
    body.S ??
    body.timestamp ??
    body.startTimeTimestamp ??
    body.start_time_timestamp ??
    fallback.S ??
    fallback.timestamp ??
    fallback.startTimeTimestamp ??
    fallback.start_time_timestamp ??
    null;

  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function resolveMarkets(body = {}, fallback = {}) {
  const marketData = body.market_data && typeof body.market_data === "object" ? body.market_data : {};
  const baseMarkets = body.E ?? body.e ?? marketData.E ?? fallback.E ?? [];
  const extraMarkets = body.AE ?? body.ae ?? marketData.AE ?? fallback.AE ?? [];

  return {
    E: normalizeMarketList(baseMarkets),
    AE: normalizeMarketList(extraMarkets),
  };
}

function buildPredictionRequest(body = {}, fallback = {}) {
  const markets = resolveMarkets(body, fallback);
  return {
    I: resolveMatchId(body, fallback),
    O1: resolveHomeTeam(body, fallback),
    O2: resolveAwayTeam(body, fallback),
    L: resolveLeague(body, fallback),
    S: resolveTimestamp(body, fallback),
    SC: body.SC ?? fallback.SC ?? undefined,
    E: markets.E,
    AE: markets.AE,
  };
}

function normalizePredictionResponse(response, context = {}) {
  if (!response || response.success === false) {
    return response;
  }

  const platformOdds = response.platform_odds || buildPlatformOdds(context.E || [], context.AE || []);

  return {
    ...response,
    platform_odds: platformOdds,
    match_id: toString(response.match_id ?? context.I ?? context.match_id, ""),
    team_home: toString(response.team_home ?? context.O1 ?? context.team_home, ""),
    team_away: toString(response.team_away ?? context.O2 ?? context.team_away, ""),
    league: toString(response.league ?? context.L ?? context.league, ""),
    timestamp: response.timestamp ?? context.S ?? context.timestamp ?? null,
  };
}

module.exports = {
  buildPredictionRequest,
  buildPlatformOdds,
  normalizePredictionResponse,
  normalizeMarketList,
};
