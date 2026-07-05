"""
FURY X ONE - Prediction API
============================
API REST pour exposer les modèles de prédiction FIFA

Author: SOLITAIRE HACK
Version: 1.0 - Production Ready
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import pickle
import logging
from pathlib import Path
from datetime import datetime
import json
import numpy as np

# ─────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────

app = FastAPI(
    title="FURY X ONE Prediction API",
    description="API de prédiction FIFA - Résultats et scores exacts",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    handlers=[
        logging.FileHandler('logs/api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("FURY_API")

# Chemin des modèles
MODELS_DIR = Path("models")
MODELS_DIR.mkdir(exist_ok=True)

# Cache des modèles chargés
models_cache: Dict[str, Any] = {}

# ─────────────────────────────────────────
# MODELES DE DONNÉES
# ─────────────────────────────────────────

class RollingStats(BaseModel):
    """Statistiques rolling d'une équipe"""
    avg_scored: float = Field(..., description="Moyenne de buts marqués")
    avg_conceded: float = Field(..., description="Moyenne de buts encaissés")
    win_rate: float = Field(..., description="Taux de victoire")

class H2HStats(BaseModel):
    """Statistiques tête-à-tête"""
    h2h_home_wins: float = Field(..., description="Pourcentage de victoires domicile")
    h2h_avg_goals: float = Field(..., description="Moyenne de buts en H2H")
    h2h_n: int = Field(..., description="Nombre de matchs H2H")

class PredictionRequest(BaseModel):
    """Requête de prédiction"""
    league: str = Field(..., description="Nom de la ligue")
    team_home: Optional[str] = Field(None, description="Équipe domicile (format externe)")
    team_away: Optional[str] = Field(None, description="Équipe extérieur (format externe)")
    home_team: Optional[str] = Field(None, description="Équipe domicile (format interne)")
    away_team: Optional[str] = Field(None, description="Équipe extérieur (format interne)")
    rolling_home: Optional[RollingStats] = None
    rolling_away: Optional[RollingStats] = None
    h2h: Optional[H2HStats] = None
    market_data: Optional[Dict[str, Any]] = None

class PredictionResponse(BaseModel):
    """Réponse de prédiction"""
    success: bool
    league: str
    prediction: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str

class LeagueInfo(BaseModel):
    """Informations sur une ligue"""
    name: str
    model_file: str
    available: bool
    samples: Optional[int] = None
    accuracy: Optional[float] = None

class AvailableLeaguesResponse(BaseModel):
    """Liste des ligues disponibles"""
    success: bool
    leagues: List[LeagueInfo]
    total: int
    timestamp: str

# ─────────────────────────────────────────
# FONCTIONS UTILITAIRES
# ─────────────────────────────────────────

def get_model_filename(league: str) -> str:
    """Génère le nom de fichier modèle à partir du nom de la ligue"""
    # Nettoyage du nom
    safe_name = league.replace(" ", "_").replace(".", "_").replace("'", "_")
    return f"{safe_name}.pkl"

def load_model(league: str) -> Optional[Dict]:
    """Charge un modèle depuis le cache ou le disque"""
    model_file = get_model_filename(league)
    
    if model_file in models_cache:
        return models_cache[model_file]
    
    model_path = MODELS_DIR / model_file
    if not model_path.exists():
        logger.warning(f"Modèle introuvable: {model_path}")
        return None
    
    try:
        with open(model_path, "rb") as f:
            model_data = pickle.load(f)
        
        models_cache[model_file] = model_data
        logger.info(f"Modèle chargé: {model_file}")
        return model_data
    except Exception as e:
        logger.error(f"Erreur chargement modèle {model_file}: {e}")
        return None

