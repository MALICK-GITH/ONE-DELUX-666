"use strict";

/**
 * Service de gestion des coupons - Logique fondamentale adaptée de ONE-DELUX
 * Signé: SOLITAIRE HACK
 */

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function extractCouponSize(text, defaultValue = 3) {
  const match = text.match(/size\s*=\s*(\d+)/i);
  return match ? Math.max(1, Number(match[1])) : defaultValue;
}

function extractCouponLeague(text, defaultValue = "all") {
  const match = text.match(/league\s*=\s*([a-zA-Z0-9_]+)/i);
  return match ? match[1] : defaultValue;
}

function extractCouponRisk(text, defaultValue = "balanced") {
  const match = text.match(/risk\s*=\s*([a-zA-Z]+)/i);
  const validRisks = ["conservative", "balanced", "aggressive"];
  const risk = match ? match[1].toLowerCase() : defaultValue;
  return validRisks.includes(risk) ? risk : defaultValue;
}

function extractCouponStake(text, defaultValue = 1000) {
  const match = text.match(/stake\s*=\s*(\d+)/i);
  return match ? Math.max(100, Number(match[1])) : defaultValue;
}

function buildTelegramLadderText({ items = [], totalStake = 1000 }) {
  const lines = [
    "📊 LADDER DE TICKETS",
    `Mise totale: ${totalStake}`,
    ""
  ];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.label || "TICKET"} | Mise: ${item.stake || 0}`);
    if (Array.isArray(item.coupon)) {
      item.coupon.forEach((match, i) => {
        lines.push(
          `   ${i + 1}) ${match.teamHome} vs ${match.teamAway} | ${match.pari} | ${match.cote.toFixed(2)}`
        );
      });
    }
    if (item.summary) {
      lines.push(
        `   ⚡ Cote combinée: ${item.summary.combinedOdd || "N/A"} | Sélections: ${item.summary.totalSelections || 0}`
      );
    }
    lines.push("");
  });

  return lines.join("\n");
}

function buildTelegramCouponText(couponData) {
  const coupon = Array.isArray(couponData?.coupon) ? couponData.coupon : [];
  const lines = [
    "🎫 COUPON GÉNÉRÉ",
    `Taille: ${coupon.length} sélection(s)`,
    ""
  ];

  coupon.forEach((selection, index) => {
    lines.push(
      `${index + 1}) ${selection.teamHome || "Équipe 1"} vs ${selection.teamAway || "Équipe 2"}`
    );
    lines.push(
      `   Pari: ${selection.pari || "1"} | Cote: ${selection.cote ? selection.cote.toFixed(2) : "N/A"}`
    );
    if (selection.confidence) {
      lines.push(`   Confiance: ${selection.confidence.toFixed(1)}%`);
    }
    lines.push("");
  });

  if (couponData.summary) {
    lines.push("📈 RÉSUMÉ");
    if (couponData.summary.combinedOdd) {
      lines.push(`Cote combinée: ${couponData.summary.combinedOdd.toFixed(3)}`);
    }
    if (couponData.summary.expectedReturn) {
      lines.push(`Gain potentiel: ${couponData.summary.expectedReturn.toFixed(2)}`);
    }
  }

  return lines.join("\n");
}

function buildTelegramMultiText(strategies = [], size = 3, league = "all", risk = "balanced") {
  const lines = [
    "🎯 COUPON MULTI",
    `Taille: ${size} | Ligue: ${league} | Risque: ${risk}`,
    ""
  ];

  strategies.forEach((strategy, index) => {
    const matches = Array.isArray(strategy?.matches) ? strategy.matches : [];
    lines.push(
      `${index + 1}. ${strategy?.name || strategy?.risk || "Stratégie"} | ${matches.length} match(s)`
    );
    matches.forEach((m, i) => {
      lines.push(
        `   ${i + 1}) ${m?.homeTeam || "Équipe 1"} vs ${m?.awayTeam || "Équipe 2"} | ` +
        `${m?.prediction?.recommendation || "1"} | ${Number(m?.prediction?.confidence || 0).toFixed(1)}%`
      );
    });
    lines.push("");
  });

  return lines.join("\n");
}

function buildTelegramValidationText(validation) {
  const summary = validation?.summary || {};
  const issues = Array.isArray(validation?.issues) ? validation.issues : [];
  const lines = [
    "✅ VALIDATION TICKET | Lecture technique",
    `Statut: ${validation?.status || "N/A"}`,
    `OK: ${summary.ok ?? 0} | A corriger: ${summary.toFix ?? 0} | Total: ${summary.total ?? 0}`,
    "La validation garde un ton simple, clair et exploitable avant publication.",
    ""
  ];

  issues.forEach((issue, index) => {
    lines.push(`${index + 1}. ${issue?.message || issue?.code || "Alerte"}`);
  });

  return lines.join("\n");
}

function calculateCombinedOdd(matches) {
  if (!Array.isArray(matches) || !matches.length) return null;
  return Number(
    matches.reduce((acc, m) => acc * (Number(m?.odds || m?.odd || m?.cote || 1.5) || 1.5), 1).toFixed(3)
  );
}

function formatCouponItem(item) {
  return {
    label: item?.name || "TICKET",
    profile: item?.name || "TICKET",
    stake: item?.stake || 0,
    coupon: Array.isArray(item?.matches)
      ? item.matches.map((m) => ({
          teamHome: m?.homeTeam || m?.teamHome || "Équipe 1",
          teamAway: m?.awayTeam || m?.teamAway || "Équipe 2",
          pari: m?.prediction?.recommendation || m?.pari || "1",
          cote: Number(m?.odds || m?.odd || m?.cote || 1.5) || 1.5,
        }))
      : [],
    summary: {
      combinedOdd: calculateCombinedOdd(item?.matches),
      totalSelections: Array.isArray(item?.matches) ? item.matches.length : 0,
    },
  };
}

function extractTelegramParams(text, session = null) {
  const normalized = normalizeText(text);
  
  return {
    size: extractCouponSize(text, session?.preferences?.size || 3),
    league: extractCouponLeague(text, session?.preferences?.league || "all"),
    risk: extractCouponRisk(text, session?.preferences?.risk || "balanced"),
    stake: extractCouponStake(text, session?.preferences?.stake || 1000),
    wantsLadder: normalized.includes("ladder"),
    wantsMulti: normalized.includes("multi"),
    wantsValidate: normalized.includes("valide") || normalized.includes("validate"),
    wantsImage: normalized.includes("image"),
    wantsPdf: normalized.includes("pdf"),
  };
}

module.exports = {
  normalizeText,
  extractCouponSize,
  extractCouponLeague,
  extractCouponRisk,
  extractCouponStake,
  buildTelegramLadderText,
  buildTelegramCouponText,
  buildTelegramMultiText,
  buildTelegramValidationText,
  calculateCombinedOdd,
  formatCouponItem,
  extractTelegramParams,
};
