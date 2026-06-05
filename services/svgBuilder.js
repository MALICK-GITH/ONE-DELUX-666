/**
 * SVG Builder Service - Adapté de ONE-DELUX
 * Génère des SVG pour conversion en images sans dépendance native
 * Signé: SOLITAIRE HACK
 */

function escapeXml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateCouponLabel(value, maxLength = 30) {
  const str = String(value || "").trim();
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

function formatOdd(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : "-";
}

function formatTimestamp(timestamp) {
  if (!timestamp || timestamp <= 0) return "";
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

/**
 * Génère un SVG pour un match individuel
 */
function buildMatchImageSvg(data = {}) {
  const {
    league = "Compétition virtuelle",
    homeTeam = "Équipe 1",
    awayTeam = "Équipe 2",
    prediction = "1",
    odds = 1.5,
    confidence = 75,
    startTime = null,
    matchId = "unknown"
  } = data;

  const width = 1200;
  const height = 720;
  const home = escapeXml(truncateCouponLabel(homeTeam, 26));
  const away = escapeXml(truncateCouponLabel(awayTeam, 26));
  const leagueEsc = escapeXml(truncateCouponLabel(league, 44));
  const pari = escapeXml(truncateCouponLabel(prediction, 56));
  const odd = formatOdd(odds);
  const startAt = formatTimestamp(startTime);
  const conf = Number(confidence).toFixed(0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="mBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060a15"/>
      <stop offset="50%" stop-color="#0d1a30"/>
      <stop offset="100%" stop-color="#130b1f"/>
    </linearGradient>
    <radialGradient id="mGlow" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="rgba(0,240,255,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <filter id="mGlowText">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#mBg)"/>
  <rect width="${width}" height="${height}" fill="url(#mGlow)"/>
  
  <rect x="34" y="26" width="${width - 68}" height="${height - 52}" rx="20" fill="rgba(7,12,26,0.88)" stroke="rgba(0,240,255,0.3)" stroke-width="1.4"/>
  
  <text x="66" y="74" fill="#00f0ff" font-size="34" font-weight="900" font-family="Segoe UI, Arial, sans-serif">RUST SIT XPR - MATCH</text>
  <text x="66" y="104" fill="#e8f7ff" font-size="16" font-family="Segoe UI, Arial, sans-serif">${leagueEsc}</text>
  <text x="${width - 66}" y="104" text-anchor="end" fill="#88a4c8" font-size="14" font-family="Segoe UI, Arial, sans-serif">${startAt}</text>
  
  <text x="${width / 2}" y="250" text-anchor="middle" fill="#e8f7ff" font-size="64" font-weight="900" font-family="Segoe UI, Arial, sans-serif" filter="url(#mGlowText)">${home}</text>
  <text x="${width / 2}" y="328" text-anchor="middle" fill="#00f0ff" font-size="34" font-weight="900" font-family="Segoe UI, Arial, sans-serif">VS</text>
  <text x="${width / 2}" y="420" text-anchor="middle" fill="#e8f7ff" font-size="64" font-weight="900" font-family="Segoe UI, Arial, sans-serif" filter="url(#mGlowText)">${away}</text>
  
  <rect x="66" y="486" width="${width - 132}" height="140" rx="14" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>
  
  <text x="88" y="532" fill="#88a4c8" font-size="14" font-weight="700" font-family="Segoe UI, Arial, sans-serif">PRÉDICTION</text>
  <text x="88" y="566" fill="#e8f7ff" font-size="26" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${pari}</text>
  
  <text x="${width - 88}" y="532" text-anchor="end" fill="#88a4c8" font-size="14" font-weight="700" font-family="Segoe UI, Arial, sans-serif">COTE / CONFIANCE</text>
  <text x="${width - 88}" y="566" text-anchor="end" fill="#00ff6a" font-size="26" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${odd} · ${conf}%</text>
  
  <text x="66" y="${height - 16}" fill="#88a4c8" font-size="12" font-family="Segoe UI, Arial, sans-serif">RUST SIT XPR · IA Dashboard · Signé: SOLITAIRE HACK</text>
</svg>`;
}

/**
 * Génère un SVG pour un coupon complet
 */
function buildCouponImageSvg(data = {}) {
  const {
    selections = [],
    totalOdds = 1.0,
    confidence = 0,
    generatedAt = new Date().toISOString()
  } = data;

  const width = 1200;
  const height = 800;
  const count = Math.min(selections.length, 5);
  
  const rows = selections.slice(0, 5).map((sel, i) => {
    const home = escapeXml(truncateCouponLabel(sel.team || sel.homeTeam || "Équipe 1", 20));
    const away = escapeXml(truncateCouponLabel(sel.awayTeam || "Équipe 2", 20));
    const pari = escapeXml(truncateCouponLabel(sel.prediction || sel.pari || "-", 15));
    const odd = formatOdd(sel.odds || sel.cote || 1.5);
    const y = 180 + (i * 80);
    
    return `
    <rect x="66" y="${y}" width="${width - 132}" height="60" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
    <text x="88" y="${y + 35}" fill="#e8f7ff" font-size="14" font-family="Segoe UI, Arial, sans-serif">${home} vs ${away}</text>
    <text x="${width / 2}" y="${y + 35}" text-anchor="middle" fill="#00f0ff" font-size="16" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${pari}</text>
    <text x="${width - 88}" y="${y + 35}" text-anchor="end" fill="#00ff6a" font-size="16" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${odd}</text>`;
  }).join("\n");

  const generatedDate = new Date(generatedAt).toLocaleDateString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="cBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050913"/>
      <stop offset="50%" stop-color="#0d1a30"/>
      <stop offset="100%" stop-color="#130b1f"/>
    </linearGradient>
    <radialGradient id="cGlowA" cx="10%" cy="0%" r="60%">
      <stop offset="0%" stop-color="rgba(0,240,255,0.2)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <radialGradient id="cGlowB" cx="100%" cy="100%" r="60%">
      <stop offset="0%" stop-color="rgba(255,0,170,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#cBg)"/>
  <rect width="${width}" height="${height}" fill="url(#cGlowA)"/>
  <rect width="${width}" height="${height}" fill="url(#cGlowB)"/>
  
  <rect x="34" y="26" width="${width - 68}" height="${height - 52}" rx="20" fill="rgba(7,12,26,0.88)" stroke="rgba(0,240,255,0.3)" stroke-width="1.4"/>
  
  <text x="66" y="74" fill="#00f0ff" font-size="38" font-weight="900" font-family="Segoe UI, Arial, sans-serif">RUST SIT XPR - COUPON</text>
  <text x="66" y="108" fill="#e8f7ff" font-size="16" font-family="Segoe UI, Arial, sans-serif">Profil Équilibré · Sélections ${count} · Cote ${formatOdd(totalOdds)}</text>
  <text x="66" y="136" fill="#88a4c8" font-size="14" font-family="Segoe UI, Arial, sans-serif">Généré ${generatedDate}</text>
  
  <rect x="${width - 220}" y="38" width="180" height="30" rx="8" fill="rgba(0,240,255,0.1)" stroke="rgba(0,240,255,0.4)"/>
  <text x="${width - 130}" y="58" text-anchor="middle" fill="#00f0ff" font-size="12" font-weight="800" font-family="Segoe UI, Arial, sans-serif">IA VALIDÉ</text>
  
  ${rows}
  
  <text x="66" y="${height - 16}" fill="#88a4c8" font-size="12" font-family="Segoe UI, Arial, sans-serif">RUST SIT XPR · Coupon IA Premium · Signé: SOLITAIRE HACK</text>
</svg>`;
}

/**
 * Convertit SVG en image PNG côté client via Canvas
 */
function svgToImage(svgString, format = 'png') {
  return new Promise((resolve, reject) => {
    try {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = format === 'story' ? 1920 : format === 'coupon' ? 800 : 720;
        
        const ctx = canvas.getContext('2d');
        if (format === 'jpg' || format === 'jpeg') {
          ctx.fillStyle = '#050913';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const mimeType = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 'image/png';
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Conversion échouée'));
          }
        }, mimeType, 0.95);
      };
      
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(new Error('Erreur de chargement SVG'));
      };
      
      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  escapeXml,
  truncateCouponLabel,
  formatOdd,
  formatTimestamp,
  buildMatchImageSvg,
  buildCouponImageSvg,
  svgToImage
};