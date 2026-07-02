-- Schema SQL pour FURY X ONE - Visitor Tracking

-- Table pour le tracking des visiteurs
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip VARCHAR(45) NOT NULL,
  user_agent TEXT,
  referer TEXT,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  protocol VARCHAR(10),
  host TEXT
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_visitors_timestamp ON visitors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_ip ON visitors(ip);
CREATE INDEX IF NOT EXISTS idx_visitors_path ON visitors(path);

-- Table pour les statistiques agrégées (optionnel pour performance)
CREATE TABLE IF NOT EXISTS visitor_stats (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_visits INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_visitor_stats_updated_at BEFORE UPDATE ON visitor_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
