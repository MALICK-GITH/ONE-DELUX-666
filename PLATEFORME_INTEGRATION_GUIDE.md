# GUIDE D'INTÉGRATION POUR PLATEFORME
## FIFA Prediction API - FURY X ONE

---

## 📋 Vue d'ensemble

L'API FIFA Prediction fournit des prédictions de matchs FIFA en utilisant des modèles d'apprentissage automatique entraînés sur **36 019 matchs** historiques. L'API est conçue pour être intégrée directement avec les plateformes de paris.

### Caractéristiques principales
- **18 ligues EA SPORTS FC** supportées selon le mapping officiel FURY X ONE
- **54 modèles ML** entraînés (3 modèles par ligue)
- **Prédictions en temps réel** pour victoires, buts totaux et parité
- **Format JSON normalisé** compatible avec les plateformes de paris
- **API RESTful** simple à intégrer

---

## 🔗 Configuration

### URL de Production
```
https://api-fast-82wa.onrender.com
```

### Environnement
- **Protocole:** HTTPS
- **Format:** JSON
- **Méthode:** POST pour les prédictions
- **Authentification:** Aucune (endpoint public)
- **Statut:** Actif et opérationnel

### Déploiement
- **Plateforme:** Render (onrender.com)
- **Runtime:** Python 3.12.0
- **Statut:** Actif et opérationnel

---

## 🎯 Endpoints Disponibles

### 1. Health Check
**Endpoint:** `GET /health`

**Description:** Vérifie que l'API est opérationnelle

**Exemple:**
```bash
curl https://api-fast-82wa.onrender.com/health
```

**Réponse:**
```json
{
  "status": "healthy",
  "models_loaded": 18,
  "leagues": 18
}
```

### 2. Ligues Disponibles
**Endpoint:** `GET /leagues`

**Description:** Liste toutes les ligues supportées

**Exemple:**
```bash
curl https://api-fast-82wa.onrender.com/leagues
```

**Réponse:**
```json
{
  "success": true,
  "total": 18,
  "leagues": [
    "FC 26. 5x5 Rush. Superligue",
    "FC 25. Champions League",
    "FC 24. 4x4. Championnat d'Angleterre",
    "FC 25. 3x3. Ligue de conférence",
    "FC 26. Champions League",
    "FC 25. Championnat d'Angleterre",
    "FC 26. Championnat du monde",
    "FC 25. Championnat d'Espagne",
    "FC25. Penalty",
    "FC 25. Ligue européenne",
    "FC24. Penalty",
    "Penalty",
    "FC 25. Italy Championship",
    "FC 25. Championnat d'Allemagne",
    "FIFA23. Penalty",
    "FC26. Penalty",
    "World Cup 2026. Simulation",
    "FC 26. Spain Championship"
  ]
}
```

### 3. Prédiction (Single Match)
**Endpoint:** `POST /predict`

**Description:** Obtient une prédiction pour un match

**Format d'entrée:**
```json
{
  "I": "match_id_unique",
  "O1": "Équipe Domicile",
  "O2": "Équipe Extérieur",
  "L": "Nom de la Ligue",
  "S": 1783516200,
  "SC": null,
  "E": [
    {"T": 1, "C": 1.096, "P": null, "B": "bookmaker", "G": 1},
    {"T": 2, "C": 6.14, "P": null, "B": "bookmaker", "G": 1},
    {"T": 3, "C": 30, "P": null, "B": "bookmaker", "G": 1}
  ],
  "AE": [
    {
      "G": 2,
      "ME": [
        {"T": 7, "C": 1.95, "P": -1.0, "B": "bookmaker"},
        {"T": 8, "C": 1.95, "P": 1.0, "B": "bookmaker"}
      ]
    }
  ]
}
```

**Champs:**
- `I`: Identifiant unique du match (string)
- `O1`: Nom de l'équipe domicile (string)
- `O2`: Nom de l'équipe extérieur (string)
- `L`: Nom de la ligue (string, doit être dans la liste des ligues supportées)
- `S`: Timestamp du match (integer)
- `SC`: Score actuel (optionnel, null si match non commencé)
- `E`: Array des cotes principales (optionnel)
- `AE`: Array des cotes additionnelles (optionnel)

