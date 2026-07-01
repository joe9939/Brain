// persistence-tracker.test.js — Tool-tracker persistence across simulated restarts
// Uses better-sqlite3 directly to verify agent reputation persists across close/reopen.
const path = require('path');
const fs = require('fs');

const DB_DIR = path.resolve(__dirname, '..', '..', '.omo', 'evidence', 'test-dbs');
const DB_PATH = path.join(DB_DIR, `persist-tracker-${Date.now()}.db`);

module.exports = {
  name: 'MCP: Tracker Persistence Across Restart',
  run: async () => {
    const start = Date.now();
    const results = [];
    const TEST_AGENT = `test_agent_${Date.now()}`;

    try {
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

      const Database = require('better-sqlite3');

      // Phase 1: Create DB, write agent score, verify
      let db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');
      db.exec(`
        CREATE TABLE IF NOT EXISTS agent_scores (
          agent_name TEXT PRIMARY KEY,
          reliability REAL DEFAULT 0.5,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          avg_response_time_ms INTEGER DEFAULT 0,
          total_tasks INTEGER DEFAULT 0,
          last_seen TEXT
        )
      `);

      const now = new Date().toISOString();
      db.prepare(`INSERT INTO agent_scores (agent_name, reliability, success_count, failure_count, total_tasks, last_seen) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(TEST_AGENT, 0.85, 17, 3, 20, now);

      const row1 = db.prepare(`SELECT reliability, total_tasks FROM agent_scores WHERE agent_name = ?`).get(TEST_AGENT);
      results.push({ name: 'Agent score inserted', pass: !!row1 });
      results.push({ name: 'Reliability preserved', pass: row1 && row1.reliability === 0.85 });
      results.push({ name: 'Total tasks correct', pass: row1 && row1.total_tasks === 20 });

      db.close();

      // Phase 2: Reopen DB (simulate restart), verify data persists
      db = new Database(DB_PATH);
      const row2 = db.prepare(`SELECT agent_name, reliability, success_count, failure_count FROM agent_scores WHERE agent_name = ?`).get(TEST_AGENT);
      results.push({ name: 'Persistence: data survives close/reopen', pass: !!row2 });
      results.push({ name: 'Agent name preserved', pass: row2 && row2.agent_name === TEST_AGENT });
      results.push({ name: 'Success count preserved', pass: row2 && row2.success_count === 17 });
      results.push({ name: 'Failure count preserved', pass: row2 && row2.failure_count === 3 });

      // Phase 3: Update after "restart" and verify again
      db.prepare(`UPDATE agent_scores SET success_count = success_count + 1, total_tasks = total_tasks + 1, reliability = CAST(success_count + 1 AS REAL) / (total_tasks + 1) WHERE agent_name = ?`)
        .run(TEST_AGENT);
      const row3 = db.prepare(`SELECT success_count, total_tasks FROM agent_scores WHERE agent_name = ?`).get(TEST_AGENT);
      results.push({ name: 'Update after restart works', pass: row3 && row3.success_count === 18 && row3.total_tasks === 21 });

      db.close();

      // Cleanup
      try { fs.unlinkSync(DB_PATH); } catch { }

    } catch (e) {
      results.push({ name: 'Test error: ' + e.message.slice(0, 100), pass: false });
    }

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
