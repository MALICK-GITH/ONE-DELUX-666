# Guide simple de sauvegarde des matchs

Ce fichier sert à installer rapidement le système de récupération et de sauvegarde des matchs.

Le point principal est de bien gérer les 3 statuts :

- `a_venir`
- `en_cours`
- `termine`

## 1. Source API utilisée

- `https://livefeedsht-vmp.onrender.com/live-feed`

## 2. Paramètres déjà validés

Toujours utiliser :

```txt
sports=85
count=40
lng=fr
gr=789
mode=4
country=96
partner=233
getEmpty=true
virtualSports=true
noFilterBlockEvent=true
```

## 3. Variables d’environnement à mettre

Créer `.env` :

```env
PORT=3000
LIVE_FEED_URL=https://livefeedsht-vmp.onrender.com/live-feed
PENALTY_API_URL=https://livefeedsht-vmp.onrender.com/live-feed
PREDICTION_API_URL=https://top-modele-train-api-vmp.onrender.com
LIVE_FEED_TIMEOUT_MS=45000
NODE_ENV=production
```

## 4. Lancement

```bash
npm install
node server.js
```

Puis ouvrir :

```txt
http://127.0.0.1:3000
```

## 5. Endpoint à utiliser pour la sauvegarde

### Tous les matchs

```txt
GET /api/matches
```

### Un match précis

```txt
GET /api/matches/:id
```

## 6. Champs importants à sauvegarder

Pour chaque match, sauvegarder au minimum :

- `id`
- `team1`
- `team2`
- `league`
- `startTime`
- `status`
- `statusText`
- `period`
- `score.home`
- `score.away`
- `isUpcoming`
- `isLive`
- `isFinished`

## 7. Signification des statuts

### `a_venir`

Le match n’a pas encore réellement commencé.

Conditions déjà gérées par le projet :

- heure future
- `GNS=true`
- texte `Début dans ...`
- texte `avant ...`

### `en_cours`

Le match est réellement actif.

Conditions déjà gérées :

- heure du match atteinte
- score ou activité réelle
- période live réelle

### `termine`

Le match est terminé.

Conditions déjà gérées :

- fin détectée dans la période
- état de clôture du match

## 8. Règle de sauvegarde recommandée

### Si `status = a_venir`

- créer le match si absent
- mettre à jour les infos de base

### Si `status = en_cours`

- mettre à jour souvent
- mettre à jour score et période

### Si `status = termine`

- marquer le match comme clôturé
- arrêter les mises à jour fréquentes

## 9. Exemple de donnée utile

```json
{
  "id": "730432462",
  "team1": "Club Atlético de Madrid",
  "team2": "Porto",
  "league": "FC 26. 5x5 Rush. Superligue",
  "startTime": "2026-06-19T20:00:00.000Z",
  "status": "en_cours",
  "statusText": "Début dans 3 minutes",
  "period": "Mi-temps",
  "score": {
    "home": 2,
    "away": 1,
    "total": 3
  },
  "isUpcoming": false,
  "isLive": true,
  "isFinished": false
}
```

## 10. Erreurs déjà corrigées

Le projet corrige déjà :

- erreur `406`
- faux live sur match futur
- mauvais cycle `à venir / en cours / terminé`
- mauvaise détection de fin

## 11. Résumé très simple

Ton ami doit seulement :

1. copier le projet
2. créer `.env`
3. lancer `node server.js`
4. utiliser `/api/matches`
5. sauvegarder les matchs selon `status`

Tout le reste est déjà corrigé dans le projet.
