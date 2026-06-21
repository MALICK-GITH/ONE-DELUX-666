# Intégration complète API matchs Live Feed

Ce document sert à intégrer notre flux de matchs dans un système de sauvegarde ou de synchronisation de matchs.

Le but principal ici n’est pas de parler des options de jeu, mais du cycle de vie du match :

- match à venir
- match en cours
- match terminé

## Endpoint principal

- `https://livefeedsht-vmp.onrender.com/live-feed`

Le projet actuel l’utilise déjà comme source principale des matchs.

## Paramètres obligatoires déjà validés

Ces valeurs doivent rester les mêmes pour reproduire le comportement validé du projet :

- `sports=85`
- `count=40`
- `lng=fr`
- `gr=789`
- `mode=4`
- `country=96`
- `partner=233`
- `getEmpty=true`
- `virtualSports=true`
- `noFilterBlockEvent=true`

## Headers obligatoires déjà validés

Le projet envoie déjà ces headers pour éviter les erreurs `406` :

- `authority: livefeedsht-vmp.onrender.com`
- `user-agent: Mozilla/5.0 ... Chrome/139 ...`
- `accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7`
- `accept-language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7`
- `sec-ch-ua: "Chromium";v="139", "Not;A=Brand";v="99"`
- `sec-ch-ua-mobile: ?0`
- `sec-ch-ua-platform: "Windows"`
- `sec-fetch-dest: document`
- `sec-fetch-mode: navigate`
- `sec-fetch-site: cross-site`
- `sec-fetch-user: ?1`
- `upgrade-insecure-requests: 1`
- `referer: https://livefeedsht-vmp.onrender.com/live-feed`
- `origin: https://livefeedsht-vmp.onrender.com`
- `cache-control: max-age=0`
- `accept-encoding: gzip, deflate, br`

## Variables d’environnement prêtes

Créer un fichier `.env` :

```env
PORT=3000
LIVE_FEED_URL=https://livefeedsht-vmp.onrender.com/live-feed
PENALTY_API_URL=https://livefeedsht-vmp.onrender.com/live-feed
PREDICTION_API_URL=https://top-modele-train-api-vmp.onrender.com
LIVE_FEED_TIMEOUT_MS=45000
NODE_ENV=production
```

## Installation rapide

```bash
npm install
node server.js
```

Application locale :

- `http://127.0.0.1:3000`

## Endpoints utiles pour la sauvegarde de matchs

### Liste des matchs

- `GET /api/matches`

Retourne tous les matchs normalisés par notre système.

### Match unique

- `GET /api/matches/:id`

Retourne un match précis déjà normalisé.

## Statuts normalisés du projet

Le projet convertit les données brutes `Live Feed` en 3 statuts stables :

- `a_venir`
- `en_cours`
- `termine`

Ces 3 statuts sont ceux qu’il faut utiliser dans le système de sauvegarde.

## Règles de normalisation déjà corrigées

### `a_venir`

Le match est considéré `a_venir` si :

- `GNS=true`
- le texte contient `Début dans`
- le texte contient `avant`
- l’heure réelle du match est encore dans le futur
- aucun score réel n’a encore démarré

### `en_cours`

Le match est considéré `en_cours` si :

- l’heure du match est déjà passée
- le score a commencé ou le match est réellement actif
- la période indique une phase live réelle

### `termine`

Le match est considéré `termine` si :

- le texte de période indique la fin
- le contexte du match indique que la rencontre est terminée

## Champs utiles pour la sauvegarde

Chaque match retourné par `/api/matches` contient au minimum les champs utiles suivants :

- `id`
- `team1`
- `team2`
- `league`
- `leagueId`
- `sport`
- `sportId`
- `country`
- `startTime`
- `startTimeTimestamp`
- `status`
- `statusText`
- `period`
- `score`
- `isUpcoming`
- `isLive`
- `isFinished`
- `homeLogo`
- `awayLogo`
- `leagueLogo`
- `liveTime`

## Exemple de structure utile

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
  "isFinished": false,
  "liveTime": "2'18"
}
```

## Logique recommandée de sauvegarde

Pour un système ami, il faut sauvegarder surtout :

- `id` comme identifiant unique du match
- `status` comme statut métier principal
- `startTime` pour la chronologie
- `score.home`
- `score.away`
- `period`
- `statusText`

### Recommandation de synchronisation

- si `status = a_venir` : créer ou mettre à jour le match
- si `status = en_cours` : mettre à jour fréquemment
- si `status = termine` : figer le match comme clôturé

## Erreurs déjà corrigées dans ce projet

### Erreur `406 NotAcceptable`

Déjà corrigée grâce :

- aux bons headers
- au bon ordre des paramètres
- aux bonnes valeurs `gr / partner / country`

### Faux live sur des matchs futurs

Déjà corrigé :

- le projet ne fait pas confiance uniquement aux flags bruts
- il vérifie aussi l’heure réelle et le texte `Début dans ...`

### Inversion de statuts ou mauvaise lecture du cycle du match

Déjà corrigé :

- `a_venir`
- `en_cours`
- `termine`

sont déjà normalisés côté backend.

## Fichiers importants à transmettre

- `server.js`
- `server/config.js`
- `services/liveFeedClient.js`
- `public/site-api.js`
- `.env.example`
- `DEPLOYMENT_ENDPOINTS.md`

## Résumé final

Ton ami n’a pas besoin de chercher :

- l’URL API est déjà la bonne
- les paramètres sont déjà validés
- les headers sont déjà les bons
- la logique de statut est déjà corrigée
- les erreurs classiques sont déjà corrigées

Le système est donc prêt pour une intégration orientée sauvegarde des matchs et gestion de leur statut.
