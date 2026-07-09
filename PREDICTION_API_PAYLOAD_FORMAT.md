# Format des Données Envoyées à l'API de Prédiction

## 📡 Flux de Données

Lorsqu'un utilisateur clique sur "Détails" d'un match, les données suivantes sont envoyées à l'API de prédiction:

### 1. Point d'Entrée Frontend (`public/match.js`)

```javascript
// Dans loadMatchPrediction() (ligne 842-847)
const data = await window.SiteAPI.prediction(
  currentMatchData.team1,      // Équipe domicile
  currentMatchData.team2,      // Équipe extérieur
  exactLeague,                  // Ligue exacte (résolue)
  currentMatchData,            // Données complètes du match
);
```

### 2. Construction du Payload (`public/site-api.js`)

```javascript
// Dans prediction() (ligne 53-78)
const requestBody = {
  I: matchData.id || matchData.I || matchData.match_id || "",
  O1: teamHome,
  O2: teamAway,
  L: league,
  S: matchData.startTimeTimestamp || matchData.S || matchData.timestamp || null,
  E: Array.isArray(matchData.E)
    ? matchData.E
    : Array.isArray(matchData.markets)
      ? matchData.markets
      : Array.isArray(matchData.odds?.markets)
        ? matchData.odds.markets
        : [],
  AE: Array.isArray(matchData.AE)
    ? matchData.AE
    : Array.isArray(matchData.advancedMarkets?.advancedMarkets)
      ? matchData.advancedMarkets.advancedMarkets
      : [],
};
```

### 3. Payload Final (`services/predictionClient.js`)

```javascript
// Dans buildRemotePayload() (ligne 132-144)
return {
  I: toString(source.I ?? source.match_id ?? source.id, ""),
  O1: toString(source.O1 ?? source.team_home ?? source.teamHome ?? source.home_team ?? source.team1, ""),
  O2: toString(source.O2 ?? source.team_away ?? source.teamAway ?? source.away_team ?? source.team2, ""),
  L: toString(source.L ?? source.league, ""),
  S: source.S ?? source.timestamp ?? source.startTimeTimestamp ?? null,
  SC: source.SC ?? undefined,
  E: normalizeMarketList(source.E ?? source.e ?? source.market_data?.E ?? source.markets ?? []),
  AE: normalizeMarketList(source.AE ?? source.ae ?? source.market_data?.AE ?? source.advancedMarkets?.advancedMarkets ?? []),
};
```

## 📋 Structure du Payload Final

### Champs Principaux

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `I` | String | ID du match | "12345678" |
| `O1` | String | Équipe domicile | "PSG" |
| `O2` | String | Équipe extérieur | "Lyon" |
| `L` | String | Ligue | "Ligue 1" |
| `S` | Number/null | Timestamp de début | 1719504000 |
| `SC` | Any | Score actuel (optionnel) | {home: 2, away: 1} |
| `E` | Array | Marchés principaux | [...] |
| `AE` | Array | Marchés avancés | [...] |

### Structure des Marchés (`E` et `AE`)

Chaque marché a la structure suivante:

```javascript
{
  T: Number,  // Type de marché (1=1X2 home, 2=1X2 draw, 3=1X2 away, etc.)
  C: Number,  // Cote (coefficient)
  P: Number,  // Ligne/paramètre (pour over/under, handicap, etc.)
  B: String,  // Bookmaker (optionnel)
  G: Number,  // Groupe de marché (1=1X2, 2=handicap, 17=over/under, etc.)
  ME: Array   // Marchés imbriqués (pour AE)
}
```

### Normalisation des Marchés

La fonction `normalizeMarketList()` (ligne 25-43) transforme les marchés:

```javascript
{
  T: toNumber(entry.T, entry.T),  // Type
  C: toNumber(entry.C, entry.C),  // Cote
  P: toNumber(entry.P, entry.P),  // Paramètre
  B: entry.B,                      // Bookkeeper
  G: toNumber(entry.G, entry.G),  // Groupe
  ME: normalizeMarketList(entry.ME) // Marchés imbriqués
}
```

## 🎯 Exemple Complet de Payload

```json
{
  "I": "match_12345",
  "O1": "Paris Saint-Germain",
  "O2": "Olympique Lyonnais",
  "L": "Ligue 1",
  "S": 1719504000,
  "SC": null,
  "E": [
    {
      "T": 1,
      "C": 1.85,
      "P": null,
      "B": "888starz",
      "G": 1
    },
    {
      "T": 2,
      "C": 3.40,
      "P": null,
      "B": "888starz",
      "G": 1
    },
    {
      "T": 3,
      "C": 4.20,
      "P": null,
      "B": "888starz",
      "G": 1
    },
    {
      "T": 9,
      "C": 1.90,
      "P": 2.5,
      "B": "888starz",
      "G": 17
    },
    {
      "T": 10,
      "C": 1.90,
      "P": 2.5,
      "B": "888starz",
      "G": 17
    }
  ],
  "AE": [
    {
      "G": 2,
      "ME": [
        {
          "T": 7,
          "C": 1.95,
          "P": -1.0,
          "B": "888starz"
        },
        {
          "T": 8,
          "C": 1.95,
          "P": 1.0,
          "B": "888starz"
        }
      ]
    }
  ]
}
```

## 🔧 Types de Marchés Communs

### Groupe 1: 1X2 (Résultat du match)
- `T: 1` - Victoire domicile
- `T: 2` - Match nul
- `T: 3` - Victoire extérieur

### Groupe 2: Handicap
- `T: 7` - Handicap domicile
- `T: 8` - Handicap extérieur

### Groupe 17: Over/Under
- `T: 9` - Over
- `T: 10` - Under

## 📡 Endpoint API

**Méthode:** POST  
**URL:** `/api/prediction`  
**Content-Type:** application/json

## ⚙️ Configuration API

Les API de prédiction doivent s'attendre à recevoir ce format de payload. Pour configurer vos API:

1. **Accepter les champs**: `I`, `O1`, `O2`, `L`, `S`, `SC`, `E`, `AE`
2. **Parser les marchés**: Les tableaux `E` et `AE` contiennent des objets avec `T`, `C`, `P`, `B`, `G`
3. **Gérer les valeurs null**: Certains champs peuvent être null ou absents
4. **Retourner le format attendu**: Voir `normalizePredictionResponse()` dans `predictionClient.js`

## 🔄 Fallback Local

Si l'API distante échoue, le système utilise un payload local enrichi:

```javascript
// Dans buildLocalPayload() (ligne 146-181)
{
  league: remotePayload.L,
  team_home: remotePayload.O1,
  team_away: remotePayload.O2,
  rolling_home: { avg_scored: 1.5, avg_conceded: 1.2, win_rate: 0.5 },
  rolling_away: { avg_scored: 1.5, avg_conceded: 1.2, win_rate: 0.5 },
  h2h: { h2h_home_wins: 0.5, h2h_avg_goals: 2.5, h2h_n: 0 },
  market_data: { E: remotePayload.E, AE: remotePayload.AE }
}
```

---
**Document généré par SOLITAIRE HACK**  
**Projet:** ONE-DELUX-666  
**Date:** 2026-07-09
