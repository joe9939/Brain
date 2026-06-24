PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS episodic_memory (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, goal TEXT,
  steps_taken TEXT, key_decisions TEXT, errors TEXT, lessons TEXT,
  success INTEGER DEFAULT 0, tags TEXT,
  access_count INTEGER DEFAULT 0, last_accessed TEXT,
  active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS semantic_memory (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, entity_type TEXT NOT NULL,
  description TEXT, file_path TEXT, language TEXT,
  metadata TEXT, embedding BLOB, tags TEXT,
  access_count INTEGER DEFAULT 0, last_accessed TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_key TEXT NOT NULL, to_key TEXT NOT NULL, relation_type TEXT NOT NULL,
  strength REAL DEFAULT 1.0, evidence TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (from_key) REFERENCES semantic_memory(id) ON DELETE CASCADE,
  FOREIGN KEY (to_key) REFERENCES semantic_memory(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS procedural_memory (
  id TEXT PRIMARY KEY, trigger_pattern TEXT NOT NULL, trigger_regex TEXT,
  steps TEXT NOT NULL, preconditions TEXT,
  success_count INTEGER DEFAULT 0, fail_count INTEGER DEFAULT 0,
  last_used TEXT, deprecated INTEGER DEFAULT 0,
  alternative_sop_id TEXT, avg_time_ms INTEGER, optimized_prompt TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS working_memory (
  id TEXT PRIMARY KEY, goal TEXT NOT NULL,
  subtasks TEXT, context_pointers TEXT,
  priority_score REAL DEFAULT 5.0, status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id TEXT NOT NULL, memory_type TEXT NOT NULL,
  old_content TEXT, new_content TEXT, change_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retrieval_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL, results TEXT,
  user_feedback INTEGER, response_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_episodic_tags ON episodic_memory(tags);
CREATE INDEX IF NOT EXISTS idx_episodic_created ON episodic_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_semantic_type ON semantic_memory(entity_type);
CREATE INDEX IF NOT EXISTS idx_procedural_trigger ON procedural_memory(trigger_pattern);
CREATE INDEX IF NOT EXISTS idx_relations_from ON memory_relations(from_key);
CREATE INDEX IF NOT EXISTS idx_relations_to ON memory_relations(to_key);
CREATE INDEX IF NOT EXISTS idx_working_status ON working_memory(status);
-- Timeline memory (StoryArc — Ch3.2.1 temporal indexing)
CREATE TABLE IF NOT EXISTS timeline_memory (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  importance REAL DEFAULT 0.5,
  session_id TEXT,
  tags TEXT
);
CREATE INDEX IF NOT EXISTS idx_timeline_ts ON timeline_memory(timestamp);
CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_memory(event_type);