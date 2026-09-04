// Mock data for FIFA virtual matches when 888starz API is unavailable
// All matches are set to start in 5-10 minutes from now for prediction generation
const now = Date.now();
const fiveMinutes = 5 * 60 * 1000;
const sixMinutes = 6 * 60 * 1000;
const sevenMinutes = 7 * 60 * 1000;
const eightMinutes = 8 * 60 * 1000;
const nineMinutes = 9 * 60 * 1000;
const tenMinutes = 10 * 60 * 1000;

const mockMatches = [
  {
    I: "mock-1",
    O1: "Real Madrid",
    O2: "Barcelona",
    L: "La Liga",
    LI: 123,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "Espagne",
    S: now + fiveMinutes,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 2.50 },
      { G: 1, T: 2, C: 3.20 },
      { G: 1, T: 3, C: 2.80 }
    ],
    O1IMG: ["real-madrid.png"],
    O2IMG: ["barcelona.png"],
    O1I: 1001,
    O2I: 1002,
    CHIMG: "laliga.png",
    EC: 15,
    GNS: true
  },
  {
    I: "mock-2",
    O1: "Manchester United",
    O2: "Liverpool",
    L: "Premier League",
    LI: 124,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "Angleterre",
    S: now + sixMinutes,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 2.10 },
      { G: 1, T: 2, C: 3.50 },
      { G: 1, T: 3, C: 3.40 }
    ],
    O1IMG: ["man-united.png"],
    O2IMG: ["liverpool.png"],
    O1I: 2001,
    O2I: 2002,
    CHIMG: "premier-league.png",
    EC: 18,
    GNS: true
  },
  {
    I: "mock-3",
    O1: "PSG",
    O2: "Marseille",
    L: "Ligue 1",
    LI: 125,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "France",
    S: now + sevenMinutes,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 1.80 },
      { G: 1, T: 2, C: 3.80 },
      { G: 1, T: 3, C: 4.00 }
    ],
    O1IMG: ["psg.png"],
    O2IMG: ["marseille.png"],
    O1I: 3001,
    O2I: 3002,
    CHIMG: "ligue1.png",
    EC: 20,
    GNS: true
  },
  {
    I: "mock-4",
    O1: "Bayern Munich",
    O2: "Dortmund",
    L: "Bundesliga",
    LI: 126,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "Allemagne",
    S: now + eightMinutes,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 1.60 },
      { G: 1, T: 2, C: 4.20 },
      { G: 1, T: 3, C: 4.50 }
    ],
    O1IMG: ["bayern.png"],
    O2IMG: ["dortmund.png"],
    O1I: 4001,
    O2I: 4002,
    CHIMG: "bundesliga.png",
    EC: 22,
    GNS: true
  },
  {
    I: "mock-5",
    O1: "Juventus",
    O2: "AC Milan",
    L: "Serie A",
    LI: 127,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "Italie",
    S: now + nineMinutes,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 2.30 },
      { G: 1, T: 2, C: 3.30 },
      { G: 1, T: 3, C: 3.10 }
    ],
    O1IMG: ["juventus.png"],
    O2IMG: ["ac-milan.png"],
    O1I: 5001,
    O2I: 5002,
    CHIMG: "seriea.png",
    EC: 16,
    GNS: true
  },
  {
    I: "mock-6",
    O1: "Inter Milan",
    O2: "Napoli",
    L: "Serie A",
    LI: 127,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "Italie",
    S: now + tenMinutes,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 2.45 },
      { G: 1, T: 2, C: 3.15 },
      { G: 1, T: 3, C: 2.90 }
    ],
    O1IMG: ["inter.png"],
    O2IMG: ["napoli.png"],
    O1I: 6001,
    O2I: 6002,
    CHIMG: "seriea.png",
    EC: 17,
    GNS: true
  },
  {
    I: "mock-7",
    O1: "Chelsea",
    O2: "Arsenal",
    L: "Premier League",
    LI: 124,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "Angleterre",
    S: now + fiveMinutes + 30000,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 2.65 },
      { G: 1, T: 2, C: 3.00 },
      { G: 1, T: 3, C: 2.75 }
    ],
    O1IMG: ["chelsea.png"],
    O2IMG: ["arsenal.png"],
    O1I: 7001,
    O2I: 7002,
    CHIMG: "premier-league.png",
    EC: 19,
    GNS: true
  },
  {
    I: "mock-8",
    O1: "Atletico Madrid",
    O2: "Sevilla",
    L: "La Liga",
    LI: 123,
    SN: "FIFA Virtuel",
    SI: 85,
    CN: "Espagne",
    S: now + sixMinutes + 30000,
    TN: "À venir",
    SC: {
      FS: { S1: 0, S2: 0 },
      SLS: "À venir",
      CPS: "Avant match"
    },
    E: [
      { G: 1, T: 1, C: 2.20 },
      { G: 1, T: 2, C: 3.40 },
      { G: 1, T: 3, C: 3.30 }
    ],
    O1IMG: ["atletico.png"],
    O2IMG: ["sevilla.png"],
    O1I: 8001,
    O2I: 8002,
    CHIMG: "laliga.png",
    EC: 21,
    GNS: true
  }
];

module.exports = mockMatches;
