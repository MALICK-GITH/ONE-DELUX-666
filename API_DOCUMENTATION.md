# API Documentation - FURY X ONE

**Base URL:** `https://fury-x-one-3aao.onrender.com`

---

## Table of Contents

- [Matches](#matches)
- [Predictions](#predictions)
- [AI Assistant](#ai-assistant)
- [Coupons](#coupons)
- [Penalties](#penalties)
- [Proxy](#proxy)
- [Visitor Tracking](#visitor-tracking)
- [888starz Proxy](#888starz-proxy)

---

## Matches

### Get All Matches
`GET /api/matches`

Récupère tous les matchs disponibles.

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "id": "string",
      "league": "string",
      "team1": "string",
      "team2": "string",
      "startTime": "ISO string",
      "odds": {
        "home": number,
        "draw": number,
        "away": number
      }
    }
  ]
}
```

### Get Match by ID
`GET /api/matches/:matchId`

Récupère les détails d'un match spécifique.

**Parameters:**
- `matchId` (string) - ID du match

**Response:**
```json
{
  "success": true,
  "match": {
    "id": "string",
    "league": "string",
    "team1": "string",
    "team2": "string",
    "startTime": "ISO string",
    "odds": { ... },
    "score": { ... }
  }
}
```

---

## Predictions

### Get Prediction
`POST /api/prediction`

Génère une prédiction pour un match.

**Request Body:**
```json
{
  "team_home": "string",
  "team_away": "string",
  "league": "string",
  "market_data": { } // Optionnel
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "home_win": number,
    "draw": number,
    "away_win": number,
    "confidence": number,
    "recommended_bet": "string"
  }
}
```

### Prediction Health
`GET /api/prediction/health`

Vérifie l'état de santé du service de prédiction.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "ISO string"
}
```

### AI Insight
`POST /api/prediction/insight`

Obtient des insights IA pour un match.

**Request Body:**
```json
{
  "team_home": "string",
  "team_away": "string",
  "league": "string"
}
```

**Response:**
```json
{
  "success": true,
  "insight": {
    "analysis": "string",
    "factors": [ ... ],
    "recommendation": "string"
  }
}
```

### Get AI Models
`GET /api/prediction/models`

Récupère la liste des modèles IA disponibles.

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "name": "string",
      "version": "string",
      "accuracy": number
    }
  ]
}
```

### Get Prediction Families
`GET /api/prediction/families`

Récupère les familles de ligues disponibles pour les prédictions.

**Response:**
```json
{
  "success": true,
  "families": ["Penalty", "Highscore", "Rush", "Classic"]
}
```

### Get Leagues by Family
`GET /api/prediction/leagues/:family`

Récupère les ligues d'une famille spécifique.

**Parameters:**
- `family` (string) - Nom de la famille

**Response:**
```json
{
  "success": true,
  "leagues": ["string", "string"]
}
```

### Get Model Info
`GET /api/prediction/model-info`

Récupère les informations sur le modèle de prédiction actuel.

**Response:**
```json
{
  "success": true,
  "model_info": {
    "name": "string",
    "version": "string",
    "last_trained": "ISO string"
  }
}
```

### Batch Predictions
`POST /api/prediction/batch`

Génère des prédictions pour plusieurs matchs.

**Request Body:**
```json
{
  "matches": [
    {
      "team_home": "string",
      "team_away": "string",
      "league": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "predictions": [ ... ]
}
```

### Get Team Stats
`GET /api/prediction/team-stats/:teamName`

Récupère les statistiques d'une équipe.

**Parameters:**
- `teamName` (string) - Nom de l'équipe

**Response:**
```json
{
  "success": true,
  "stats": {
    "wins": number,
    "losses": number,
    "draws": number,
    "form": [ ... ]
  }
}
```

### Get League Stats
`GET /api/prediction/league-stats/:leagueName`

Récupère les statistiques d'une ligue.

**Parameters:**
- `leagueName` (string) - Nom de la ligue

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_matches": number,
    "avg_goals": number,
    "home_win_rate": number
  }
}
```

### Clear Cache
`POST /api/prediction/clear-cache`

Nettoie le cache des prédictions.

**Response:**
```json
{
  "success": true,
  "result": "Cache cleared"
}
```

---

## AI Assistant

### Chat with AI
`POST /api/assistant/chat`

Envoie un message à l'assistant IA.

**Request Body:**
```json
{
  "message": "string",
  "context": { } // Optionnel
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "message": "string",
    "confidence": number,
    "sources": [ ... ]
  }
}
```

---

## Coupons

### Generate Coupon
`POST /api/coupon`

Génère un coupon de paris.

**Request Body:**
```json
{
  "size": number,
  "risk_profile": "string",
  "league": "string",
  "min_start_minutes": number
}
```

**Response:**
```json
{
  "success": true,
  "coupon": {
    "selections": [ ... ],
    "total_odds": number,
    "confidence": number
  }
}
```

### Generate Ladder Coupon
`POST /api/coupon/ladder`

Génère un coupon ladder (répartition 60/30/10).

**Request Body:**
```json
{
  "size": number,
  "risk_profile": "string",
  "league": "string"
}
```

**Response:**
```json
{
  "success": true,
  "ladder": {
    "safe": { ... },
    "balanced": { ... },
    "aggressive": { ... }
  }
}
```

### Generate Multi Coupon
`POST /api/coupon/multi`

Génère 3 coupons avec différentes stratégies.

**Request Body:**
```json
{
  "size": number,
  "risk_profile": "string",
  "league": "string"
}
```

**Response:**
```json
{
  "success": true,
  "multi": [
    { "strategy": "safe", "coupon": { ... } },
    { "strategy": "balanced", "coupon": { ... } },
    { "strategy": "aggressive", "coupon": { ... } }
  ]
}
```

### Validate Coupon
`POST /api/coupon/validate`

Valide un coupon généré.

**Request Body:**
```json
{
  "coupon": { }
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "is_valid": boolean,
    "confidence": number,
    "warnings": [ ... ]
  }
}
```

---

## Penalties

### Get Penalty Matches
`GET /api/penalties`

Récupère tous les matchs de pénalties.

**Response:**
```json
{
  "success": true,
  "matches": [ ... ]
}
```

### Get Penalty Match by ID
`GET /api/penalties/:matchId`

Récupère les détails d'un match de pénalties.

**Parameters:**
- `matchId` (string) - ID du match

**Response:**
```json
{
  "success": true,
  "match": { ... }
}
```

---

## Proxy

### Image Proxy
`GET /api/proxy/image?url=...`

Proxy pour récupérer des images (contourne CORS).

**Query Parameters:**
- `url` (string) - URL de l'image à proxy

**Response:**
- Image binaire

---

## Visitor Tracking

### Get Visitor Stats
`GET /api/visitors/stats`

Récupère les statistiques des visiteurs.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": number,
    "uniqueIps": number,
    "recent": [
      {
        "timestamp": "ISO string",
        "ip": "string",
        "userAgent": "string",
        "referer": "string",
        "method": "string",
        "path": "string"
      }
    ]
  }
}
```

### Clear Visitor Logs
`POST /api/visitors/clear`

Nettoie les logs de visiteurs anciens.

**Request Body:**
```json
{
  "daysToKeep": number // défaut: 30
}
```

**Response:**
```json
{
  "success": true,
  "deleted": number
}
```

---

## 888starz Proxy

### Proxy 888starz API
`GET /api/888starz/*`

Proxy vers l'API 888starz.

**Path:**
- `/api/888starz/{endpoint}` - Endpoint 888starz à proxy

**Response:**
- Réponse de l'API 888starz

---

## Error Responses

Toutes les endpoints retournent des erreurs au format suivant:

```json
{
  "success": false,
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request
- `500` - Internal Server Error

---

## Rate Limiting

Actuellement, il n'y a pas de rate limiting implémenté. À considérer pour la production.

---

## Authentication

Actuellement, il n'y a pas d'authentification requise pour les endpoints publics. À implémenter pour les endpoints sensibles (visitor tracking, admin).

---

## WebSocket

Pas de WebSocket implémenté actuellement. À considérer pour les mises à jour en temps réel des matchs.

---

## Notes de Production

**URL de production:** `https://fury-x-one-3aao.onrender.com`

**Environment:**
- Platform: Render
- Node.js version: 18.17+
- SSL: Activé (HTTPS)

**Performance:**
- Les logs visiteurs sont stockés localement (pas persistants sur Render)
- Le cache des prédictions est en mémoire (perdu au redémarrage)
- À considérer: Database externe pour la production

---

## Support

Pour toute question ou problème, contacter l'équipe de développement.

**Documentation créée par:** SOLITAIRE HACK 🇨🇮
