# INTEGRATION API FIFA PREDICTION

## 📋 Vue d'ensemble

L'API FIFA Prediction fournit des prédictions de matchs FIFA en utilisant des modèles d'apprentissage automatique entraînés sur des données historiques. L'API est conçue pour être intégrée directement avec les plateformes de paris.

## 🔗 Configuration

### Environnement de Développement
- **URL de base:** `http://localhost:5000`
- **Port:** 5000
- **Format:** JSON
- **Méthode:** POST pour les prédictions

### Environnement de Production
- **URL de base:** `https://api-fast-82wa.onrender.com`
- **Port:** 443 (HTTPS)
- **Format:** JSON
- **Méthode:** POST pour les prédictions
- **Protocole:** HTTPS
- **Authentification:** Aucune (endpoint public)
- **Statut:** Actif et opérationnel

### Déploiement
- **Plateforme:** Render (onrender.com)
- **Type:** Web Service
- **Runtime:** Python
- **Statut:** Actif et opérationnel
- **Modèles chargés:** 18 ligues × 3 modèles = 54 modèles au total
- **Type de modèles:**
  - RandomForestClassifier (result, parity)
  - GradientBoostingRegressor (goals)
- **Taille des modèles:** ~2-5 Mo par modèle
- **Temps de chargement initial:** ~10-15 secondes
- **Mémoire requise:** ~200-300 Mo

## 📡 Endpoints Disponibles

### 1. `/health` (GET)
Vérifie la santé de l'API et les modèles chargés.

**Réponse:**
```json
{
  "status": "healthy",
  "models_loaded": 18,
  "leagues_supported": 18,
  "total_models": 54,
  "models_by_type": {
    "result": 18,
    "goals": 18,
    "parity": 18
  },
  "environment": "production",
  "platform": "render",
  "uptime": "2h 15m 30s"
}
```

### 2. `/leagues` (GET)
Liste toutes les ligues supportées avec leurs modèles disponibles.

**Réponse:**
```json
{
  "total": 18,
  "leagues": [
    {
      "name": "FC 26. 5x5 Rush. Superligue",
      "family": "RUSH",
      "models_available": ["result", "goals", "parity"],
      "model_files": {
        "result": "FC26__5x5_Rush__Superligue_result.pkl",
        "goals": "FC26__5x5_Rush__Superligue_goals.pkl",
        "parity": "FC26__5x5_Rush__Superligue_parity.pkl"
      }
    },
    {
      "name": "FC 24. 4x4. Championnat d'Angleterre",
      "family": "CLASSIC",
      "models_available": ["result", "goals", "parity"]
    },
    {
      "name": "FC 26. Champions League",
      "family": "CHAMPIONS",
      "models_available": ["result", "goals", "parity"]
    }
  ]
}
```

### 3. `/predict` (POST)
Prédiction pour un match unique.

**Format d'entrée (format plateforme):**
```json
{
  "I": "734915710",
  "O1": "Barcelone",
  "O2": "Galatasaray",
  "L": "FC 26. 5x5 Rush. Superligue",
  "S": 1783516200,
  "E": [
    {"T": 1, "C": 1.096},
    {"T": 2, "C": 6.14},
    {"T": 3, "C": 30}
  ]
}
```

**Réponse:**
```json
{
  "success": true,
  "I": "734915710",
  "O1": "Barcelone",
  "O2": "Galatasaray",
  "L": "FC 26. 5x5 Rush. Superligue",
  "predictions": {
    "match_result": {
      "prediction": "home_win",
      "confidence": 0.52,
      "probabilities": {
        "home_win": 0.52,
        "draw": 0.35,
        "away_win": 0.13
      }
    },
    "total_goals": {
      "predicted": 7.4,
      "platform_value": 7.5
    },
    "total_parity": {
      "prediction": "even",
      "confidence": 0.55
    },
    "over_under": {
      "threshold": 6.5,
      "prediction": "over",
      "confidence": 0.92
    }
  },
  "platform_odds": {
    "main": {
      "home_win": {"value": 1.096},
      "draw": {"value": 6.14},
      "away_win": {"value": 30}
    },
    "over_under": [
      {"type": "over", "threshold": 7.5, "value": 1.504},
      {"type": "under", "threshold": 7.5, "value": 2.5}
    ],
    "handicap": [
      {"type": "home", "handicap": -1.5, "value": 2.565}
    ]
  },
  "timestamp": 1783516200
}
```

