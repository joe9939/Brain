import Database from 'better-sqlite3';
const db = new Database('C:/Users/86189/.local/share/opencode/opencode.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
for (const t of tables) console.log(t.name);
db.close();
