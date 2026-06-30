import Database from 'better-sqlite3';
const db = new Database('C:/Users/86189/.local/share/opencode/opencode.db');
// Check credential table for server password
const creds = db.prepare("SELECT * FROM credential").all();
for (const c of creds) console.log(JSON.stringify(c));
const acct = db.prepare("SELECT * FROM account").all();
for (const a of acct) console.log(JSON.stringify(a));
const acctState = db.prepare("SELECT * FROM account_state").all();
for (const a of acctState) console.log(JSON.stringify(a));
db.close();
