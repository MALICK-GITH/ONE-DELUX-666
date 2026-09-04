# FURY X ONE - FIFA Virtual Match Prediction & Coupon Generator

🚀 **Application de prédiction de matchs FIFA virtuels avec génération de coupons optimisés**

---

## 🌐 Production URL

**https://fury-x-one-3aao.onrender.com**

---

## 📋 Table des Matières

- [Installation Rapide](#installation-rapide)
- [API Endpoints](#api-endpoints)
- [Fonctionnalités](#fonctionnalités)
- [Documentation Complète](#documentation-complète)
- [Déploiement](#déploiement)
- [Support](#support)

---

## 🚀 Installation Rapide

### 1. Copier le projet

Copier tout le dossier du projet sur la machine.

### 2. Créer le fichier `.env`

Mettre ceci dedans :

```env
PORT=3000
SERVER_PORT=3000
LIVE_FEED_URL=https://888starz.bet/service-api/LiveFeed/Get1x2_VZip
PENALTY_API_URL=https://888starz.bet/service-api/LiveFeed/Get1x2_VZip
PREDICTION_API_URL=http://localhost:8000
AI_MODEL_API_URL=https://your-ai-api-url.com
AI_MODEL_API_KEY=your_api_key_here
AI_MODEL_NAME=model_name_here
LIVE_FEED_TIMEOUT_MS=45000
SSL_VERIFY=false
NODE_ENV=production
```

### 3. Installer les dépendances

Dans le dossier du projet :

```bash
npm install
```

### 4. Lancer le serveur

```bash
node server.js
```

### 5. Ouvrir le site

```txt
http://127.0.0.1:3000
```

---

## 🔌 API Endpoints

### Matchs

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/matches` | GET | Tous les matchs |
| `/api/matches/:id` | GET | Match spécifique |

### Prédictions

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/prediction` | POST | Prédiction match |
| `/api/prediction/health` | GET | Santé service |
| `/api/prediction/insight` | POST | Insights IA |
| `/api/prediction/models` | GET | Modèles disponibles |
| `/api/prediction/families` | GET | Familles de ligues |
| `/api/prediction/leagues/:family` | GET | Ligues par famille |
| `/api/prediction/model-info` | GET | Info modèle |
| `/api/prediction/batch` | POST | Prédictions batch |
| `/api/prediction/team-stats/:team` | GET | Stats équipe |
| `/api/prediction/league-stats/:league` | GET | Stats ligue |
| `/api/prediction/clear-cache` | POST | Nettoyer cache |

### Assistant IA

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/assistant/chat` | POST | Chat avec IA |

### Coupons

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/coupon` | POST | Générer coupon |
| `/api/coupon/ladder` | POST | Coupon ladder |
| `/api/coupon/multi` | POST | Coupon multi-stratégie |
| `/api/coupon/validate` | POST | Valider coupon |

### Penalties

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/penalties` | GET | Matchs penalties |
| `/api/penalties/:id` | GET | Match penalty spécifique |

### Proxy

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/proxy/image` | GET | Proxy image (CORS) |

### Visitor Tracking

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/visitors/stats` | GET | Stats visiteurs |
| `/api/visitors/clear` | POST | Nettoyer logs |

### 888starz Proxy

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/888starz/*` | GET | Proxy 888starz API |

**Documentation API complète:** Voir [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## ✨ Fonctionnalités

### Frontend

- **Page d'accueil:** Affichage matchs en temps réel avec filtres
- **Générateur de coupon:** Création de coupons optimisés
  - Profils de risque (Safe, Balanced, Aggressive)
  - Validation de coupons
  - Export image/PDF
  - Mode compétitif (Focus/Density/Pulse)
- **Assistant IA:** Chat intégré pour conseils
- **Notifications push:** Alertes en temps réel
- **PWA:** Application installable offline
- **Admin panel:** Tracking des visiteurs

### Backend

- **Live Feed:** Données matchs en temps réel
- **Prédictions IA:** Analyse avec modèles ML
- **Génération coupons:** Algorithmes génétiques
- **Visitor tracking:** Logging IP et métadonnées
- **Proxy APIs:** Contournement CORS

---

## 📚 Documentation Complète

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Documentation complète de tous les endpoints API
- **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)** - Documentation détaillée du projet (architecture, services, configuration)
- **[.env.example](.env.example)** - Exemple de configuration environnement

---

## 🚢 Déploiement

### Render (Production)

Le projet est déployé sur Render:

**URL:** https://fury-x-one-3aao.onrender.com

**Configuration:**
- Build Command: `npm install`
- Start Command: `node server.js`
- Environment Variables: Configurer comme dans `.env.example`

**Déploiement automatique:** Push sur `main` → Déploiement automatique

### Déploiement Local

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Éditer .env

# Lancement
node server.js

# Accès
http://localhost:3000
```

---

## 🔧 Statuts déjà corrigés

Le système retourne déjà les bons statuts :

- `a_venir` - Match à venir
- `en_cours` - Match en cours
- `termine` - Match terminé

## ✅ Ce qui est déjà prêt

Pas besoin de chercher :

- ✅ La bonne URL API
- ✅ Les bons paramètres
- ✅ Les bons headers
- ✅ La correction du `406`
- ✅ La correction des faux matchs live
- ✅ La correction des statuts
- ✅ La correction de `1 / X / 2`
- ✅ Support proxy (x-forwarded-for, x-real-ip)
- ✅ Rotation automatique des logs
- ✅ PWA manifest et service worker

## 🎯 Si tout est bien lancé

Tu dois avoir :

- ✅ Page d'accueil fonctionnelle
- ✅ Page coupon fonctionnelle
- ✅ `/api/matches` fonctionnel
- ✅ Page admin visiteurs accessible
- ✅ Assistant IA opérationnel
- ✅ Notifications push actives

## 📁 Structure du Projet

```
ONE-DELUX-666-main/
├── public/              # Fichiers statiques (HTML, CSS, JS)
├── server/              # Côté serveur (services, config)
├── logs/                # Logs visiteurs (créé auto)
├── server.js            # Point d'entrée serveur
├── package.json         # Dépendances
├── .env.example         # Configuration exemple
├── README.md           # Ce fichier
├── API_DOCUMENTATION.md # Documentation API
└── PROJECT_DOCUMENTATION.md # Documentation projet
```

## 🔐 Sécurité

- SSL/TLS activé en production (HTTPS)
- Input validation sur tous les endpoints
- Error handling sans exposition de données sensibles
- CORS proxy pour APIs externes
- **À implémenter:** Authentication, Rate limiting, CSRF protection

## 📊 Monitoring

- **Logs visiteurs:** `logs/visitors.json`
- **Console logs:** Requêtes, erreurs, performance
- **Admin panel:** `/admin-visitors.html`

## 🆘 Support

### Pages Utiles

- Page admin visiteurs: `https://fury-x-one-3aao.onrender.com/admin-visitors.html`
- Page d'accueil: `https://fury-x-one-3aao.onrender.com/`
- Page coupon: `https://fury-x-one-3aao.onrender.com/coupon.html`

### Documentation

- **API Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Project Documentation:** [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
- **Environment Variables:** [.env.example](.env.example)

### Contact

Pour toute question ou problème:
- GitHub Issues: https://github.com/MALICK-GITH/ONE-DELUX-666/issues

---

## 📝 Notes de Production

**Platform:** Render
**Node.js Version:** 18.17+
**SSL:** Activé (HTTPS)
**Performance:** Logs en mémoire (non persistants sur Render)

---

**Développé par:** SOLITAIRE HACK 🇨🇮  
**Version:** 1.0.0  
**Dernière mise à jour:** 2026
