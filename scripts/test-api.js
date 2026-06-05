#!/usr/bin/env node
"use strict";

/**
 * Script de test pour examiner l'API live avec la configuration du projet.
 * Signé: SOLITAIRE HACK
 */

const config = require("../server/config");
const { fetchLiveFeedJson } = require("../services/liveFeedClient");

async function main() {
  const url = new URL(config.liveFeedUrl);
  url.searchParams.set("count", "5");

  const json = await fetchLiveFeedJson({
    url: url.toString(),
    allowDisabled: true,
  });

  if (json.Value && Array.isArray(json.Value)) {
    console.log("=== STRUCTURE DE L'API ===");
    console.log(`Nombre de matchs: ${json.Value.length}`);

    json.Value.slice(0, 3).forEach((event, index) => {
      console.log(`\n--- Match ${index + 1} ---`);
      console.log(`ID: ${event.I}`);
      console.log(`Equipe 1: ${event.O1}`);
      console.log(`Equipe 2: ${event.O2}`);
      console.log(`Ligue: ${event.L || event.LE}`);
      console.log(`Sport: ${event.SN}`);
      console.log(`Pays: ${event.CN || event.CE}`);
      console.log(`Debut: ${event.S}`);
      console.log(`\n--- Statut (SC) ---`);
      console.log(`SC complet:`, JSON.stringify(event.SC, null, 2));
      console.log(`SC.SLS: ${event.SC?.SLS}`);
      console.log(`SC.I: ${event.SC?.I}`);
      console.log(`\n--- Periode ---`);
      console.log(`TN: ${event.TN}`);
      console.log(`TNS: ${event.TNS}`);
    });

    const allStatuses = new Set();
    json.Value.forEach((event) => {
      if (event.SC?.SLS) allStatuses.add(event.SC.SLS);
      if (event.SC?.I) allStatuses.add(String(event.SC.I));
    });

    console.log(`\n=== TOUS LES STATUTS UNIQUES ===`);
    console.log(Array.from(allStatuses));

    const allPeriods = new Set();
    json.Value.forEach((event) => {
      if (event.TN) allPeriods.add(event.TN);
      if (event.TNS) allPeriods.add(event.TNS);
    });

    console.log(`\n=== TOUTES LES PERIODES UNIQUES ===`);
    console.log(Array.from(allPeriods));
    return;
  }

  console.log("Structure inattendue de l'API");
  console.log(JSON.stringify(json, null, 2));
}

main().catch((error) => {
  console.error("Erreur de requete:", error);
  process.exitCode = 1;
});
