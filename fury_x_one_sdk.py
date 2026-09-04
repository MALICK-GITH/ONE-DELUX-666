"""
FURY X ONE - Client SDK
========================
SDK Python pour intégrer l'API de prédiction FIFA

Author: SOLITAIRE HACK
Version: 1.0 - Production Ready
"""

import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import json

# ─────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────

@dataclass
class RollingStats:
    """Statistiques rolling d'une équipe"""
    avg_scored: float
    avg_conceded: float
    win_rate: float
    
    def to_dict(self) -> Dict:
        return {
            "avg_scored": self.avg_scored,
            "avg_conceded": self.avg_conceded,
            "win_rate": self.win_rate
        }

@dataclass
class H2HStats:
    """Statistiques tête-à-tête"""
    h2h_home_wins: float
    h2h_avg_goals: float
    h2h_n: int
    
    def to_dict(self) -> Dict:
        return {
            "h2h_home_wins": self.h2h_home_wins,
            "h2h_avg_goals": self.h2h_avg_goals,
            "h2h_n": self.h2h_n
        }

@dataclass
class PredictionResult:
    """Résultat d'une prédiction"""
    success: bool
    league: str
    prediction: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str = ""
    
    @classmethod
    def from_response(cls, response: Dict) -> 'PredictionResult':
        return cls(**response)

# ─────────────────────────────────────────
# CLIENT SDK
# ─────────────────────────────────────────

class FuryXOneClient:
    """Client SDK pour FURY X ONE Prediction API"""
    
    def __init__(self, base_url: str = "http://localhost:8000", timeout: int = 30):
        """
        Initialise le client SDK
        
        Args:
            base_url: URL de base de l'API (défaut: http://localhost:8000)
            timeout: Timeout des requêtes en secondes (défaut: 30)
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
    
    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Effectue une requête HTTP"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = self.session.get(url, timeout=self.timeout)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=self.timeout)
            else:
                raise ValueError(f"Méthode non supportée: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": f"Erreur de requête: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    def health_check(self) -> Dict:
        """
        Vérifie la santé de l'API
        
        Returns:
            Dict: Statut de santé de l'API
        """
        return self._request("GET", "/health")
    
    def get_available_leagues(self) -> Dict:
        """
        Récupère la liste des ligues disponibles
        
        Returns:
            Dict: Liste des ligues avec leurs informations
        """
        return self._request("GET", "/leagues")
    
    def predict_match(
        self,
        league: str,
        home_team: str,
        away_team: str,
        rolling_home: RollingStats,
        rolling_away: RollingStats,
        h2h: H2HStats
    ) -> PredictionResult:
        """
        Génère une prédiction pour un match
        
        Args:
            league: Nom de la ligue
            home_team: Équipe domicile
            away_team: Équipe extérieure
            rolling_home: Stats rolling domicile
            rolling_away: Stats rolling extérieur
            h2h: Stats tête-à-tête
        
        Returns:
            PredictionResult: Résultat de la prédiction
        """
        data = {
            "league": league,
            "home_team": home_team,
            "away_team": away_team,
            "rolling_home": rolling_home.to_dict(),
            "rolling_away": rolling_away.to_dict(),
            "h2h": h2h.to_dict()
        }
        
        response = self._request("POST", "/predict", data)
        return PredictionResult.from_response(response)
    
    def predict_batch(self, requests: List[Dict]) -> Dict:
        """
        Génère des prédictions pour plusieurs matchs
        
        Args:
            requests: Liste de requêtes de prédiction
        
        Returns:
            Dict: Résultats des prédictions batch
        """
        return self._request("POST", "/predict/batch", {"requests": requests})
    
    def get_model_info(self, league_name: str) -> Dict:
        """
        Récupère les informations d'un modèle
        
        Args:
            league_name: Nom de la ligue
        
        Returns:
            Dict: Informations du modèle
        """
        return self._request("GET", f"/model/{league_name}")
    
    def clear_cache(self) -> Dict:
        """
        Vide le cache des modèles
        
        Returns:
            Dict: Résultat de l'opération
        """
        return self._request("POST", "/cache/clear")
    
    def get_cache_stats(self) -> Dict:
        """
        Récupère les statistiques du cache
        
        Returns:
            Dict: Statistiques du cache
        """
        return self._request("GET", "/cache/stats")
    
    def close(self):
        """Ferme la session HTTP"""
        self.session.close()
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()

# ─────────────────────────────────────────
# FONCTIONS UTILITAIRES
# ─────────────────────────────────────────

def simulate_stats_from_odds(odds_home: float, odds_away: float) -> tuple:
    """
    Simule des statistiques rolling à partir des cotes
    
    Args:
        odds_home: Cote domicile
        odds_away: Cote extérieur
    
    Returns:
        tuple: (rolling_home, rolling_away) comme dictionnaires
    """
    prob_home = 1 / odds_home if odds_home and odds_home > 1 else 0.5
    prob_away = 1 / odds_away if odds_away and odds_away > 1 else 0.5
    
    rolling_home = {
        "avg_scored": round(prob_home * 3, 2),
        "avg_conceded": round((1 - prob_home) * 2, 2),
        "win_rate": round(prob_home, 3)
    }
    
    rolling_away = {
        "avg_scored": round(prob_away * 3, 2),
        "avg_conceded": round((1 - prob_away) * 2, 2),
        "win_rate": round(prob_away, 3)
    }
    
    return rolling_home, rolling_away

def create_default_h2h() -> Dict:
    """Crée des stats H2H par défaut"""
    return {
        "h2h_home_wins": 0.5,
        "h2h_avg_goals": 2.5,
        "h2h_n": 0
    }

# ─────────────────────────────────────────
# EXEMPLES D'UTILISATION
# ─────────────────────────────────────────

if __name__ == "__main__":
    # Exemple d'utilisation du SDK
    client = FuryXOneClient(base_url="http://localhost:8000")
    
    try:
        # Vérification de santé
        health = client.health_check()
        print(f"Santé API: {health}")
        
        # Liste des ligues
        leagues = client.get_available_leagues()
        print(f"Ligues disponibles: {leagues['total']}")
        
        # Prédiction simple
        rolling_home = RollingStats(avg_scored=2.5, avg_conceded=1.2, win_rate=0.65)
        rolling_away = RollingStats(avg_scored=1.8, avg_conceded=1.5, win_rate=0.45)
        h2h = H2HStats(h2h_home_wins=0.6, h2h_avg_goals=3.2, h2h_n=4)
        
        prediction = client.predict_match(
            league="FC 26 5x5 Rush Superligue",
            home_team="Bayer 04",
            away_team="Atletico Madrid",
            rolling_home=rolling_home,
            rolling_away=rolling_away,
            h2h=h2h
        )
        
        print(f"Prédiction: {prediction}")
        
    finally:
        client.close()
