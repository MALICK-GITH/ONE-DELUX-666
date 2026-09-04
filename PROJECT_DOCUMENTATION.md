# Documentation Projet - FURY X ONE

## 📋 Table des Matières

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Structure du Projet](#structure-du-projet)
4. [Technologies](#technologies)
5. [Configuration](#configuration)
6. [Développement](#développement)
7. [Déploiement](#déploiement)
8. [Fonctionnalités](#fonctionnalités)
9. [Services](#services)
10. [Sécurité](#sécurité)
11. [Monitoring](#monitoring)
12. [Troubleshooting](#troubleshooting)

---

## Overview

**FURY X ONE** est une application web de prédiction de matchs FIFA virtuels avec génération de coupons de paris optimisés. L'application utilise des modèles d'IA pour analyser les matchs et fournir des prédictions avec des niveaux de confiance.

**URL de Production:** `https://fury-x-one-3aao.onrender.com`

**Version:** 1.0.0

**Développeur:** SOLITAIRE HACK 🇨🇮

---

## Architecture

### Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Side                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │  Coupon UI   │  │  Admin UI    │      │
│  │  (HTML/CSS)  │  │  (Advanced)  │  │  (Visitors)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Server Side (Node.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HTTP Server │  │  API Routes  │  │  Middleware  │      │
│  │  (server.js) │  │  (Handlers)  │  │  (IP Logger) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Live Feed    │  │ Prediction   │  │  AI Model    │      │
│  │  Client      │  │  Client      │  │  Client      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              │
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 888Starz API │  │ Prediction   │  │  AI Model    │      │
│  │  (Proxy)     │  │  API         │  │  API         │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Flux de Données

1. **Matchs:** 888Starz API → Live Feed Client → Server → Frontend
2. **Prédictions:** Frontend → Prediction API → Server → Frontend
3. **Coupons:** Frontend → Advanced Engine → Server → Frontend
4. **Logs:** Frontend → Server → IP Logger → Fichier JSON

---

## Structure du Projet

```
ONE-DELUX-666-main/
├── public/                          # Fichiers statiques
│   ├── index.html                   # Page d'accueil
│   ├── coupon.html                  # Page générateur de coupon
│   ├── creator.html                 # Page créateur
│   ├── admin-visitors.html          # Page admin visiteurs
│   ├── styles.css                   # Styles globaux
│   ├── coupon.css                   # Styles coupon
│   ├── coupon-competitive-ui.css    # Styles UI compétitive
│   ├── coupon-compact-layout.css   # Styles layout compact
│   ├── coupon-mobile.css           # Styles mobile
│   ├── mobile-ultra-premium.css    # Styles mobile premium
│   ├── site-embellishment.css      # Styles embellissements
│   ├── signature.css               # Styles signature
│   ├── site-api.js                 # API client
│   ├── assistant-widget.js         # Widget assistant
│   ├── visualGenerator.js          # Générateur visuel
│   ├── coupon.js                   # Logique coupon
│   ├── coupon-advanced-engine.js   # Engine avancé
│   ├── coupon-ai-confidence.js     # Calcul confiance IA
│   ├── coupon-super-ai-chat.js     # Chat IA
│   ├── push-background.js          # Notifications push
│   ├── coupon-competitive-ui.js    # UI compétitive
│   ├── pwa.js                      # PWA configuration
│   └── icons/                      # Icônes PWA
├── server/                          # Côté serveur
│   ├── config.js                   # Configuration serveur
│   ├── ip-logger.js                # Logger IP visiteurs
│   └── services/                   # Services
│       ├── liveFeedClient.js       # Client Live Feed
│       ├── predictionClient.js     # Client Prédiction
│       ├── penaltyClient.js        # Client Penalty
│       └── aiModelClient.js        # Client IA
├── logs/                           # Logs (créé automatiquement)
│   └── visitors.json               # Logs visiteurs
├── .env.example                    # Exemple variables environnement
├── .env                            # Variables environnement (non commit)
├── server.js                       # Point d'entrée serveur
├── package.json                    # Dépendances Node.js
├── manifest.json                   # Manifest PWA
└── README.md                      # Documentation projet
```

---

## Technologies

### Frontend

- **HTML5** - Structure sémantique
- **CSS3** - Styling moderne avec CSS Grid/Flexbox
- **JavaScript (ES6+)** - Logique client
- **PWA** - Application Web Progressive
- **Service Worker** - Cache offline

### Backend

- **Node.js 18.17+** - Runtime JavaScript
- **HTTP Module** - Serveur HTTP natif
- **HTTPS Module** - Support SSL/TLS

### APIs Externes

- **888Starz API** - Données matchs FIFA
- **Prediction API** - Prédictions IA
- **AI Model API** - Modèles d'apprentissage

### Outils

- **Git** - Version control
- **Render** - Platform hosting

---

## Configuration

### Variables d'Environnement

Créer un fichier `.env` à la racine du projet:

```env
# Configuration Serveur
SERVER_PORT=3000
SSL_VERIFY=false

# URLs des APIs
LIVE_FEED_URL=https://api.example.com/livefeed
PREDICTION_API_URL=https://api.example.com/prediction
PENALTY_API_URL=https://api.example.com/penalties
AI_MODEL_API_URL=https://api.example.com/ai
AI_MODEL_API_KEY=your_api_key_here
AI_MODEL_NAME=model_name_here
```

### Configuration Serveur (`server/config.js`)

```javascript
module.exports = {
  port: process.env.SERVER_PORT || 3000,
  sslVerify: process.env.SSL_VERIFY === 'true',
  liveFeedUrl: process.env.LIVE_FEED_URL,
  predictionApiUrl: process.env.PREDICTION_API_URL,
  penaltyApiUrl: process.env.PENALTY_API_URL,
  aiModelApiUrl: process.env.AI_MODEL_API_URL,
  aiModelApiKey: process.env.AI_MODEL_API_KEY,
  aiModelName: process.env.AI_MODEL_NAME
};
```

---

## Développement

### Prérequis

- Node.js 18.17+
- npm ou yarn
- Git

### Installation

```bash
# Cloner le repository
git clone https://github.com/MALICK-GITH/ONE-DELUX-666.git
cd ONE-DELUX-666

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env
# Éditer .env avec vos configurations
```

### Lancement Local

```bash
# Développement
npm start

# Avec variables d'environnement
SERVER_PORT=3000 SSL_VERIFY=false npm start
```

### Structure des Services

#### Live Feed Client (`services/liveFeedClient.js`)

- Récupère les données de matchs en temps réel
- Gère la connexion WebSocket si disponible
- Cache les données pour éviter les appels redondants

#### Prediction Client (`services/predictionClient.js`)

- Communique avec l'API de prédiction
- Gère les erreurs et retry logic
- Cache les prédictions pour optimiser les performances

#### AI Model Client (`services/aiModelClient.js`)

- Interagit avec les modèles d'IA
- Gère l'envoi de données et réception de prédictions
- Supporte différents modèles

---

## Déploiement

### Render

Le projet est déployé sur Render.

**URL:** `https://fury-x-one-3aao.onrender.com`

#### Configuration Render

1. **Build Command:**
```bash
npm install
```

2. **Start Command:**
```bash
node server.js
```

3. **Environment Variables:**
Configurer les mêmes variables que dans `.env.example`

#### Déploiement Automatique

- Push sur `main` → Déploiement automatique
- Render build et déploie l'application

### Déploiement Manuel

```bash
# Build
npm install

# Test local
npm start

# Push sur GitHub
git add .
git commit -m "Deployment message"
git push origin main

# Render déploie automatiquement
```

---

## Fonctionnalités

### Frontend

#### Page d'Accueil (`index.html`)

- Affichage des matchs en temps réel
- Filtres par ligue et famille
- Visualisation des cotes et scores
- Interface responsive

#### Générateur de Coupon (`coupon.html`)

- Génération de coupons optimisés
- Sélection par profil de risque
- Validation de coupons
- Export en image/PDF
- Mode compétitif (Focus/Density/Pulse)
- Assistant IA intégré
- Notifications push

#### Page Créateur (`creator.html`)

- Interface de création personnalisée
- Configuration avancée des paramètres

#### Page Admin (`admin-visitors.html`)

- Visualisation des logs visiteurs
- Statistiques de trafic
- Nettoyage des logs

### Backend

#### API Endpoints

- **Matches:** Récupération et filtrage des matchs
- **Predictions:** Génération de prédictions IA
- **Coupons:** Génération et validation de coupons
- **Visitor Tracking:** Logging des visiteurs
- **Proxy:** Proxy pour APIs externes

#### Services

- **Live Feed:** Données matchs en temps réel
- **Prediction:** Prédictions IA
- **AI Model:** Modèles d'apprentissage
- **IP Logger:** Tracking des visiteurs

---

## Services

### Live Feed Service

**Fichier:** `services/liveFeedClient.js`

**Fonctionnalités:**
- Récupération des matchs depuis 888Starz
- Parsing des données FIFA
- Gestion des erreurs de connexion
- Cache des données

**Endpoints:**
- `GET /api/matches` - Tous les matchs
- `GET /api/matches/:id` - Match spécifique

### Prediction Service

**Fichier:** `services/predictionClient.js`

**Fonctionnalités:**
- Prédictions de matchs
- Analyse de confiance
- Cache des prédictions
- Gestion des erreurs

**Endpoints:**
- `POST /api/prediction` - Prédiction match
- `GET /api/prediction/health` - Santé service
- `POST /api/prediction/clear-cache` - Nettoyage cache

### AI Model Service

**Fichier:** `services/aiModelClient.js`

**Fonctionnalités:**
- Communication avec modèles IA
- Envoi de features
- Réception de prédictions
- Gestion multi-modèles

**Endpoints:**
- `POST /api/prediction/insight` - Insights IA
- `GET /api/prediction/models` - Modèles disponibles
- `POST /api/prediction/batch` - Prédictions batch

### Visitor Tracking Service

**Fichier:** `server/ip-logger.js`

**Fonctionnalités:**
- Logging des IP visiteurs
- Stockage dans fichier JSON
- Rotation automatique des logs
- Statistiques de visite

**Endpoints:**
- `GET /api/visitors/stats` - Statistiques visiteurs
- `POST /api/visitors/clear` - Nettoyage logs

---

## Sécurité

### Mesures Actuelles

- **SSL/TLS:** Activé en production (HTTPS)
- **Input Validation:** Validation des entrées utilisateur
- **Error Handling:** Gestion des erreurs sans exposition de données sensibles
- **CORS:** Proxy pour contourner les restrictions CORS

### Améliorations Recommandées

- **Authentication:** Implémenter l'authentification pour les endpoints sensibles
- **Rate Limiting:** Limiter les appels API pour prévenir les abus
- **Input Sanitization:** Sanitization complète des inputs
- **CSRF Protection:** Protection contre les attaques CSRF
- **Security Headers:** Ajouter des headers de sécurité (CSP, HSTS, etc.)
- **Environment Variables:** Ne jamais committer les secrets

### Variables Sensibles

- Ne jamais committer `.env`
- Utiliser `.env.example` comme template
- Configurer les secrets dans Render Environment Variables

---

## Monitoring

### Logs

**Fichier:** `logs/visitors.json`

**Contenu:**
- Timestamp
- IP adresse
- User Agent
- Referer
- Méthode HTTP
- Path

**Rotation:**
- Maximum 10,000 entrées
- Nettoyage automatique configurable

### Console Logs

Le serveur logge:
- Requêtes entrantes
- Erreurs serveur
- État des services
- Performance des appels API

### Monitoring Recommandé

- **Uptime Monitoring:** UptimeRobot ou similaire
- **Error Tracking:** Sentry pour tracking d'erreurs
- **Performance Monitoring:** Web Vitals
- **Analytics:** Google Analytics ou similaire

---

## Troubleshooting

### Problèmes Communs

#### Serveur ne démarre pas

**Solution:**
```bash
# Vérifier Node.js version
node --version  # Doit être 18.17+

# Vérifier les dépendances
npm install

# Vérifier le port
netstat -ano | findstr :3000
```

#### APIs externes ne répondent pas

**Solution:**
```bash
# Vérifier les URLs dans .env
# Vérifier SSL_VERIFY=false si nécessaire
# Tester les APIs avec curl
curl https://api.example.com/endpoint
```

#### Logs visiteurs ne s'enregistrent pas

**Solution:**
```bash
# Vérifier les permissions du dossier logs
# Créer le dossier logs manuellement
mkdir logs

# Vérifier que ip-logger.js est importé dans server.js
```

#### PWA ne fonctionne pas

**Solution:**
```bash
# Vérifier manifest.json
# Vérifier service worker registration
# Vérifier HTTPS requis pour PWA
```

### Debug Mode

Activer le debug mode:

```bash
DEBUG=* npm start
```

### Logs Détaillés

Ajouter des logs détaillés dans `server.js`:

```javascript
console.log('Debug:', { /* data */ });
```

---

## Support

### Contact

Pour toute question ou problème:

- **GitHub Issues:** https://github.com/MALICK-GITH/ONE-DELUX-666/issues
- **Email:** [à définir]

### Documentation

- **API Documentation:** `API_DOCUMENTATION.md`
- **Project Documentation:** `PROJECT_DOCUMENTATION.md` (ce fichier)
- **README:** `README.md`

---

## Changelog

### Version 1.0.0 (2026)

- Initial release
- Match tracking en temps réel
- Prédictions IA
- Générateur de coupons
- Visitor tracking
- PWA support
- Admin interface

---

## License

Propriétaire - Tous droits réservés

---

**Documentation créée par:** SOLITAIRE HACK 🇨🇮
**Dernière mise à jour:** 2026
