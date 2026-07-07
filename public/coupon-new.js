/**
 * FURY X ONE - Coupon Generator with Real Prediction API
 * Uses FIFA Virtual Prediction System API for real predictions
 */

class CouponGenerator {
  constructor() {
    this.matchCount = 3;
    this.market = '1x2';
    this.league = 'all';
    this.generatedCoupon = null;
    this.isGenerating = false;
    
    this.init();
  }

  init() {
    // Get DOM elements
    this.matchCountSelect = document.getElementById('matchCountSelect');
    this.marketSelect = document.getElementById('marketSelect');
    this.leagueSelect = document.getElementById('leagueSelect');
    this.generateCouponBtn = document.getElementById('generateCouponBtn');
    this.generateImageBtn = document.getElementById('generateImageBtn');
    this.validateCouponBtn = document.getElementById('validateCouponBtn');
    this.couponSection = document.getElementById('couponSection');
    this.resultSection = document.getElementById('result');
    this.validationSection = document.getElementById('validation');
    this.statsSection = document.getElementById('couponStats');

    // Add event listeners
    this.matchCountSelect.addEventListener('change', (e) => {
      this.matchCount = parseInt(e.target.value);
    });

    this.marketSelect.addEventListener('change', (e) => {
      this.market = e.target.value;
    });

    this.leagueSelect.addEventListener('change', (e) => {
      this.league = e.target.value;
    });

    this.generateCouponBtn.addEventListener('click', () => this.generateCoupon());
    this.generateImageBtn.addEventListener('click', () => this.generateImage());
    this.validateCouponBtn.addEventListener('click', () => this.validateCoupon());

    // Load available leagues from API
    this.loadLeagues();

    console.log('🎯 Coupon Generator initialized');
  }

  async loadLeagues() {
    try {
      const response = await fetch('/api/prediction/leagues');
      const data = await response.json();

      if (data.success && Array.isArray(data.leagues)) {
        this.updateLeagueSelect(data.leagues);
      }
    } catch (error) {
      console.error('Error loading leagues:', error);
      // Keep default options if API fails
    }
  }

  updateLeagueSelect(leagues) {
    // Clear current options except "all"
    const currentValue = this.leagueSelect.value;
    this.leagueSelect.innerHTML = '';

    // Add league options
    leagues.forEach((league) => {
      const option = document.createElement('option');
      option.value = league.name;
      option.textContent = league.name;
      this.leagueSelect.appendChild(option);
    });

    // Add "all" option at the end
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Toutes les ligues';
    this.leagueSelect.appendChild(allOption);

    // Restore previous selection if still valid
    if (currentValue && leagues.some((league) => league.name === currentValue)) {
      this.leagueSelect.value = currentValue;
    } else {
      this.leagueSelect.value = 'all';
    }
  }

  async generateCoupon() {
    if (this.isGenerating) return;
    
    this.isGenerating = true;
    this.generateCouponBtn.disabled = true;
    this.generateCouponBtn.textContent = 'Génération en cours...';
    
    this.couponSection.innerHTML = '<div class="loading-card">Chargement des matchs depuis 888starz...</div>';
    this.resultSection.innerHTML = '<p>Analyse en cours...</p>';

    try {
      // Fetch real matches from 888starz API via proxy
      const matches = await this.fetchRealMatches();
      
      // Filter matches by selected league
      const filteredMatches = this.filterMatchesByLeague(matches, this.league);
      
      // Select requested number of matches
      const selectedMatches = this.selectMatches(filteredMatches, this.matchCount);
      
      if (selectedMatches.length === 0) {
        throw new Error('Aucun match disponible pour cette ligue');
      }
      
      this.couponSection.innerHTML = '<div class="loading-card">Génération des prédictions...</div>';
      
      // Get predictions from API for each match
      const predictions = await this.getPredictionsForMatches(selectedMatches);
      
      // Build coupon with predictions
      this.generatedCoupon = this.buildCoupon(predictions);
      
      // Display coupon
      this.displayCoupon(this.generatedCoupon);
      
      // Enable buttons
      this.generateImageBtn.disabled = false;
      this.validateCouponBtn.disabled = false;
      
      // Display stats
      this.displayStats(this.generatedCoupon);
      
    } catch (error) {
      console.error('❌ Error generating coupon:', error);
      this.couponSection.innerHTML = `<div class="error-card">Erreur: ${error.message}</div>`;
      this.resultSection.innerHTML = '<p>Erreur lors de la génération.</p>';
    } finally {
      this.isGenerating = false;
      this.generateCouponBtn.disabled = false;
      this.generateCouponBtn.textContent = 'Générer Coupon';
    }
  }