**Exemple cURL:**
```bash
curl -X POST https://api-fast-82wa.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "I": "match_001",
    "O1": "Barcelone",
    "O2": "Galatasaray",
    "L": "FC 26. 5x5 Rush. Superligue",
    "S": 1783516200,
    "SC": null,
    "E": [
      {"T": 1, "C": 1.096, "P": null, "B": "888starz", "G": 1},
      {"T": 2, "C": 6.14, "P": null, "B": "888starz", "G": 1},
      {"T": 3, "C": 30, "P": null, "B": "888starz", "G": 1}
    ],
    "AE": [
      {
        "G": 2,
        "ME": [
          {"T": 7, "C": 1.95, "P": -1.0, "B": "888starz"},
          {"T": 8, "C": 1.95, "P": 1.0, "B": "888starz"}
        ]
      }
    ]
  }'
```

**Réponse:**
```json
{
  "success": true,
  "match_id": "match_001",
  "team_home": "Barcelone",
  "team_away": "Galatasaray",
  "league": "FC 26. 5x5 Rush. Superligue",
  "predictions": {
    "match_result": {
      "prediction": "home",
      "confidence": 0.65,
      "probabilities": {
        "home": 0.65,
        "draw": 0.20,
        "away": 0.15
      }
    },
    "total_goals": {
      "predicted": 5.2,
      "over_2_5": true,
      "over_3_5": true
    },
    "total_parity": {
      "prediction": "odd",
      "confidence": 0.52
    }
  }
}
```

### 4. Prédiction Batch
**Endpoint:** `POST /predict/batch`

**Description:** Obtient des prédictions pour plusieurs matchs

**Format d'entrée:**
```json
{
  "matches": [
    {
      "I": "match_001",
      "O1": "Barcelone",
      "O2": "Galatasaray",
      "L": "FC 26. 5x5 Rush. Superligue",
      "S": 1783516200,
      "SC": null,
      "E": [],
      "AE": []
    },
    {
      "I": "match_002",
      "O1": "Arsenal",
      "O2": "Lille OSC",
      "L": "FC 25. Champions League",
      "S": 1783516200,
      "SC": null,
      "E": [],
      "AE": []
    }
  ]
}
```

**Exemple cURL:**
```bash
curl -X POST https://api-fast-82wa.onrender.com/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "matches": [
      {
        "I": "match_001",
        "O1": "Barcelone",
        "O2": "Galatasaray",
        "L": "FC 26. 5x5 Rush. Superligue",
        "S": 1783516200,
        "SC": null,
        "E": [],
        "AE": []
      }
    ]
  }'
```

**Réponse:**
```json
{
  "success": true,
  "total": 1,
  "predictions": [
    {
      "success": true,
      "match_id": "match_001",
      "team_home": "Barcelone",
      "team_away": "Galatasaray",
      "league": "FC 26. 5x5 Rush. Superligue",
      "predictions": {
        "match_result": {
          "prediction": "home",
          "confidence": 0.65,
          "probabilities": {
            "home": 0.65,
            "draw": 0.20,
            "away": 0.15
          }
        },
        "total_goals": {
          "predicted": 5.2,
          "over_2_5": true,
          "over_3_5": true
        },
        "total_parity": {
          "prediction": "odd",
          "confidence": 0.52
        }
      }
    }
  ]
}
```

---

## 🏆 Ligues Supportées (Mapping FURY X ONE)

### 🟢 PENALTY
- Penalty
- FIFA23. Penalty
- FC24. Penalty
- FC25. Penalty
- FC26. Penalty

### 🔴 HIGHSCORE
- FC 24. 4x4. Championnat d'Angleterre
- FC 25. 3x3. Ligue de conférence

### 🟣 RUSH
- FC 26. 5x5 Rush. Superligue

### 🔵 CLASSIC
- FC 25. Championnat d'Allemagne
- FC 25. Championnat d'Angleterre
- FC 25. Championnat d'Espagne
- FC 25. Italy Championship
- FC 25. Ligue européenne
- FC 25. Champions League
- FC 26. Champions League
- FC 26. Championnat du monde
- FC 26. Spain Championship
- World Cup 2026. Simulation

---

## 📊 Types de Prédictions