### 4. `/predict/batch` (POST)
Prédictions pour plusieurs matchs.

**Format d'entrée:**
```json
{
  "matches": [
    {
      "I": "734915710",
      "O1": "Barcelone",
      "O2": "Galatasaray",
      "L": "FC 26. 5x5 Rush. Superligue",
      "S": 1783516200
    },
    {
      "I": "734917661",
      "O1": "Fenerbahçe",
      "O2": "Lombardia",
      "L": "FC 26. 5x5 Rush. Superligue",
      "S": 1783516800
    }
  ]
}
```

**Réponse:**
```json
{
  "success": true,
  "total_matches": 2,
  "predictions": [
    {...},
    {...}
  ]
}
```

### 5. `/model/{league_name}` (GET)
Informations sur le modèle d'une ligue spécifique.

**Réponse:**
```json
{
  "league": "FC 26. 5x5 Rush. Superligue",
  "family": "RUSH",
  "models": {
    "match_result": {
      "type": "RandomForestClassifier",
      "accuracy": 0.72,
      "features": 14
    },
    "total_goals": {
      "type": "GradientBoostingRegressor",
      "accuracy": 0.85,
      "features": 14
    },
    "total_parity": {
      "type": "RandomForestClassifier",
      "accuracy": 0.68,
      "features": 14
    }
  }
}
```

## 📝 Format des Données

### Champs d'Entrée (Format Plateforme)

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| I | string | Oui | Identifiant du match |
| O1 | string | Oui | Équipe domicile |
| O2 | string | Oui | Équipe extérieur |
| L | string | Oui | Nom de la ligue |
| S | integer | Non | Timestamp Unix |
| SC | object | Non | Score et statut (FS=score final, TS=temps restant) |
| E | array | Non | Cotes principales (T=type, C=cote, P=paramètre, B=blocked) |
| AE | array | Non | Cotes additionnelles par groupe (G=groupe, ME=liste de cotes) |

### Codes de Cote (E.T)

| Code | Description |
|------|-------------|
| T=1 | Victoire domicile (Home Win) |
| T=2 | Match nul (Draw) |
| T=3 | Victoire extérieur (Away Win) |
| T=4 | No Bet |
| T=5 | BTTS Non (Both Teams To Score No) |
| T=6 | BTTS Oui (Both Teams To Score Yes) |
| T=7 | Handicap domicile (Home Handicap) |
| T=8 | Handicap extérieur (Away Handicap) |
| T=9 | Over (Plus de) |
| T=10 | Under (Moins de) |
| T=11-14 | Over/Under (variantes selon seuil) |
| T=180-181 | Double Chance |

### Codes de Groupe (AE.G)

| Code | Description |
|------|-------------|
| G=2 | Handicap |
| G=17 | Total Goals |

## 🏆 Ligues Supportées

### Ligues RUSH (5x5)
- FC 26. 5x5 Rush. Superligue

### Ligues CLASSIC (4x4)
- FC 24. 4x4. Championnat d'Angleterre

### Ligues CHAMPIONS
- FC 26. Champions League
- FC 25. Champions League

### Ligues CLASSIC (3x3)
- FC 25. 3x3. Ligue de conférence

### Ligues WORLD
- FC 26. Championnat du monde
- World Cup 2026 Simulation

### Ligues CLASSIC (Championnats nationaux)
- FC 25. Italy Championship
- FC 25. Championnat d'Angleterre
- FC 25. Championnat d'Allemagne
- FC 25. Spain Championship
- FC 26. Spain Championship

### Ligues PENALTY
- FIFA23 Penalty
- Penalty

### Autres ligues
- FC 25. Ligue européenne

## 🔧 Types de Prédictions

### 1. Match Result (1X2)
- **home_win**: Victoire domicile
- **draw**: Match nul
- **away_win**: Victoire extérieur
- **confidence**: Niveau de confiance (0-1)
- **probabilities**: Probabilités pour chaque résultat

