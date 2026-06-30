import Database from 'better-sqlite3';
const db = new Database('C:/Users/86189/.local/share/opencode/opencode.db');
const cols = db.prepare("PRAGMA table_info(session)").all().map(c => c.name);
console.log('Columns:', cols.join(', '));
const sessions = db.prepare("SELECT rowid, * FROM session ORDER BY rowid DESC LIMIT 5").all();
for (const s of sessions) console.log(JSON.stringify(s));
for (const s of sessions) console.log(s.id, '|', (s.title||'').slice(0,50), '|', s.agent||'', '|', s.model_id||'');
db.close();
