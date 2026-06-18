# 🚀 DEPLOYMENT CONFIGURATION - SOLITAIRE HACK

**Configuration pour serveur web avec API Live Feed**
**URL Base:** https://one-delux-fast.onrender.com

---

## 📋 CONFIGURATION ACTUELLE

### ✅ Ce qui fonctionne
- Serveur web statique (fichiers HTML/CSS/JS)
- **API Live Feed livefeedsht-vmp** (matchs en direct)
- Génération visuelle locale (VisualGenerator)
- Modèles de prédiction IA entraînés (TrainedModelPredictor)

### ❌ Ce qui reste désactivé
- **Système CRON** (plus de collecte automatique)
- **Base de données Supabase** (plus de connexion externe)
- **Anciens endpoints API** (seuls les endpoints matchs sont actifs)

---

## 🌐 DÉPLOIEMENT SUR RENDER

### Variables d'environnement
**Sur Render Dashboard:**
1. Service → Settings → Environment Variables
2. Ajouter:
   - `PORT` = `3029` (optionnel, utilise 3000 par défaut)
   - `LIVE_FEED_URL` = `https://livefeedsht-vmp.onrender.com/live-feed`

### Commande de démarrage
```
node server.js
```

---

## � API ENDPOINTS DISPONIBLES

### Matchs en direct
**GET** `/api/matches`
- Retourne tous les matchs disponibles
- Format JSON avec données complètes
- Cache: 30 secondes par défaut

**GET** `/api/matches/{id}`
- Retourne un match spécifique par ID
- Format JSON avec données détaillées
- Cache: 30 secondes par défaut

### Exemple d'utilisation
```bash
# Obtenir tous les matchs
curl https://one-delux-fast.onrender.com/api/matches

# Obtenir un match spécifique
curl https://one-delux-fast.onrender.com/api/matches/123456
```

### Format de réponse
```json
{
  "success": true,
  "updatedAt": "2026-06-09T10:30:00.000Z",
  "count": 40,
  "matches": [
    {
      "id": "123456",
      "league": "FC 26. Superligue",
      "team1": "Real Madrid",
      "team2": "Barcelona",
      "startTime": "2026-06-09T12:00:00.000Z",
      "status": "Live",
      "currentScore": {
        "home": 2,
        "away": 1
      },
      "odds": {
        "home": 1.85,
        "draw": 3.50,
        "away": 4.20
      }
    }
  ]
}
```

---

## �🔧 CONFIGURATION LOCALE

### Installation des dépendances
```bash
npm install
```

### Démarrage local
```bash
npm start
```

Le serveur sera disponible sur `http://localhost:3029`

---

## 📁 STRUCTURE DU PROJET

### Fichiers principaux
- `server.js` - Serveur HTTP statique minimaliste
- `server/config.js` - Configuration simplifiée
- `public/` - Fichiers statiques (HTML/CSS/JS)
- `services/` - Services internes (prédiction IA, génération visuelle)

### Services conservés
- `services/trainedModelPredictor.js` - Modèles de prédiction IA
- `services/visualGenerator.js` - Génération d'images visuelles
- `services/couponManager.js` - Gestion de coupons (Telegram)

### Services supprimés
- ~~`services/cronLearningService.js`~~ - Collecte automatique
- `services/liveFeedClient.js` - API de matchs
- ~~`services/finishedMatchStore.js`~~ - Stockage base de données
- ~~`services/matchStatus.js`~~ - Statut de matchs

---

## 🚀 DÉPLOIEMENT

### Depuis GitHub (automatic)
1. Push vers le repository
2. Render détecte automatiquement les changements
3. Redéploiement automatique

### Manuel (si nécessaire)
1. Dashboard Render → votre service
2. Cliquez sur "Manual Deploy"
3. Choisissez "Deploy latest commit"

---

## 📊 MONITORING

### Logs de déploiement
- Dashboard Render → votre service → Logs
- Vérifiez les messages: "FURY X ONE 👿 disponible sur http://localhost:3029"
- Message de confirmation: "Tous les API et CRON ont été désactivés"

### Vérification du statut
Visitez simplement: `https://one-delux-fast.onrender.com`

---

## 🛡️ SÉCURITÉ

### Pas d'API externes
- Aucune connexion à des API tierces
- Aucune collecte de données automatique
- Aucune connexion base de données
- Serveur entièrement statique

### Variables d'environnement
- Aucune variable sensible requise
- Configuration minimale
- Pas de secrets nécessaires

---

**SIGNÉ:** SOLITAIRE HACK
**Date:** 2026-06-09
**Version:** 2.0 - Static Web Server Only
