# 🚀 DEPLOYMENT CONFIGURATION - SOLITAIRE HACK

**Configuration simplifiée pour serveur web statique**
**URL Base:** https://one-delux-fast.onrender.com

---

## 📋 CONFIGURATION ACTUELLE

### ✅ Ce qui fonctionne
- Serveur web statique (fichiers HTML/CSS/JS)
- Génération visuelle locale (VisualGenerator)
- Modèles de prédiction IA entraînés (TrainedModelPredictor)

### ❌ Ce qui a été désactivé
- **Tous les API REST** (plus aucun endpoint `/api/*`)
- **Système CRON complet** (plus de collecte automatique)
- **API Live Feed** (plus d'API de matchs en direct)
- **Base de données Supabase** (plus de connexion externe)

---

## 🌐 DÉPLOIEMENT SUR RENDER

### Variables d'environnement minimales
**Sur Render Dashboard:**
1. Service → Settings → Environment Variables
2. Ajouter uniquement:
   - `PORT` = `3029` (optionnel, utilise 3000 par défaut)

### Commande de démarrage
```
node server.js
```

---

## 🔧 CONFIGURATION LOCALE

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
- ~~`services/liveFeedClient.js`~~ - API de matchs
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
- Vérifiez les messages: "RUST SIT XPR disponible sur http://localhost:3029"
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