### 2. Total Goals
- **predicted**: Nombre de buts prédit
- **platform_value**: Valeur la plus proche disponible sur la plateforme
- **confidence**: Niveau de confiance

### 3. Total Parity
- **even**: Total pair
- **odd**: Total impair
- **confidence**: Niveau de confiance

### 4. Over/Under
- **threshold**: Seuil de buts (adapté selon la famille de la ligue)
- **over**: Plus de X buts
- **under**: Moins de X buts
- **confidence**: Niveau de confiance

## 🚀 Démarrage Rapide

### Commande Unique pour Démarrer Tout le Système

**En développement (localhost):**
```bash
python start_system.py
```

Cette commande unique:
- ✅ Démarre l'API Flask sur `http://localhost:5000`
- ✅ Traite automatiquement les données live depuis `live_data_input.json`
- ✅ Génère le rapport dans `live_predictions_report.json`
- ✅ Affiche l'état du système en temps réel

### Tester la santé de l'API (Production)

```bash
curl https://api-fast-qnvg.onrender.com/health
```

**Réponse attendue:**
```json
{
  "status": "healthy",
  "models_loaded": 18,
  "leagues_supported": 18,
  "total_models": 54
}
```

### Tester une prédiction (Production)

```bash
curl -X POST https://api-fast-qnvg.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "I": "734915710",
    "O1": "Barcelone",
    "O2": "Lombardia",
    "L": "FC 26. 5x5 Rush. Superligue",
    "S": 1783516800
  }'
```

### Tester avec Python (Production)

```python
import requests

response = requests.post(
    'https://api-fast-qnvg.onrender.com/predict',
    json={
        'I': '734915710',
        'O1': 'Barcelone',
        'O2': 'Galatasaray',
        'L': 'FC 26. 5x5 Rush. Superligue',
        'S': 1783516200
    }
)

print(response.json())
```

## 📊 Traitement des Données Live

Pour traiter les données live de la plateforme:

1. Sauvegardez le JSON dans `live_data_input.json`
2. Exécutez la commande unique:
   ```bash
   python start_system.py
   ```
3. Le rapport sera sauvegardé dans `live_predictions_report.json`

**Note:** Le script `start_system.py` crée automatiquement un fichier d'exemple si `live_data_input.json` n'existe pas.

## 📊 Liste Complète des Ligues et Modèles

### Modèles par Ligue (18 ligues)

| Ligue | Famille | Modèle Result | Modèle Goals | Modèle Parity |
|-------|--------|---------------|--------------|---------------|
| FC 26. 5x5 Rush. Superligue | RUSH | FC26__5x5_Rush__Superligue_result.pkl | FC26__5x5_Rush__Superligue_goals.pkl | FC26__5x5_Rush__Superligue_parity.pkl |
| FC 24. 4x4. Championnat d'Angleterre | CLASSIC | FC_24__4x4__Championnat_d'Angleterre_result.pkl | FC_24__4x4__Championnat_d'Angleterre_goals.pkl | FC_24__4x4__Championnat_d'Angleterre_parity.pkl |
| FC 26. Champions League | CHAMPIONS | FC_26__Champions_League_result.pkl | FC_26__Champions_League_goals.pkl | FC_26__Champions_League_parity.pkl |
| FC 25. Italy Championship | CLASSIC | FC_25__Italy_Championship_result.pkl | FC_25__Italy_Championship_goals.pkl | FC_25__Italy_Championship_parity.pkl |
| FC 25. 3x3. Ligue de conférence | CLASSIC | FC_25__3x3__Ligue_de_conférence_result.pkl | FC_25__3x3__Ligue_de_conférence_goals.pkl | FC_25__3x3__Ligue_de_conférence_parity.pkl |
| FC 26. Championnat du monde | WORLD | FC_26__Championnat_du_monde_result.pkl | FC_26__Championnat_du_monde_goals.pkl | FC_26__Championnat_du_monde_parity.pkl |
| FC 25. Championnat d'Angleterre | CLASSIC | FC_25__Championnat_d'Angleterre_result.pkl | FC_25__Championnat_d'Angleterre_goals.pkl | FC_25__Championnat_d'Angleterre_parity.pkl |
| FC 25. Championnat d'Allemagne | CLASSIC | FC_25__Championnat_d'Allemagne_result.pkl | FC_25__Championnat_d'Allemagne_goals.pkl | FC_25__Championnat_d'Allemagne_parity.pkl |
| FC 25. Spain Championship | CLASSIC | FC_25__Championnat_d'Espagne_result.pkl | FC_25__Championnat_d'Espagne_goals.pkl | FC_25__Championnat_d'Espagne_parity.pkl |
| FC 26. Spain Championship | CLASSIC | FC_26__Spain_Championship_result.pkl | FC_26__Spain_Championship_goals.pkl | FC_26__Spain_Championship_parity.pkl |
| FC 25. Ligue européenne | CLASSIC | FC_25__Ligue_européenne_result.pkl | FC_25__Ligue_européenne_goals.pkl | FC_25__Ligue_européenne_parity.pkl |
| FC 25. Champions League | CHAMPIONS | FC_25__Champions_League_result.pkl | FC_25__Champions_League_goals.pkl | FC_25__Champions_League_parity.pkl |
| FIFA23 Penalty | PENALTY | FIFA23__Penalty_result.pkl | FIFA23__Penalty_goals.pkl | FIFA23__Penalty_parity.pkl |
| Penalty | PENALTY | Penalty_result.pkl | Penalty_goals.pkl | Penalty_parity.pkl |

