CREATE TABLE IF NOT EXISTS agent_scores (
  agent_name TEXT PRIMARY KEY,
  reliability REAL DEFAULT 0.5,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  last_seen TEXT
);

-- Index for sorting by reliability in agent_reputation queries
CREATE INDEX IF NOT EXISTS idx_agent_reliability ON agent_scores(reliability DESC);
