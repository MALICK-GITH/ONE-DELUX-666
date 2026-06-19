/**
 * FURY X ONE 👿 - 888starz API Client
 * Signé: SOLITAIRE HACK
 * 
 * Client pour l'API 888starz (proxy via serveur local)
 * Documentation: https://888starz.bet/service-api
 */

const API_BASE = "/api/888starz";

// Paramètres par défaut obligatoires
const DEFAULT_PARAMS = {
  lng: "fr",
  gr: "789",
  country: "96",
  partner: "233"
};

/**
 * Construire l'URL avec les paramètres
 */
function buildUrl(endpoint, params = {}) {
  const allParams = { ...DEFAULT_PARAMS, ...params };
  const queryString = new URLSearchParams(allParams).toString();
  return `${API_BASE}/${endpoint}?${queryString}`;
}

/**
 * Effectuer une requête vers l'API 888starz
 */
async function fetch888starz(endpoint, params = {}) {
  try {
    const url = buildUrl(endpoint, params);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.Success) {
      throw new Error(data.Error || "API error");
    }
    
    return data.Value;
  } catch (error) {
    console.error("Erreur 888starz API:", error);
    throw error;
  }
}

/**
 * Obtenir la liste des sports
 */
async function getSports(params = {}) {
  return fetch888starz("LiveFeed/GetSportsShortZip", {
    virtualSports: true,
    ...params
  });
}

/**
 * Obtenir les championnats par sport
 */
async function getChamps(sportId, params = {}) {
  return fetch888starz("LiveFeed/GetChampsZip", {
    sport: sportId,
    ...params
  });
}

/**
 * Obtenir les événements live avec cotes 1X2
 */
async function getLiveEvents(params = {}) {
  return fetch888starz("LiveFeed/Get1x2_VZip", {
    mode: 4,
    virtualSports: true,
    getEmpty: true,
    noFilterBlockEvent: true,
    count: 40,
    ...params
  });
}

/**
 * Obtenir les événements pré-match avec cotes 1X2
 */
async function getLineEvents(params = {}) {
  return fetch888starz("LineFeed/Get1x2_VZip", {
    mode: 4,
    virtualSports: true,
    getEmpty: true,
    noFilterBlockEvent: true,
    count: 40,
    ...params
  });
}

/**
 * Obtenir les détails d'un événement
 */
async function getGameDetails(gameId, params = {}) {
  return fetch888starz("LiveFeed/GetGameZip", {
    id: gameId,
    grMode: 4,
    marketType: 1,
    isSubGames: true,
    countevents: 250,
    ...params
  });
}

/**
 * Obtenir les top games
 */
async function getTopGames(params = {}) {
  return fetch888starz("LineFeed/GetTopGamesStatZip", {
    count: 10,
    ...params
  });
}

/**
 * Obtenir les événements FIFA virtuels
 */
async function getFIFAEvents(params = {}) {
  return getLiveEvents({
    sports: 85,
    count: 40,
    ...params
  });
}

/**
 * Obtenir les événements football
 */
async function getFootballEvents(params = {}) {
  return getLiveEvents({
    sports: 1,
    count: 40,
    ...params
  });
}

/**
 * Formater un événement 888starz pour notre format
 */
function format888starzEvent(event) {
  return {
    id: event.I,
    league: event.L || event.LE || "Compétition",
    leagueId: event.LI,
    sport: event.SN || "Sport",
    sportId: event.SI,
    country: event.CN || event.CE || "Monde",
    team1: event.O1 || "Équipe 1",
    team2: event.O2 || "Équipe 2",
    team1English: event.O1E || event.O1,
    team2English: event.O2E || event.O2,
    startTime: event.S ? new Date(Number(event.S)).toISOString() : null,
    startTimeTimestamp: event.S,
    status: event.TN || "Unknown",
    periodName: event.TNS,
    score: {
      home: event.SC?.FS?.S1 || 0,
      away: event.SC?.FS?.S2 || 0,
      total: (event.SC?.FS?.S1 || 0) + (event.SC?.FS?.S2 || 0)
    },
    elapsedTime: event.SC?.TS,
    currentPeriod: event.SC?.CP,
    currentPeriodName: event.SC?.CPS,
    odds: {
      home: extractOdds(event, 1, 1),
      draw: extractOdds(event, 1, 3),
      away: extractOdds(event, 1, 2)
    },
    isLive: event.ICY === true,
    isFinished: event.TN === "Terminé" || event.TN === "Finished",
    isUpcoming: event.GNS === true,
    homeLogo: event.O1IMG?.[0] ? `/api/proxy/image?url=${encodeURIComponent(`https://888starz.bet/sfiles/logo_teams/${event.O1IMG[0]}`)}` : null,
    awayLogo: event.O2IMG?.[0] ? `/api/proxy/image?url=${encodeURIComponent(`https://888starz.bet/sfiles/logo_teams/${event.O2IMG[0]}`)}` : null,
    raw: event
  };
}

/**
 * Extraire une cote spécifique d'un événement
 */
function extractOdds(event, group, type) {
  if (!event.E || !Array.isArray(event.E)) return null;
  
  const market = event.E.find(m => m.G === group && m.T === type);
  return market ? Number(market.C) : null;
}

/**
 * Exporter l'API client
 */
window.StarzAPI = {
  getSports,
  getChamps,
  getLiveEvents,
  getLineEvents,
  getGameDetails,
  getTopGames,
  getFIFAEvents,
  getFootballEvents,
  formatEvent: format888starzEvent
};

console.log("📡 888starz API Client chargé");