## 📦 Fichiers de Modèles

### Structure du répertoire models_by_league/
```
models_by_league/
├── FC26__5x5_Rush__Superligue_result.pkl
├── FC26__5x5_Rush__Superligue_goals.pkl
├── FC26__5x5_Rush__Superligue_parity.pkl
├── FC26__5x5_Rush__Superligue_result_features.pkl
├── FC26__5x5_Rush__Superligue_goals_features.pkl
├── FC26__5x5_Rush__Superligue_parity_features.pkl
├── ... (pour chaque ligue)
└── models_summary.csv
```

### Taille et Type des Modèles

- **Modèles RandomForestClassifier**: ~1-2 Mo chacun
- **Modèles GradientBoostingRegressor**: ~2-3 Mo chacun
- **Fichiers de features**: ~10-20 Ko chacun
- **Total estimé**: ~200-300 Mo pour tous les modèles

## ⚠️ Codes d'Erreur

| Code | Message | Description |
|------|---------|-------------|
| 400 | BAD_REQUEST | Format de requête invalide |
| 404 | LEAGUE_NOT_FOUND | Ligue non trouvée ou non supportée |
| 500 | INTERNAL_ERROR | Erreur interne du serveur |
| 503 | MODEL_NOT_LOADED | Modèle non chargé pour cette ligue |

## 🔧 Configuration Requise pour la Plateforme

### 1. Dépendances Python
```json
{
  "dependencies": [
    "flask>=2.0.0",
    "pandas>=1.5.0",
    "scikit-learn>=1.0.0",
    "joblib>=1.0.0",
    "numpy>=1.0.0"
  ]
}
```

### 2. Variables d'Environnement (Render)
```bash
FLASK_APP=prediction_api_league
PORT=5000
```

### 3. Configuration du Runtime Render
- **Python Version:** 3.9+
- **Buildpack:** Python
- **Workers:** 1 (standard)
- **Timeout:** 60 secondes maximum par requête

## 📚 Documentation Complète

Pour plus de détails sur les formats et les codes, exécutez:

```bash
python integration_spec_platform.py
```

## 🔄 Mise à Jour et Maintenance

### Mise à jour des Modèles
Pour mettre à jour les modèles avec de nouvelles données:
1. Entraîner les modèles avec les nouvelles données
2. Sauvegarder les nouveaux fichiers .pkl dans `models_by_league/`
3. Redémarrer l'API pour charger les nouveaux modèles

### Monitoring
- **Health Check:** `/health` endpoint
- **Logs:** Disponibles via Render Dashboard
- **Métriques:** Temps de réponse, taux d'erreur

## 📞 Support

Pour toute question sur l'intégration, contactez l'équipe technique ou consultez la documentation complète.

---

**Author:** SOLITAIRE HACK  
**Version:** 3.0  
**Date:** 2026-07-08  
**Environnement:** Production (Render)
