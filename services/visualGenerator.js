const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const OUTPUT_DIR = path.join(process.cwd(), "public", "generated-images");
const TEMPLATE_DIR = path.join(__dirname, "..", "templates", "visuals");

// S'assurer que le répertoire de sortie existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

class VisualGenerator {
  constructor() {
    this.formats = {
      square: { width: 1080, height: 1080 },
      landscape: { width: 1200, height: 630 },
      portrait: { width: 1080, height: 1920 }
    };
    
    this.exportFormats = ['png', 'jpeg', 'webp'];
  }

  /**
   * Génère un visuel pour une prédiction individuelle
   */
  async generatePredictionVisual(data, options = {}) {
    const {
      format = 'square',
      exportFormat = 'png',
      quality = 0.9
    } = options;

    const dimensions = this.formats[format] || this.formats.square;
    
    // Préparer les données pour le template
    const templateData = {
      ...data,
      generatedAt: data.generatedAt || new Date().toISOString(),
      quality: data.quality || 0,
      stability: data.stability || 0,
      timing: data.timing || 0,
      potential: data.potential || 0,
      confidence: data.confidence || 0,
      signature: "😈 SOLITAIRE HACK 🇨🇮"
    };

    // Générer le HTML du template
    const html = this.generatePredictionHTML(templateData, dimensions);

    // Sauvegarder le fichier HTML temporaire
    const tempHtmlPath = path.join(OUTPUT_DIR, `temp-${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, html, 'utf8');

    // Utiliser une méthode de génération d'image (placeholder pour l'instant)
    // Dans une vraie implémentation, on utiliserait Puppeteer ici
    const outputPath = path.join(OUTPUT_DIR, `prediction-${Date.now()}.${exportFormat}`);
    
    try {
      // Placeholder: copier le HTML comme fichier pour l'instant
      // Dans la vraie implémentation, ceci serait remplacé par la génération Puppeteer
      fs.writeFileSync(outputPath.replace(`.${exportFormat}`, '.html'), html, 'utf8');
      
      return {
        success: true,
        path: outputPath.replace(`.${exportFormat}`, '.html').replace('public', ''),
        format: exportFormat,
        dimensions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors de la génération du visuel:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Nettoyer le fichier temporaire
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    }
  }

  /**
   * Génère un visuel pour un coupon complet
   */
  async generateCouponVisual(data, options = {}) {
    const {
      format = 'square',
      exportFormat = 'png',
      quality = 0.9
    } = options;

    const dimensions = this.formats[format] || this.formats.square;
    
    // Préparer les données pour le template
    const templateData = {
      ...data,
      generatedAt: data.generatedAt || new Date().toISOString(),
      totalOdds: data.totalOdds || 0,
      confidence: data.confidence || 0,
      selections: data.selections || [],
      signature: "😈 SOLITAIRE HACK 🇨🇮"
    };

    // Générer le HTML du template
    const html = this.generateCouponHTML(templateData, dimensions);

    // Sauvegarder le fichier
    const outputPath = path.join(OUTPUT_DIR, `coupon-${Date.now()}.${exportFormat}`);
    
    try {
      fs.writeFileSync(outputPath.replace(`.${exportFormat}`, '.html'), html, 'utf8');
      
      return {
        success: true,
        path: outputPath.replace(`.${exportFormat}`, '.html').replace('public', ''),
        format: exportFormat,
        dimensions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors de la génération du visuel coupon:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Génère le HTML pour une prédiction individuelle
   */
  generatePredictionHTML(data, dimensions) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${dimensions.width}, initial-scale=1.0">
  <title>ONE-DELUX-FAST - Prédiction IA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      background: linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%);
      font-family: 'Chakra Petch', 'Sora', sans-serif;
      color: #ffffff;
      overflow: hidden;
      position: relative;
    }
    
    .container {
      width: 100%;
      height: 100%;
      padding: 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }
    
    .bg-grid {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 30px 30px;
      z-index: 1;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid rgba(0, 255, 255, 0.3);
      padding-bottom: 20px;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #00ffff;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 8px;
      text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
    }
    
    .header p {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 1px;
    }
    
    .match-section {
      text-align: center;
      margin: 30px 0;
    }
    
    .league {
      font-size: 14px;
      color: #00ff88;
      font-weight: 600;
      letter-spacing: 2px;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    
    .teams {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
    }
    
    .team {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }
    
    .vs {
      font-size: 18px;
      color: #00ffff;
      font-weight: 600;
    }
    
    .prediction-section {
      background: rgba(0, 255, 255, 0.1);
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 15px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .prediction-section h2 {
      font-size: 16px;
      color: #00ffff;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .prediction-value {
      font-size: 32px;
      font-weight: 700;
      color: #00ff88;
      text-align: center;
      text-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
    }
    
    .analysis-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    
    .metric {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 15px;
      text-align: center;
    }
    
    .metric-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #00ffff;
    }
    
    .odds-section {
      text-align: center;
      margin: 20px 0;
    }
    
    .odds-section h3 {
      font-size: 14px;
      color: #ffd700;
      margin-bottom: 10px;
    }
    
    .odds-value {
      font-size: 48px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    }
    
    .confidence-section {
      text-align: center;
      margin: 20px 0;
    }
    
    .confidence-section h3 {
      font-size: 14px;
      color: #00ffff;
      margin-bottom: 10px;
    }
    
    .confidence-bar {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 25px;
      height: 30px;
      overflow: hidden;
      position: relative;
      margin: 10px 0;
    }
    
    .confidence-fill {
      background: linear-gradient(90deg, #00ffff 0%, #00ff88 100%);
      height: 100%;
      border-radius: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      color: #0a1628;
      text-shadow: none;
    }
    
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #00ff88 0%, #00ffff 100%);
      color: #0a1628;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 700;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .footer {
      text-align: center;
      border-top: 2px solid rgba(0, 255, 255, 0.3);
      padding-top: 20px;
    }
    
    .footer p {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 5px;
    }
    
    .signature {
      font-size: 14px;
      color: #00ffff;
      font-weight: 600;
    }
    
    .glow-effect {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
      border-radius: 50%;
      z-index: 0;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-effect"></div>
  
  <div class="container">
    <div class="header">
      <h1>ONE-DELUX-FAST</h1>
      <p>Le signal avant le coup d'envoi</p>
      <p style="font-size: 10px; margin-top: 5px;">${new Date(data.generatedAt).toLocaleDateString('fr-FR')}</p>
    </div>
    
    <div class="match-section">
      <div class="league">${data.league || 'Ligue FIFA'}</div>
      <div class="teams">
        <div class="team">${data.homeTeam || 'Équipe 1'}</div>
        <div class="vs">VS</div>
        <div class="team">${data.awayTeam || 'Équipe 2'}</div>
      </div>
    </div>
    
    <div class="prediction-section">
      <h2>🤖 PRÉDICTION IA</h2>
      <div class="prediction-value">${data.prediction || 'Analyse en cours'}</div>
    </div>
    
    <div class="analysis-section">
      <div class="metric">
        <div class="metric-label">Qualité</div>
        <div class="metric-value">${data.quality}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Stabilité</div>
        <div class="metric-value">${data.stability}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Timing</div>
        <div class="metric-value">${data.timing}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Potentiel</div>
        <div class="metric-value">${data.potential}</div>
      </div>
    </div>
    
    <div class="odds-section">
      <h3>💰 COTE</h3>
      <div class="odds-value">${data.odds || 'N/A'}</div>
    </div>
    
    <div class="confidence-section">
      <h3>🎯 CONFIANCE IA</h3>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${data.confidence}%">
          ${data.confidence}%
        </div>
      </div>
      <div class="badge">VALIDÉ</div>
    </div>
    
    <div class="footer">
      <p>ONE-DELUX-FAST</p>
      <p>Analyse générée automatiquement</p>
      <div class="signature">${data.signature}</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Génère le HTML pour un coupon
   */
  generateCouponHTML(data, dimensions) {
    const selectionsHTML = (data.selections || []).map((selection, index) => `
      <div class="selection">
        <div class="selection-number">${index + 1}</div>
        <div class="selection-content">
          <div class="selection-team">${selection.team || selection.homeTeam}</div>
          <div class="selection-odds">Cote : ${selection.odds || selection.odd || 'N/A'}</div>
        </div>
        <div class="selection-check">✅</div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${dimensions.width}, initial-scale=1.0">
  <title>ONE-DELUX-FAST - Coupon IA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      background: linear-gradient(135deg, #0a1628 0%, #1a1a2e 50%, #16213e 100%);
      font-family: 'Chakra Petch', 'Sora', sans-serif;
      color: #ffffff;
      overflow: hidden;
      position: relative;
    }
    
    .container {
      width: 100%;
      height: 100%;
      padding: 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }
    
    .bg-grid {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 30px 30px;
      z-index: 1;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid rgba(0, 255, 255, 0.3);
      padding-bottom: 20px;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #00ffff;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 8px;
      text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
    }
    
    .header p {
      font-size: 14px;
      color: #00ff88;
      font-weight: 600;
      letter-spacing: 2px;
    }
    
    .selections-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin: 30px 0;
    }
    
    .selection {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(0, 255, 255, 0.2);
      border-radius: 12px;
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .selection-number {
      background: linear-gradient(135deg, #00ffff 0%, #00ff88 100%);
      color: #0a1628;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
    }
    
    .selection-content {
      flex: 1;
    }
    
    .selection-team {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 5px;
    }
    
    .selection-odds {
      font-size: 14px;
      color: #ffd700;
    }
    
    .selection-check {
      font-size: 24px;
    }
    
    .summary-section {
      background: rgba(0, 255, 255, 0.1);
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 15px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    
    .summary-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .summary-value {
      font-size: 42px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
      margin-bottom: 15px;
    }
    
    .confidence-bar {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 25px;
      height: 35px;
      overflow: hidden;
    }
    
    .confidence-fill {
      background: linear-gradient(90deg, #00ffff 0%, #00ff88 100%);
      height: 100%;
      border-radius: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: #0a1628;
    }
    
    .footer {
      text-align: center;
      border-top: 2px solid rgba(0, 255, 255, 0.3);
      padding-top: 20px;
    }
    
    .signature {
      font-size: 16px;
      color: #00ffff;
      font-weight: 600;
    }
    
    .glow-effect {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(0, 255, 255, 0.08) 0%, transparent 70%);
      border-radius: 50%;
      z-index: 0;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-effect"></div>
  
  <div class="container">
    <div class="header">
      <h1>COUPON IA PREMIUM</h1>
      <p>Sélection intelligente</p>
    </div>
    
    <div class="selections-container">
      ${selectionsHTML}
    </div>
    
    <div class="summary-section">
      <div class="summary-label">COTE TOTALE</div>
      <div class="summary-value">${data.totalOdds}</div>
      
      <div class="summary-label" style="margin-top: 15px;">CONFIANCE GLOBALE</div>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${data.confidence}%">
          ${data.confidence}%
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="signature">${data.signature}</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Nettoie les anciens fichiers générés
   */
  cleanupOldFiles(maxAge = 3600000) {
    try {
      const files = fs.readdirSync(OUTPUT_DIR);
      const now = Date.now();
      
      for (const file of files) {
        if (file.startsWith('temp-')) continue; // Ignorer les fichiers temporaires
        
        const filePath = path.join(OUTPUT_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Fichier supprimé: ${file}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des anciens fichiers:', error);
    }
  }
}

module.exports = VisualGenerator;