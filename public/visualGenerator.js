/**
 * Visual Generator Client
 * Generates SVG -> image locally and builds a lightweight PDF export.
 * The goal is to work even when server image routes are missing.
 */

class VisualGeneratorClient {
  constructor() {
    this.defaultBg = "#050913";
  }

  normalizeText(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  escapeXml(value = "") {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  truncate(value = "", max = 40) {
    const text = String(value || "").trim();
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3))}...`;
  }

  formatOdd(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  }

  formatConfidence(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `${Math.max(0, Math.min(100, n)).toFixed(0)}%` : "0%";
  }

  buildPredictionSvg(data = {}) {
    const league = this.escapeXml(this.truncate(data.league || "Competition virtuelle", 42));
    const homeTeam = this.escapeXml(this.truncate(data.homeTeam || data.teamHome || "Equipe 1", 24));
    const awayTeam = this.escapeXml(this.truncate(data.awayTeam || data.teamAway || "Equipe 2", 24));
    const prediction = this.escapeXml(this.truncate(data.prediction || "Analyse en cours", 40));
    const odd = this.escapeXml(this.formatOdd(data.odds || data.odd || 0));
    const confidence = this.escapeXml(this.formatConfidence(data.confidence || 0));
    const startTime = data.startTime ? new Date(data.startTime).toLocaleString("fr-FR") : "N/A";
    const generatedAt = new Date(data.generatedAt || Date.now()).toLocaleString("fr-FR");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050913"/>
      <stop offset="50%" stop-color="#0d1a30"/>
      <stop offset="100%" stop-color="#130b1f"/>
    </linearGradient>
    <radialGradient id="glowA" cx="25%" cy="15%" r="60%">
      <stop offset="0%" stop-color="rgba(0,240,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <radialGradient id="glowB" cx="80%" cy="85%" r="60%">
      <stop offset="0%" stop-color="rgba(66,245,108,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect width="1200" height="800" fill="url(#glowA)"/>
  <rect width="1200" height="800" fill="url(#glowB)"/>
  <rect x="36" y="28" width="1128" height="744" rx="24" fill="rgba(7,12,26,0.88)" stroke="rgba(0,240,255,0.28)" stroke-width="1.5"/>

  <text x="70" y="82" fill="#00f0ff" font-size="34" font-weight="900" font-family="Segoe UI, Arial, sans-serif">RUST SIT XPR - MATCH</text>
  <text x="70" y="110" fill="#e8f7ff" font-size="16" font-family="Segoe UI, Arial, sans-serif">${league}</text>
  <text x="1130" y="110" text-anchor="end" fill="#88a4c8" font-size="13" font-family="Segoe UI, Arial, sans-serif">${this.escapeXml(generatedAt)}</text>

  <rect x="70" y="150" width="1060" height="190" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
  <text x="600" y="230" text-anchor="middle" fill="#f5fbff" font-size="58" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${homeTeam}</text>
  <text x="600" y="292" text-anchor="middle" fill="#00f0ff" font-size="28" font-weight="900" font-family="Segoe UI, Arial, sans-serif">VS</text>
  <text x="600" y="336" text-anchor="middle" fill="#f5fbff" font-size="58" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${awayTeam}</text>

  <rect x="70" y="380" width="520" height="170" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
  <text x="96" y="415" fill="#88a4c8" font-size="14" font-weight="700" font-family="Segoe UI, Arial, sans-serif">PREDICTION</text>
  <text x="96" y="456" fill="#f5fbff" font-size="28" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${prediction}</text>
  <text x="96" y="503" fill="#88a4c8" font-size="14" font-family="Segoe UI, Arial, sans-serif">Start: ${this.escapeXml(startTime)}</text>

  <rect x="610" y="380" width="520" height="170" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
  <text x="636" y="415" fill="#88a4c8" font-size="14" font-weight="700" font-family="Segoe UI, Arial, sans-serif">ODD / CONFIDENCE</text>
  <text x="636" y="456" fill="#00ff88" font-size="30" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${odd} - ${confidence}</text>
  <text x="636" y="503" fill="#88a4c8" font-size="14" font-family="Segoe UI, Arial, sans-serif">Generated: ${this.escapeXml(generatedAt)}</text>

  <rect x="70" y="585" width="1060" height="110" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(0,240,255,0.18)"/>
  <text x="96" y="625" fill="#e8f7ff" font-size="18" font-weight="700" font-family="Segoe UI, Arial, sans-serif">Single match export ready</text>
  <text x="96" y="658" fill="#88a4c8" font-size="13" font-family="Segoe UI, Arial, sans-serif">This export works without server SVG routes. Image is generated in the browser.</text>
  <text x="1130" y="660" text-anchor="end" fill="#00f0ff" font-size="13" font-family="Segoe UI, Arial, sans-serif">SOLITAIRE HACK</text>
</svg>`;
  }

  buildCouponSvg(data = {}) {
    const selections = Array.isArray(data.selections) ? data.selections.slice(0, 6) : [];
    const totalOdds = this.escapeXml(this.formatOdd(data.totalOdds || 0));
    const confidence = this.escapeXml(this.formatConfidence(data.confidence || 0));
    const generatedAt = new Date(data.generatedAt || Date.now()).toLocaleString("fr-FR");

    const rows = selections.map((selection, index) => {
      const team = this.escapeXml(this.truncate(selection.team || selection.homeTeam || "Equipe 1", 28));
      const awayTeam = this.escapeXml(this.truncate(selection.awayTeam || "Equipe 2", 28));
      const prediction = this.escapeXml(this.truncate(selection.prediction || selection.pari || "-", 18));
      const odd = this.escapeXml(this.formatOdd(selection.odds || selection.odd || selection.cote || 0));
      const y = 200 + index * 78;

      return `
        <rect x="70" y="${y}" width="1060" height="58" rx="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)"/>
        <text x="96" y="${y + 35}" fill="#f5fbff" font-size="16" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${team} vs ${awayTeam}</text>
        <text x="650" y="${y + 35}" fill="#00f0ff" font-size="15" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${prediction}</text>
        <text x="1110" y="${y + 35}" text-anchor="end" fill="#00ff88" font-size="16" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${odd}</text>
      `;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050913"/>
      <stop offset="50%" stop-color="#0d1a30"/>
      <stop offset="100%" stop-color="#130b1f"/>
    </linearGradient>
    <radialGradient id="glowA" cx="25%" cy="15%" r="60%">
      <stop offset="0%" stop-color="rgba(0,240,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect width="1200" height="800" fill="url(#glowA)"/>
  <rect x="36" y="28" width="1128" height="744" rx="24" fill="rgba(7,12,26,0.88)" stroke="rgba(0,240,255,0.28)" stroke-width="1.5"/>

  <text x="70" y="82" fill="#00f0ff" font-size="34" font-weight="900" font-family="Segoe UI, Arial, sans-serif">RUST SIT XPR - COUPON</text>
  <text x="70" y="110" fill="#e8f7ff" font-size="16" font-family="Segoe UI, Arial, sans-serif">Generated ${this.escapeXml(generatedAt)}</text>

  <rect x="870" y="48" width="220" height="40" rx="10" fill="rgba(0,240,255,0.12)" stroke="rgba(0,240,255,0.35)"/>
  <text x="980" y="74" text-anchor="middle" fill="#00f0ff" font-size="14" font-weight="800" font-family="Segoe UI, Arial, sans-serif">TOTAL ODDS ${totalOdds}</text>

  <text x="70" y="164" fill="#88a4c8" font-size="14" font-weight="700" font-family="Segoe UI, Arial, sans-serif">SELECTIONS</text>
  ${rows || '<text x="70" y="220" fill="#88a4c8" font-size="16" font-family="Segoe UI, Arial, sans-serif">No selections available</text>'}

  <rect x="70" y="620" width="1060" height="112" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(0,240,255,0.18)"/>
  <text x="96" y="662" fill="#e8f7ff" font-size="18" font-weight="700" font-family="Segoe UI, Arial, sans-serif">Global confidence</text>
  <text x="96" y="700" fill="#00ff88" font-size="30" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${confidence}</text>
  <text x="1110" y="698" text-anchor="end" fill="#00f0ff" font-size="13" font-family="Segoe UI, Arial, sans-serif">SOLITAIRE HACK</text>
</svg>`;
  }

  async svgToImageBlob(svgString, format = "png", quality = 0.96) {
    const safeFormat = String(format || "png").toLowerCase();
    const mimeType = safeFormat === "jpg" || safeFormat === "jpeg"
      ? "image/jpeg"
      : safeFormat === "webp"
        ? "image/webp"
        : "image/png";
    const safeQuality = Number.isFinite(Number(quality)) ? Math.max(0.1, Math.min(1, Number(quality))) : 0.96;

    return new Promise((resolve, reject) => {
      try {
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 1200;
          canvas.height = 800;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error("Canvas unavailable"));
            return;
          }

          if (mimeType === "image/jpeg") {
            ctx.fillStyle = this.defaultBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (blob) resolve(blob);
              else reject(new Error("Image conversion failed"));
            },
            mimeType,
            safeQuality
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("SVG load failed"));
        };

        img.src = url;
      } catch (error) {
        reject(error);
      }
    });
  }

  escapePdfText(value = "") {
    return this.normalizeText(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E]/g, " ");
  }

  buildPdfBlob({ title, lines = [] }) {
    const safeLines = [this.escapePdfText(title), ...lines.map((line) => this.escapePdfText(line))].slice(0, 26);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 48;
    const fontSize = 12;
    const lineHeight = 17;

    const textCommands = [];
    let y = pageHeight - margin;
    textCommands.push("BT");
    textCommands.push("/F1 22 Tf");
    textCommands.push(`1 0 0 1 ${margin} ${y} Tm`);
    textCommands.push(`(${safeLines[0] || ""}) Tj`);
    textCommands.push("ET");

    y -= 34;
    textCommands.push("BT");
    textCommands.push(`/F1 ${fontSize} Tf`);
    for (let i = 1; i < safeLines.length; i += 1) {
      const line = safeLines[i];
      if (!line) continue;
      if (y < margin + 20) break;
      textCommands.push(`1 0 0 1 ${margin} ${y} Tm`);
      textCommands.push(`(${line}) Tj`);
      y -= lineHeight;
    }
    textCommands.push("ET");

    const content = textCommands.join("\n");
    const objects = [];
    const addObject = (body) => {
      const index = objects.length + 1;
      objects.push(`${index} 0 obj\n${body}\nendobj\n`);
      return index;
    };

    const catalogRef = addObject("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesRef = addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    const pageRef = addObject(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`
    );
    const fontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const contentRef = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    const allObjects = [
      `1 0 obj\n<< /Type /Catalog /Pages ${pagesRef} 0 R >>\nendobj\n`,
      `2 0 obj\n<< /Type /Pages /Kids [${pageRef} 0 R] /Count 1 >>\nendobj\n`,
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRef} 0 R >> >> /Contents ${contentRef} 0 R >>\nendobj\n`,
      `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
      `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (const obj of allObjects) {
      offsets.push(pdf.length);
      pdf += obj;
    }
    const xrefPos = pdf.length;
    pdf += `xref\n0 ${allObjects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= allObjects.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${allObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  }

  buildPredictionPdfData(data = {}) {
    return {
      title: "RUST SIT XPR - Match Export",
      lines: [
        `League: ${data.league || "Competition virtuelle"}`,
        `Match: ${data.homeTeam || data.teamHome || "Equipe 1"} vs ${data.awayTeam || data.teamAway || "Equipe 2"}`,
        `Prediction: ${data.prediction || "N/A"}`,
        `Odd: ${this.formatOdd(data.odds || data.odd || 0)}`,
        `Confidence: ${this.formatConfidence(data.confidence || 0)}`,
        `Start: ${data.startTime ? new Date(data.startTime).toLocaleString("fr-FR") : "N/A"}`,
        `Generated at: ${new Date(data.generatedAt || Date.now()).toLocaleString("fr-FR")}`,
        `Signature: SOLITAIRE HACK`,
      ],
    };
  }

  buildCouponPdfData(data = {}) {
    const selections = Array.isArray(data.selections) ? data.selections : [];
    const selectionLines = selections.slice(0, 8).flatMap((selection, index) => [
      `#${index + 1} ${selection.team || selection.homeTeam || "Equipe 1"} vs ${selection.awayTeam || "Equipe 2"}`,
      `   Selection: ${selection.prediction || selection.pari || "N/A"} | Odd: ${this.formatOdd(selection.odds || selection.odd || selection.cote || 0)}`,
    ]);

    return {
      title: "RUST SIT XPR - Coupon Export",
      lines: [
        `Selections: ${selections.length}`,
        `Total odds: ${this.formatOdd(data.totalOdds || 0)}`,
        `Confidence: ${this.formatConfidence(data.confidence || 0)}`,
        ...selectionLines,
        `Generated at: ${new Date(data.generatedAt || Date.now()).toLocaleString("fr-FR")}`,
        `Signature: SOLITAIRE HACK`,
      ],
    };
  }

  async generatePredictionImage(data, options = {}) {
    const format = options.exportFormat || options.format || "png";
    const quality = options.quality ?? 0.96;
    const svgText = this.buildPredictionSvg(data);
    const imageBlob = await this.svgToImageBlob(svgText, format, quality);
    const fileExtension = String(format || "png").toLowerCase() === "jpg" ? "jpeg" : String(format || "png").toLowerCase();
    const pdfBlob = this.buildPdfBlob(this.buildPredictionPdfData(data));

    return {
      success: true,
      imageUrl: URL.createObjectURL(imageBlob),
      blob: imageBlob,
      pdfBlob,
      svg: svgText,
      mimeType: format === "jpg" || format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
          ? "image/webp"
          : "image/png",
      fileExtension,
    };
  }

  async generateCouponImage(data, options = {}) {
    const format = options.exportFormat || options.format || "png";
    const quality = options.quality ?? 0.96;
    const svgText = this.buildCouponSvg(data);
    const imageBlob = await this.svgToImageBlob(svgText, format, quality);
    const fileExtension = String(format || "png").toLowerCase() === "jpg" ? "jpeg" : String(format || "png").toLowerCase();
    const pdfBlob = this.buildPdfBlob(this.buildCouponPdfData(data));

    return {
      success: true,
      imageUrl: URL.createObjectURL(imageBlob),
      blob: imageBlob,
      pdfBlob,
      svg: svgText,
      mimeType: format === "jpg" || format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
          ? "image/webp"
          : "image/png",
      fileExtension,
    };
  }

  downloadBlob(blob, filename) {
    if (!blob) return;
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async shareWhatsApp(imageUrl, imageBlob = null, imageExtension = "png") {
    const text = "RUST SIT XPR - Visuel premium";
    if (navigator.share && imageBlob) {
      try {
        const file = new File([imageBlob], `rust-sit-xpr-visual.${imageExtension || "png"}`, {
          type: imageBlob.type || "image/png",
        });
        await navigator.share({ title: text, text, files: [file] });
        return;
      } catch {
        // Fallback below
      }
    }

    const url = imageUrl.startsWith("blob:") ? window.location.href : imageUrl;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank");
  }

  async shareTelegram(imageUrl, imageBlob = null, imageExtension = "png") {
    const text = "RUST SIT XPR - Visuel premium";
    if (navigator.share && imageBlob) {
      try {
        const file = new File([imageBlob], `rust-sit-xpr-visual.${imageExtension || "png"}`, {
          type: imageBlob.type || "image/png",
        });
        await navigator.share({ title: text, text, files: [file] });
        return;
      } catch {
        // Fallback below
      }
    }

    const url = imageUrl.startsWith("blob:") ? window.location.href : imageUrl;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
  }

  showShareModal(imageUrl, imageBlob = null, pdfBlob = null, imageExtension = "png") {
    const modal = document.createElement("div");
    modal.className = "share-modal";
    modal.innerHTML = `
      <div class="share-modal-content">
        <h3>Partager le visuel</h3>
        <div class="share-options">
          <button class="share-btn whatsapp" data-action="whatsapp"><span>📱</span> WhatsApp</button>
          <button class="share-btn telegram" data-action="telegram"><span>✈️</span> Telegram</button>
          <button class="share-btn download" data-action="download-image"><span>💾</span> Image</button>
          <button class="share-btn download" data-action="download-pdf"><span>📄</span> PDF</button>
          <button class="share-btn copy" data-action="copy"><span>📋</span> Copier le lien</button>
          <button class="share-btn copy" data-action="open"><span>🔍</span> Ouvrir</button>
        </div>
        <button class="close-modal">Fermer</button>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    modal.querySelector(".close-modal").addEventListener("click", close);
    modal.querySelector('[data-action="whatsapp"]').addEventListener("click", () => this.shareWhatsApp(imageUrl, imageBlob, imageExtension));
    modal.querySelector('[data-action="telegram"]').addEventListener("click", () => this.shareTelegram(imageUrl, imageBlob, imageExtension));
    modal.querySelector('[data-action="download-image"]').addEventListener("click", () => {
      if (imageBlob) {
        this.downloadBlob(imageBlob, `rust-sit-xpr-visual.${imageExtension || "png"}`);
      }
    });
    modal.querySelector('[data-action="download-pdf"]').addEventListener("click", () => {
      if (pdfBlob) {
        this.downloadBlob(pdfBlob, "rust-sit-xpr-visual.pdf");
      }
    });
    modal.querySelector('[data-action="copy"]').addEventListener("click", async () => {
      const url = imageUrl.startsWith("blob:") ? window.location.href : imageUrl;
      try {
        await navigator.clipboard.writeText(url);
        alert("Lien copié dans le presse-papier !");
      } catch {
        alert("Impossible de copier automatiquement le lien.");
      }
    });
    modal.querySelector('[data-action="open"]').addEventListener("click", () => {
      window.open(imageUrl, "_blank");
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
  }
}

window.visualGenerator = new VisualGeneratorClient();
