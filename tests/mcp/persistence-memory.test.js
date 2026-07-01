// persistence-memory.test.js — Memory persistence across simulated restarts
// Uses better-sqlite3 directly to verify SQLite persistence survives close/reopen.
const path = require('path');
const fs = require('fs');

const DB_DIR = path.resolve(__dirname, '..', '..', '.omo', 'evidence', 'test-dbs');
const DB_PATH = path.join(DB_DIR, `persist-memory-${Date.now()}.db`);

module.exports = {
  name: 'MCP: Memory Persistence Across Restart',
  run: async () => {
    const start = Date.now();
    const results = [];

    try {
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

      const Database = require('better-sqlite3');

      // Phase 1: Create DB, store data, verify, close
      let db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');
      db.exec(`CREATE TABLE IF NOT EXISTS semantic_memory (id TEXT PRIMARY KEY, content TEXT, tags TEXT, created_at TEXT, last_accessed TEXT, importance REAL DEFAULT 1.0, archived INTEGER DEFAULT 0, access_count INTEGER DEFAULT 0)`);

      const insert = db.prepare(`INSERT INTO semantic_memory (id, content, tags, created_at, last_accessed) VALUES (?, ?, ?, datetime('now'), datetime('now'))`);
      insert.run('persist_key_1', 'Persistent content for cross-restart verification', JSON.stringify(['test', 'persistence']));

      const row1 = db.prepare(`SELECT content FROM semantic_memory WHERE id = ?`).get('persist_key_1');
      results.push({ name: 'SQLite insert succeeds', pass: !!row1 });
      results.push({ name: 'Content matches after insert', pass: row1 && row1.content === 'Persistent content for cross-restart verification' });

      db.close();

      // Phase 2: Reopen the same DB file (simulate restart)
      db = new Database(DB_PATH);
      const row2 = db.prepare(`SELECT content FROM semantic_memory WHERE id = ?`).get('persist_key_1');
      results.push({ name: 'Persistence: data survives close/reopen', pass: !!row2 });
      results.push({ name: 'Content matches after restart', pass: row2 && row2.content === 'Persistent content for cross-restart verification' });
      db.close();

      // Phase 3: Verify with a second key
      db = new Database(DB_PATH);
      db.prepare(`INSERT OR IGNORE INTO semantic_memory (id, content, tags, created_at, last_accessed) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
        .run('persist_key_2', 'Second entry for multi-key persistence', JSON.stringify(['test']));
      db.close();

      db = new Database(DB_PATH);
      const row3 = db.prepare(`SELECT count(*) as c FROM semantic_memory`).get();
      results.push({ name: 'Multiple keys persist correctly', pass: row3 && row3.c >= 2 });
      db.close();

      // Cleanup
      try { fs.unlinkSync(DB_PATH); } catch { }

    } catch (e) {
      results.push({ name: 'Test error: ' + e.message.slice(0, 100), pass: false });
    }

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
