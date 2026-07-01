// Test if sql.js works from the memory-store directory
try {
  const { initDatabase, Database } = await import('../src/mcp/memory-store/src/compat.js');
  await initDatabase();
  const db = new Database(':memory:');
  db.exec('CREATE TABLE test (id INT)');
  db.prepare('INSERT INTO test VALUES (?)').run(42);
  const rows = db.prepare('SELECT * FROM test').all();
  console.log('sql.js WORKS! Rows:', JSON.stringify(rows));
  db.close();
} catch (e) {
  console.log('sql.js FAILED:', e.message);
}
