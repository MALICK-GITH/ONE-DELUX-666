# Déploiement du proxy live feed

Ce projet inclut un proxy serverless pour récupérer les matchs `888starz` hors de Render.

## But

Render a des timeouts vers `https://888starz.bet/...`, alors que la source répond depuis d'autres environnements.  
La solution est de déployer `edge/live-feed-proxy.js` sur une plateforme edge/serverless, puis de faire pointer l'app principale vers cette URL proxy.

## Fichiers

- `api/live-feed-proxy.js`
- `edge/live-feed-proxy.js`
- `vercel.json`

## Déploiement conseillé

Déployer ce repo sur Vercel et exposer :

- `/live-feed-proxy`
- `/api/live-feed-proxy`

## Variable optionnelle

- `SOURCE_LIVE_FEED_URL`

Par défaut, le proxy utilise déjà l'URL `888starz` intégrée.

## Intégration dans l'app principale

Une fois l'URL proxy obtenue, définir dans Render :

`LIVE_FEED_URL=https://<ton-proxy>/live-feed-proxy`

L'app principale consommera alors le proxy au lieu d'appeler `888starz` directement.
