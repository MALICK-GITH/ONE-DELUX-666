/**
 * FURY X ONE 👿 - Visual Generator
 * Générateur d'images pour les coupons
 * Signé: SOLITAIRE HACK
 */

(function (global) {
  "use strict";

  const generateVisualBtn = document.getElementById("generateVisualBtn");
  const visualFormatSelect = document.getElementById("visualFormatSelect");
  const visualQualitySelect = document.getElementById("visualQualitySelect");

  if (generateVisualBtn) {
    generateVisualBtn.addEventListener("click", generateVisual);
  }

  async function generateVisual() {
    if (!generateVisualBtn) return;

    generateVisualBtn.disabled = true;
    generateVisualBtn.textContent = "Génération...";

    try {
      // Charger html2canvas dynamiquement si nécessaire
      if (typeof html2canvas === "undefined") {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Détecter automatiquement l'élément à capturer selon la page
      let targetSection = document.getElementById("couponSection");
      let fileNamePrefix = "rust-sit-xpr-coupon";
      
      if (!targetSection) {
        targetSection = document.getElementById("matchDetail");
        fileNamePrefix = "rust-sit-xpr-prediction";
      }
      
      if (!targetSection) {
        throw new Error("Section à capturer non trouvée (ni couponSection ni matchDetail)");
      }

      const format = visualFormatSelect?.value || "png";
      const quality = parseFloat(visualQualitySelect?.value) || 0.92;

      // Pour la page de prédiction, créer un design spécifique
      if (fileNamePrefix === "rust-sit-xpr-prediction") {
        await generatePredictionVisual(format, quality, fileNamePrefix);
      } else {
        // Pour la page coupon, utiliser la capture standard
        await captureAndDownload(targetSection, format, quality, fileNamePrefix);
      }
    } catch (error) {
      console.error("Erreur de génération visuelle:", error);
      alert("Impossible de générer l'image: " + error.message);
    } finally {
      generateVisualBtn.disabled = false;
      generateVisualBtn.textContent = "📸 Générer l'image";
    }
  }

  async function generatePredictionVisual(format, quality, fileNamePrefix) {
    // Créer un conteneur temporaire pour le design spécifique
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 800px;
      background: linear-gradient(135deg, #0a1628 0%, #1a2d4a 100%);
      padding: 40px;
      font-family: 'Sora', sans-serif;
      color: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;

    // Récupérer les données du match et de la prédiction
    const matchData = window.currentMatchData;
    const predictionData = window.currentPredictionData;

    if (!matchData) {
      throw new Error("Données du match non disponibles");
    }

    // Créer le header avec les équipes
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid rgba(66, 245, 108, 0.3);
    `;

    const team1 = document.createElement("div");
    team1.style.cssText = `
      flex: 1;
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      color: #00ff88;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;
    
    if (matchData.homeLogo) {
      const logo1 = document.createElement("img");
      logo1.src = matchData.homeLogo;
      logo1.alt = matchData.team1;
      logo1.crossOrigin = "anonymous";
      logo1.style.cssText = `
        width: 60px;
        height: 60px;
        object-fit: contain;
        border-radius: 8px;
      `;
      team1.appendChild(logo1);
    }
    const team1Name = document.createElement("div");
    team1Name.textContent = matchData.team1 || "Équipe Domicile";
    team1.appendChild(team1Name);

    const vs = document.createElement("div");
    vs.style.cssText = `
      flex: 0;
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      padding: 0 20px;
      align-self: center;
    `;
    vs.textContent = "VS";

    const team2 = document.createElement("div");
    team2.style.cssText = `
      flex: 1;
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      color: #ff4444;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;
    
    if (matchData.awayLogo) {
      const logo2 = document.createElement("img");
      logo2.src = matchData.awayLogo;
      logo2.alt = matchData.team2;
      logo2.crossOrigin = "anonymous";
      logo2.style.cssText = `
        width: 60px;
        height: 60px;
        object-fit: contain;
        border-radius: 8px;
      `;
      team2.appendChild(logo2);
    }
    const team2Name = document.createElement("div");
    team2Name.textContent = matchData.team2 || "Équipe Extérieur";
    team2.appendChild(team2Name);

    header.appendChild(team1);
    header.appendChild(vs);
    header.appendChild(team2);

    // Créer la section d'informations du match
    const matchInfoSection = document.createElement("div");
    matchInfoSection.style.cssText = `
      background: rgba(255, 255, 255, 0.03);
      border-radius: 15px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const leagueInfo = document.createElement("div");
    leagueInfo.style.cssText = `
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    const leagueLabel = document.createElement("div");
    leagueLabel.style.cssText = `
      font-size: 12px;
      color: #888;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    leagueLabel.textContent = "Ligue";
    
    const leagueValue = document.createElement("div");
    leagueValue.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
    `;
    leagueValue.textContent = matchData.league || "Compétition virtuelle";
    
    leagueInfo.appendChild(leagueLabel);
    leagueInfo.appendChild(leagueValue);

    const timeInfo = document.createElement("div");
    timeInfo.style.cssText = `
      text-align: center;
    `;
    
    const timeLabel = document.createElement("div");
    timeLabel.style.cssText = `
      font-size: 12px;
      color: #888;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    timeLabel.textContent = "Heure de début";
    
    const timeValue = document.createElement("div");
    timeValue.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      color: #00ff88;
    `;
    
    if (matchData.startTime) {
      const startTime = new Date(matchData.startTime);
      timeValue.textContent = startTime.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } else {
      timeValue.textContent = "Non disponible";
    }
    
    timeInfo.appendChild(timeLabel);
    timeInfo.appendChild(timeValue);

    matchInfoSection.appendChild(leagueInfo);
    matchInfoSection.appendChild(timeInfo);

    // Créer la section de prédiction
    const predictionSection = document.createElement("div");
    predictionSection.style.cssText = `
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 20px;
    `;

    if (predictionData && predictionData.predictions) {
      const matchResult = predictionData.predictions.match_result || {};
      const probabilities = matchResult.probabilities || {};
      const x2 = {
        home: probabilities.home_win || 0,
        draw: probabilities.draw || 0,
        away: probabilities.away_win || 0
      };
      const maxProb = Math.max(x2.home || 0, x2.draw || 0, x2.away || 0);
      let mainPrediction = "N/A";
      let mainPredictionColor = "#666";
      
      if (maxProb === x2.home) {
        mainPrediction = `Victoire ${matchData.team1}`;
        mainPredictionColor = "#00ff88";
      } else if (maxProb === x2.draw) {
        mainPrediction = "Match Nul";
        mainPredictionColor = "#ffaa00";
      } else if (maxProb === x2.away) {
        mainPrediction = `Victoire ${matchData.team2}`;
        mainPredictionColor = "#ff4444";
      }

      const mainResult = document.createElement("div");
      mainResult.style.cssText = `
        text-align: center;
        margin-bottom: 20px;
        padding: 15px;
        background: rgba(66, 245, 108, 0.1);
        border-left: 4px solid ${mainPredictionColor};
        border-radius: 8px;
      `;

      const mainLabel = document.createElement("div");
      mainLabel.style.cssText = `
        font-size: 14px;
        color: #888;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      `;
      mainLabel.textContent = "PRÉDICTION PRINCIPALE";

      const mainValue = document.createElement("div");
      mainValue.style.cssText = `
        font-size: 28px;
        font-weight: 800;
        color: ${mainPredictionColor};
      `;
      mainValue.textContent = mainPrediction;

      const confidence = document.createElement("div");
      confidence.style.cssText = `
        font-size: 16px;
        color: #aaa;
        margin-top: 5px;
      `;
      confidence.textContent = `Confiance: ${(maxProb * 100).toFixed(1)}%`;

      mainResult.appendChild(mainLabel);
      mainResult.appendChild(mainValue);
      mainResult.appendChild(confidence);
      predictionSection.appendChild(mainResult);

      // Ajouter les cotes si disponibles
      if (matchData.odds) {
        const oddsSection = document.createElement("div");
        oddsSection.style.cssText = `
          display: flex;
          justify-content: space-around;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const odds = [
          { label: "1", value: matchData.odds.home || "N/A", color: "#00ff88" },
          { label: "X", value: matchData.odds.draw || "N/A", color: "#ffaa00" },
          { label: "2", value: matchData.odds.away || "N/A", color: "#ff4444" }
        ];

        odds.forEach(odd => {
          const oddDiv = document.createElement("div");
          oddDiv.style.cssText = `
            text-align: center;
          `;

          const oddLabel = document.createElement("div");
          oddLabel.style.cssText = `
            font-size: 14px;
            color: #888;
            margin-bottom: 5px;
          `;
          oddLabel.textContent = odd.label;

          const oddValue = document.createElement("div");
          oddValue.style.cssText = `
            font-size: 24px;
            font-weight: 700;
            color: ${odd.color};
          `;
          oddValue.textContent = odd.value;

          oddDiv.appendChild(oddLabel);
          oddDiv.appendChild(oddValue);
          oddsSection.appendChild(oddDiv);
        });

        predictionSection.appendChild(oddsSection);
      }
    } else {
      const noPrediction = document.createElement("div");
      noPrediction.style.cssText = `
        text-align: center;
        color: #888;
        font-size: 18px;
      `;
      noPrediction.textContent = "Prédiction non disponible";
      predictionSection.appendChild(noPrediction);
    }

    // Footer
    const footer = document.createElement("div");
    footer.style.cssText = `
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 12px;
      color: #666;
    `;
    footer.textContent = "😈 FURY X ONE 👿 - Analyse IA par SOLITAIRE HACK 🇨🇮";

    container.appendChild(header);
    container.appendChild(matchInfoSection);
    container.appendChild(predictionSection);
    container.appendChild(footer);

    document.body.appendChild(container);

    try {
      // Charger html2canvas dynamiquement si nécessaire
      if (typeof html2canvas === "undefined") {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      await captureAndDownload(container, format, quality, fileNamePrefix);
    } finally {
      document.body.removeChild(container);
    }
  }

  async function captureAndDownload(element, format, quality, fileNamePrefix) {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0a1628"
    });

    const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    const dataUrl = canvas.toDataURL(mimeType, quality);

    const link = document.createElement("a");
    link.download = `${fileNamePrefix}-${Date.now()}.${format}`;
    link.href = dataUrl;
    link.click();
  }

  global.VisualGenerator = {
    generateVisual,
    captureAndDownload
  };
})(window);
