const fs = require("fs");
const path = require("path");

const DEFAULT_WINDOW = 5;
const DATASET_CANDIDATES = [
  path.join(process.cwd(), "finished_matches_dataset.csv"),
  path.join(process.cwd(), "finished_matches.csv"),
  "C:\\Users\\HP\\Downloads\\finished_matches.csv",
];

let cachedMatches = null;

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function readDataset() {
  if (cachedMatches) return cachedMatches;

  const datasetPath = DATASET_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!datasetPath) {
    cachedMatches = [];
    return cachedMatches;
  }

  const content = fs.readFileSync(datasetPath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    cachedMatches = [];
    return cachedMatches;
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    const finishedAt = new Date(record.finished_at || record.updated_at || record.created_at || "");
    if (Number.isNaN(finishedAt.getTime())) continue;

    rows.push({
      id: record.id || "",
      match_id: record.match_id || "",
      team_home: record.team_home || "",
      team_away: record.team_away || "",
      league: record.league || "",
      score_home: toNumber(record.score_home, 0),
      score_away: toNumber(record.score_away, 0),
      finished_at: finishedAt,
      source: record.source || "",
    });
  }

  rows.sort((a, b) => a.finished_at - b.finished_at);
  cachedMatches = rows;
  return cachedMatches;
}

function getDataset() {
  return readDataset().slice();
}

function filterByLeague(matches, league) {
  const leagueKey = normalizeText(league);
  if (!leagueKey) return matches;
  const filtered = matches.filter((match) => normalizeText(match.league) === leagueKey);
  return filtered.length ? filtered : matches;
}

function pickRecentMatches(matches, teamName, league, limit = DEFAULT_WINDOW) {
  const teamKey = normalizeText(teamName);
  if (!teamKey) return [];

  const filtered = filterByLeague(matches, league);
  const teamMatches = filtered.filter((match) =>
    normalizeText(match.team_home) === teamKey || normalizeText(match.team_away) === teamKey
  );

  return teamMatches.slice(-limit);
}

function computeTeamRollingStats(teamName, league, limit = DEFAULT_WINDOW) {
  const matches = getDataset();
  const recentMatches = pickRecentMatches(matches, teamName, league, limit);
  if (!recentMatches.length) {
    return {
      avg_scored: 1.5,
      avg_conceded: 1.2,
      win_rate: 0.5,
      n: 0,
    };
  }

  const teamKey = normalizeText(teamName);
  let scored = 0;
  let conceded = 0;
  let wins = 0;

  recentMatches.forEach((match) => {
    const isHome = normalizeText(match.team_home) === teamKey;
    const goalsFor = isHome ? match.score_home : match.score_away;
    const goalsAgainst = isHome ? match.score_away : match.score_home;

    scored += goalsFor;
    conceded += goalsAgainst;
    if (goalsFor > goalsAgainst) wins += 1;
  });

  const n = recentMatches.length;
  return {
    avg_scored: Number((scored / n).toFixed(3)),
    avg_conceded: Number((conceded / n).toFixed(3)),
    win_rate: Number((wins / n).toFixed(3)),
    n,
  };
}

function computeH2HStats(homeTeam, awayTeam, league, limit = DEFAULT_WINDOW) {
  const matches = filterByLeague(getDataset(), league);
  const homeKey = normalizeText(homeTeam);
  const awayKey = normalizeText(awayTeam);

  const directMatches = matches.filter((match) => {
    const matchHomeKey = normalizeText(match.team_home);
    const matchAwayKey = normalizeText(match.team_away);
    return (
      (matchHomeKey === homeKey && matchAwayKey === awayKey) ||
      (matchHomeKey === awayKey && matchAwayKey === homeKey)
    );
  }).slice(-limit);

  if (!directMatches.length) {
    return {
      h2h_home_wins: 0.5,
      h2h_avg_goals: 2.5,
      h2h_n: 0,
    };
  }

  let homeWins = 0;
  let totalGoals = 0;

  directMatches.forEach((match) => {
    totalGoals += match.score_home + match.score_away;
    if (
      normalizeText(match.team_home) === homeKey && match.score_home > match.score_away
    ) {
      homeWins += 1;
    }
    if (
      normalizeText(match.team_away) === homeKey && match.score_away > match.score_home
    ) {
      homeWins += 1;
    }
  });

  const n = directMatches.length;
  return {
    h2h_home_wins: Number((homeWins / n).toFixed(3)),
    h2h_avg_goals: Number((totalGoals / n).toFixed(3)),
    h2h_n: n,
  };
}

function buildHistoricalStats(teamHome, teamAway, league, limit = DEFAULT_WINDOW) {
  return {
    rolling_home: computeTeamRollingStats(teamHome, league, limit),
    rolling_away: computeTeamRollingStats(teamAway, league, limit),
    h2h: computeH2HStats(teamHome, teamAway, league, limit),
  };
}

function getLeagueStats(league) {
  const matches = filterByLeague(getDataset(), league);
  if (!matches.length) {
    return {
      league,
      samples: 0,
      avg_goals: 0,
      home_win_rate: 0,
      draw_rate: 0,
      away_win_rate: 0,
    };
  }

  let totalGoals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  matches.forEach((match) => {
    totalGoals += match.score_home + match.score_away;
    if (match.score_home > match.score_away) homeWins += 1;
    else if (match.score_home < match.score_away) awayWins += 1;
    else draws += 1;
  });

  const samples = matches.length;
  return {
    league,
    samples,
    avg_goals: Number((totalGoals / samples).toFixed(3)),
    home_win_rate: Number((homeWins / samples).toFixed(3)),
    draw_rate: Number((draws / samples).toFixed(3)),
    away_win_rate: Number((awayWins / samples).toFixed(3)),
  };
}

function getTeamStats(teamName) {
  const matches = getDataset();
  const teamKey = normalizeText(teamName);
  const teamMatches = matches.filter((match) =>
    normalizeText(match.team_home) === teamKey || normalizeText(match.team_away) === teamKey
  );

  if (!teamMatches.length) {
    return {
      team: teamName,
      samples: 0,
      avg_scored: 0,
      avg_conceded: 0,
      win_rate: 0,
    };
  }

  let scored = 0;
  let conceded = 0;
  let wins = 0;

  teamMatches.forEach((match) => {
    const isHome = normalizeText(match.team_home) === teamKey;
    const goalsFor = isHome ? match.score_home : match.score_away;
    const goalsAgainst = isHome ? match.score_away : match.score_home;

    scored += goalsFor;
    conceded += goalsAgainst;
    if (goalsFor > goalsAgainst) wins += 1;
  });

  const samples = teamMatches.length;
  return {
    team: teamName,
    samples,
    avg_scored: Number((scored / samples).toFixed(3)),
    avg_conceded: Number((conceded / samples).toFixed(3)),
    win_rate: Number((wins / samples).toFixed(3)),
  };
}

module.exports = {
  buildHistoricalStats,
  computeH2HStats,
  computeTeamRollingStats,
  getDataset,
  getLeagueStats,
  getTeamStats,
  normalizeText,
};