  async fetchRealMatches() {
    try {
      const response = await fetch('/api/matches');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.matches)) {
        return data.matches;
      } else {
        throw new Error('Invalid response from matches API');
      }
    } catch (error) {
      console.error('Error fetching real matches:', error);
      throw new Error('Impossible de charger les matchs depuis 888starz');
    }
  }

  filterMatchesByLeague(matches, selectedLeague) {
    if (selectedLeague === 'all' || !selectedLeague) {
      return matches;
    }

    return matches.filter(match => {
      const leagueName = (match.league || match.L || '').toLowerCase();
      return leagueName === String(selectedLeague).toLowerCase();
    });
  }

  selectMatches(matches, count) {
    if (matches.length <= count) {
      return matches;
    }

    // Randomly select matches
    const shuffled = [...matches].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  async getPredictionsForMatches(matches) {
    const predictions = [];

    for (const match of matches) {
      try {
        // Extract team names and league from 888starz format
        const team_home = match.O1 || match.team1 || match.home;
        const team_away = match.O2 || match.team2 || match.away;
        const league = match.L || match.league || match.leagueName;

        if (!team_home || !team_away || !league) {
          console.warn('Invalid match format:', match);
          continue;
        }

        // Build prediction request with optional market_data
        const requestBody = {
          team_home,
          team_away,
          league
        };

        // Include market_data if available from 888starz
        if (match.E || match.AE) {
          requestBody.market_data = {
            O1: team_home,
            O2: team_away,
            L: league
          };

          if (match.E) {
            requestBody.market_data.E = match.E;
          }

          if (match.AE) {
            requestBody.market_data.AE = match.AE;
          }
        }

        const response = await fetch('/api/prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.success && data.prediction) {
          predictions.push({
            match: {
              team_home,
              team_away,
              league,
              original: match
            },
            prediction: data.prediction
          });
        } else {
          console.error('Prediction failed for match:', match);
        }
      } catch (error) {
        console.error('Error getting prediction:', error);
      }
    }

    return predictions;
  }

  buildCoupon(predictions) {
    const coupon = {
      matchCount: predictions.length,
      market: this.market,
      league: this.league,
      matches: [],
      totalConfidence: 0,
      averageConfidence: 0
    };

    predictions.forEach(({ match, prediction }) => {
      const matchPrediction = this.extractMarketPrediction(prediction, this.market);
      
      coupon.matches.push({
        home: match.team_home,
        away: match.team_away,
        league: match.league,
        family: prediction.family,
        prediction: matchPrediction,
        confidence: matchPrediction.confidence || 0
      });

      coupon.totalConfidence += matchPrediction.confidence || 0;
    });

    coupon.averageConfidence = coupon.totalConfidence / coupon.matchCount;

    return coupon;
  }

  extractMarketPrediction(prediction, market) {
    const predictions = prediction.predictions || {};
    
    switch (market) {
      case '1x2':
        return {
          type: '1x2',
          home: predictions['1x2']?.home || 0,
          draw: predictions['1x2']?.draw || 0,
          away: predictions['1x2']?.away || 0,
          confidence: predictions['1x2']?.confidence || 0,
          recommendation: this.get1x2Recommendation(predictions['1x2'])
        };
      case 'btts':
        return {
          type: 'btts',
          yes: predictions['btts']?.yes || 0,
          no: predictions['btts']?.no || 0,
          confidence: predictions['btts']?.confidence || 0,
          recommendation: predictions['btts']?.yes > predictions['btts']?.no ? 'YES' : 'NO'
        };
      case 'over_under':
        return {
          type: 'over_under',
          over: predictions['over_under']?.over || 0,
          under: predictions['over_under']?.under || 0,
          confidence: predictions['over_under']?.confidence || 0,
          recommendation: predictions['over_under']?.over > predictions['over_under']?.under ? 'OVER' : 'UNDER'
        };
      case 'score_range':
        return {
          type: 'score_range',
          ranges: predictions['score_range'] || {},
          confidence: predictions['score_range']?.confidence || 0,
          recommendation: this.getScoreRangeRecommendation(predictions['score_range'])
        };
      case 'double_chance':
        return {
          type: 'double_chance',
          '1x': predictions['double_chance']?.['1x'] || 0,
          x2: predictions['double_chance']?.x2 || 0,
          '12': predictions['double_chance']?.['12'] || 0,
          confidence: predictions['double_chance']?.confidence || 0,
          recommendation: this.getDoubleChanceRecommendation(predictions['double_chance'])
        };
      case 'clean_sheet':
        return {
          type: 'clean_sheet',
          home_yes: predictions['clean_sheet']?.home_yes || 0,
          home_no: predictions['clean_sheet']?.home_no || 0,
          away_yes: predictions['clean_sheet']?.away_yes || 0,
          away_no: predictions['clean_sheet']?.away_no || 0,
          confidence: predictions['clean_sheet']?.confidence || 0,
          recommendation: this.getCleanSheetRecommendation(predictions['clean_sheet'])
        };
      case 'draw_no_bet':
        return {
          type: 'draw_no_bet',
          home: predictions['draw_no_bet']?.home || 0,
          away: predictions['draw_no_bet']?.away || 0,
          confidence: predictions['draw_no_bet']?.confidence || 0,
          recommendation: predictions['draw_no_bet']?.home > predictions['draw_no_bet']?.away ? 'HOME' : 'AWAY'
        };
      case 'win_both_halves':
        return {
          type: 'win_both_halves',
          yes: predictions['win_both_halves']?.yes || 0,
          no: predictions['win_both_halves']?.no || 0,
          confidence: predictions['win_both_halves']?.confidence || 0,
          recommendation: predictions['win_both_halves']?.yes > predictions['win_both_halves']?.no ? 'YES' : 'NO'
        };
      case 'parity':
        return {
          type: 'parity',
          pair: predictions['parity']?.pair || 0,
          impair: predictions['parity']?.impair || 0,
          confidence: predictions['parity']?.confidence || 0,
          recommendation: predictions['parity']?.pair > predictions['parity']?.impair ? 'PAIR' : 'IMPAIR'
        };
      default:
        return predictions['1x2'] || {};
    }
  }

  get1x2Recommendation(prediction) {
    if (!prediction) return 'N/A';
    const max = Math.max(prediction.home, prediction.draw, prediction.away);
    if (max === prediction.home) return 'HOME';
    if (max === prediction.draw) return 'DRAW';
    return 'AWAY';
  }

  getScoreRangeRecommendation(prediction) {
    if (!prediction) return 'N/A';
    let maxRange = '0-2';
    let maxProb = 0;
    for (const [range, prob] of Object.entries(prediction)) {
      if (range !== 'confidence' && prob > maxProb) {
        maxProb = prob;
        maxRange = range;
      }
    }
    return maxRange;
  }

  getDoubleChanceRecommendation(prediction) {
    if (!prediction) return 'N/A';
    const max = Math.max(prediction['1x'], prediction.x2, prediction['12']);
    if (max === prediction['1x']) return '1X';
    if (max === prediction.x2) return 'X2';
    return '12';
  }

  getCleanSheetRecommendation(prediction) {
    if (!prediction) return 'N/A';
    const homeClean = prediction.home_yes > prediction.home_no ? 'HOME' : 'NO_HOME';
    const awayClean = prediction.away_yes > prediction.away_no ? 'AWAY' : 'NO_AWAY';
    return `${homeClean} + ${awayClean}`;
  }

  displayCoupon(coupon) {
    let html = '<div class="coupon-container">';
    html += `<h2>Coupon généré - ${coupon.matchCount} matchs</h2>`;
    html += `<p class="coupon-info">Marché: ${this.market} | Ligue: ${coupon.league} | Confiance moyenne: ${(coupon.averageConfidence * 100).toFixed(1)}%</p>`;
    
    html += '<div class="coupon-matches">';
    coupon.matches.forEach((match, index) => {
      html += `
        <div class="coupon-match-card">
          <div class="match-header">
            <span class="match-number">#${index + 1}</span>
            <span class="match-league">${match.league}</span>
          </div>
          <div class="match-teams">
            <span class="team home">${match.home}</span>
            <span class="vs">vs</span>
            <span class="team away">${match.away}</span>
          </div>
          <div class="match-prediction">
            <span class="prediction-type">${match.prediction.type.toUpperCase()}</span>
            <span class="prediction-value">${match.prediction.recommendation}</span>
            <span class="prediction-confidence">${(match.prediction.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    html += '</div>';

    this.couponSection.innerHTML = html;
    this.resultSection.innerHTML = `<p>Coupon généré avec succès. ${coupon.matchCount} matchs analysés.</p>`;
  }

  displayStats(coupon) {
    const highConfidence = coupon.matches.filter(m => m.prediction.confidence > 0.7).length;
    const mediumConfidence = coupon.matches.filter(m => m.prediction.confidence > 0.5 && m.prediction.confidence <= 0.7).length;
    const lowConfidence = coupon.matches.filter(m => m.prediction.confidence <= 0.5).length;

    let html = '<div class="coupon-stats">';
    html += '<h3>Statistiques du Coupon</h3>';
    html += '<div class="stats-grid">';
    html += `<article><span>Matchs</span><strong>${coupon.matchCount}</strong></article>`;
    html += `<article><span>Confiance moyenne</span><strong>${(coupon.averageConfidence * 100).toFixed(1)}%</strong></article>`;
    html += `<article><span>Haute confiance (>70%)</span><strong>${highConfidence}</strong></article>`;
    html += `<article><span>Moyenne confiance (50-70%)</span><strong>${mediumConfidence}</strong></article>`;
    html += `<article><span>Basse confiance (<50%)</span><strong>${lowConfidence}</strong></article>`;
    html += '</div>';
    html += '</div>';

    this.statsSection.innerHTML = html;
  }

  generateImage() {
    if (!this.generatedCoupon) {
      alert('Générez d\'abord un coupon');
      return;
    }

    // Placeholder for image generation
    alert('Génération d\'image - Fonctionnalité à implémenter avec html2canvas');
    console.log('📸 Image generation requested for coupon:', this.generatedCoupon);
  }

  validateCoupon() {
    if (!this.generatedCoupon) {
      alert('Générez d\'abord un coupon');
      return;
    }

    // Validate coupon
    const validation = this.performValidation(this.generatedCoupon);
    
    let html = '<div class="validation-result">';
    html += '<h3>Résultat de la Validation</h3>';
    
    if (validation.isValid) {
      html += '<div class="validation-success">✅ Coupon validé avec succès</div>';
    } else {
      html += '<div class="validation-warning">⚠️ Attention: Certains picks ont une confiance faible</div>';
    }
    
    html += '<ul class="validation-details">';
    validation.details.forEach(detail => {
      html += `<li>${detail}</li>`;
    });
    html += '</ul>';
    html += '</div>';

    this.validationSection.innerHTML = html;
  }

  performValidation(coupon) {
    const details = [];
    let isValid = true;

    // Check average confidence
    if (coupon.averageConfidence < 0.5) {
      details.push('Confiance moyenne inférieure à 50%');
      isValid = false;
    } else if (coupon.averageConfidence < 0.6) {
      details.push('Confiance moyenne moyenne (50-60%)');
    } else {
      details.push('Confiance moyenne satisfaisante');
    }

    // Check individual match confidence
    const lowConfidenceMatches = coupon.matches.filter(m => m.prediction.confidence < 0.4);
    if (lowConfidenceMatches.length > 0) {
      details.push(`${lowConfidenceMatches.length} match(s) avec confiance < 40%`);
      isValid = false;
    }

    // Check league diversity
    const uniqueLeagues = new Set(coupon.matches.map(m => m.league)).size;
    if (uniqueLeagues === 1) {
      details.push('Tous les matchs sont dans la même ligue');
    } else {
      details.push(`${uniqueLeagues} ligues différentes représentées`);
    }

    return { isValid, details };
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.couponGenerator = new CouponGenerator();
});