### 1. Match Result (Résultat du match)
- **home**: Victoire domicile
- **draw**: Match nul
- **away**: Victoire extérieur
- **confidence**: Niveau de confiance (0-1)
- **probabilities**: Probabilités pour chaque résultat

### 2. Total Goals (Buts totaux)
- **predicted**: Nombre de buts prédits
- **over_2_5**: Prédiction over/under 2.5 buts
- **over_3_5**: Prédiction over/under 3.5 buts

### 3. Total Parity (Parité des buts)
- **odd**: Nombre impair de buts
- **even**: Nombre pair de buts
- **confidence**: Niveau de confiance (0-1)

---

## ⚠️ Codes d'Erreur

| Code | Message | Description |
|------|---------|-------------|
| 200 | Success | Requête réussie |
| 400 | Bad Request | Format de requête invalide |
| 404 | Not Found | Endpoint ou ligue non trouvé |
| 500 | Internal Server Error | Erreur serveur interne |

**Exemple d'erreur:**
```json
{
  "success": false,
  "error": "League not found",
  "message": "La ligue 'Unknown League' n'est pas supportée"
}
```

---

## 🔧 Intégration Technique

### Exemple en JavaScript
```javascript
async function getPrediction(matchData) {
  const response = await fetch('https://api-fast-82wa.onrender.com/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(matchData)
  });
  
  const result = await response.json();
  return result;
}

// Utilisation
const matchData = {
  I: "match_001",
  O1: "Barcelone",
  O2: "Galatasaray",
  L: "FC 26. 5x5 Rush. Superligue",
  S: 1783516200,
  SC: null,
  E: [],
  AE: []
};

const prediction = await getPrediction(matchData);
console.log(prediction);
```

### Exemple en Python
```python
import requests

def get_prediction(match_data):
    url = "https://api-fast-82wa.onrender.com/predict"
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=match_data, headers=headers)
    return response.json()

# Utilisation
match_data = {
    "I": "match_001",
    "O1": "Barcelone",
    "O2": "Galatasaray",
    "L": "FC 26. 5x5 Rush. Superligue",
    "S": 1783516200,
    "SC": None,
    "E": [],
    "AE": []
}

prediction = get_prediction(match_data)
print(prediction)
```

### Exemple en PHP
```php
<?php
function getPrediction($matchData) {
    $url = "https://api-fast-82wa.onrender.com/predict";
    $ch = curl_init($url);
    
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($matchData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Utilisation
$matchData = array(
    "I" => "match_001",
    "O1" => "Barcelone",
    "O2" => "Galatasaray",
    "L" => "FC 26. 5x5 Rush. Superligue",
    "S" => 1783516200,
    "SC" => null,
    "E" => array(),
    "AE" => array()
);

$prediction = getPrediction($matchData);
print_r($prediction);
?>
```

---

## 🚀 Bonnes Pratiques

### 1. Gestion des Erreurs
Toujours vérifier le champ `success` dans la réponse avant d'utiliser les prédictions.

### 2. Validation des Ligues
Vérifier que la ligue est supportée en utilisant l'endpoint `/leagues` avant d'envoyer une requête.

### 3. Cache des Réponses
Les prédictions peuvent être mises en cache pour réduire la charge sur l'API.

### 4. Timeout
Définir un timeout raisonnable (ex: 10 secondes) pour les requêtes API.

### 5. Rate Limiting
Éviter d'envoyer trop de requêtes simultanées. Utiliser l'endpoint batch pour plusieurs matchs.

---

## 📞 Support

Pour toute question ou problème d'intégration:
- **Documentation:** INTEGRATION API.MD
- **API Health Check:** https://api-fast-82wa.onrender.com/health
- **Ligues disponibles:** https://api-fast-82wa.onrender.com/leagues

---

## 📝 Changelog

### Version 1.0 (2026-07-09)
- Initial release avec 18 ligues FURY X ONE
- 54 modèles ML entraînés sur 36 019 matchs
- Support des prédictions: victoires, buts totaux, parité
- Endpoints: /health, /leagues, /predict, /predict/batch

---

**SIGNÉ:** SOLITAIRE HACK
**VERSION:** 1.0
**DATE:** 2026-07-09