def make_prediction(model_data: Dict, rolling_home: Dict, rolling_away: Dict, h2h: Dict) -> Dict:
    """Génère une prédiction à partir des données du modèle"""
    try:
        result_model = model_data.get("result_model")
        score_model = model_data.get("score_model")
        
        if not result_model:
            return {"error": "Modèle résultat non disponible"}
        
        # Construction des features
        features = np.array([
            rolling_home["avg_scored"],
            rolling_home["avg_conceded"],
            rolling_home["win_rate"],
            rolling_away["avg_scored"],
            rolling_away["avg_conceded"],
            rolling_away["win_rate"],
            h2h["h2h_home_wins"],
            h2h["h2h_avg_goals"],
            h2h["h2h_n"]
        ]).reshape(1, -1)
        
        # Prédiction du résultat
        result_proba = result_model.predict_proba(features)[0]
        result_classes = result_model.classes_
        result_idx = np.argmax(result_proba)
        result = result_classes[result_idx]
        
        # Prédiction du score exact
        top_scores = []
        if score_model:
            score_proba = score_model.predict_proba(features)[0]
            score_classes = score_model.classes_
            top_indices = np.argsort(score_proba)[-5:][::-1]
            
            for idx in top_indices:
                top_scores.append({
                    "score": score_classes[idx],
                    "proba": float(score_proba[idx])
                })
        
        return {
            "result": str(result),
            "result_proba": float(result_proba[result_idx]),
            "result_probas": {
                str(cls): float(prob) 
                for cls, prob in zip(result_classes, result_proba)
            },
            "top_scores": top_scores
        }
        
    except Exception as e:
        logger.error(f"Erreur prédiction: {e}")
        return {"error": str(e)}

# ─────────────────────────────────────────
# ENDPOINTS API
# ─────────────────────────────────────────

@app.get("/", tags=["Root"])
async def root():
    """Endpoint racine"""
    return {
        "service": "FURY X ONE Prediction API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Vérification de santé de l'API"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": len(models_cache),
        "models_available": len(list(MODELS_DIR.glob("*.pkl")))
    }

@app.get("/leagues", response_model=AvailableLeaguesResponse, tags=["Leagues"])
async def get_available_leagues():
    """Liste toutes les ligues disponibles"""
    model_files = list(MODELS_DIR.glob("*.pkl"))
    
    leagues = []
    for model_file in model_files:
        if model_file.name.startswith("training_summary"):
            continue
        
        league_name = model_file.stem.replace("_", " ").replace("-", " ")
        leagues.append(LeagueInfo(
            name=league_name,
            model_file=model_file.name,
            available=True
        ))
    
    return AvailableLeaguesResponse(
        success=True,
        leagues=leagues,
        total=len(leagues),
        timestamp=datetime.now().isoformat()
    )

@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict_match(request: PredictionRequest):
    """Génère une prédiction pour un match"""
    try:
        # Chargement du modèle
        model_data = load_model(request.league)
        if not model_data:
            return PredictionResponse(
                success=False,
                league=request.league,
                error=f"Modèle non disponible pour la ligue: {request.league}",
                timestamp=datetime.now().isoformat()
            )
        
        # Conversion en dict
        rolling_home = request.rolling_home.dict()
        rolling_away = request.rolling_away.dict()
        h2h = request.h2h.dict()
        
        # Prédiction
        prediction = make_prediction(model_data, rolling_home, rolling_away, h2h)
        
        if prediction.get("error"):
            return PredictionResponse(
                success=False,
                league=request.league,
                error=prediction["error"],
                timestamp=datetime.now().isoformat()
            )
        
        return PredictionResponse(
            success=True,
            league=request.league,
            prediction=prediction,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Erreur endpoint predict: {e}")
        return PredictionResponse(
            success=False,
            league=request.league,
            error=str(e),
            timestamp=datetime.now().isoformat()
        )

@app.post("/predict/batch", tags=["Predictions"])
async def predict_batch(requests: List[PredictionRequest]):
    """Génère des prédictions pour plusieurs matchs"""
    results = []
    
    for request in requests:
        result = await predict_match(request)
        results.append(result)
    
    return {
        "success": True,
        "total": len(results),
        "predictions": results,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/model/{league_name}", tags=["Models"])
async def get_model_info(league_name: str):
    """Informations sur un modèle spécifique"""
    model_file = get_model_filename(league_name)
    model_path = MODELS_DIR / model_file
    
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    
    return {
        "league": league_name,
        "model_file": model_file,
        "file_size": model_path.stat().st_size,
        "cached": model_file in models_cache,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/cache/clear", tags=["Cache"])
async def clear_cache():
    """Vide le cache des modèles"""
    global models_cache
    count = len(models_cache)
    models_cache.clear()
    
    return {
        "success": True,
        "message": f"{count} modèles retirés du cache",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/cache/stats", tags=["Cache"])
async def cache_stats():
    """Statistiques du cache"""
    return {
        "cached_models": len(models_cache),
        "model_names": list(models_cache.keys()),
        "timestamp": datetime.now().isoformat()
    }

# ─────────────────────────────────────────
# DÉMARRAGE
# ─────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    
    # Création du dossier logs
    Path("logs").mkdir(exist_ok=True)
    
    logger.info("Démarrage de FURY X ONE Prediction API")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
