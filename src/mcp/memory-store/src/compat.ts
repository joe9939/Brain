// better-sqlite3 → sql.js compatibility layer
// Provides the synchronous better-sqlite3 API using sql.js (WASM SQLite)

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let SQL = null;
export async function initDatabase() {
  // sql.js WASM file is relative to the sql.js module
  SQL = await initSqlJs({
    locateFile: (file) => {
      // Try multiple locations for the WASM file
      const locations = [
        join(__dirname, '../../node_modules/sql.js/dist', file),
        join(__dirname, '../node_modules/sql.js/dist', file),
        join(__dirname, 'node_modules/sql.js/dist', file),
        join(process.cwd(), 'node_modules/sql.js/dist', file),
      ];
      for (const loc of locations) {
        if (existsSync(loc)) return loc;
      }
      return join(__dirname, file); // fallback
    }
  });
}

// Wraps sql.js Database to match better-sqlite3's Statement API
class Statement {
  db: any;
  sql: string;
  constructor(db: any, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  // Returns array of row objects
  all(...params) {
    if (params.length > 0) {
      // Parameterized query
      const stmt = this.db.prepare(this.sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(Object.assign({}, stmt.getAsObject()));
      stmt.free();
      return rows;
    }
    const result = this.db.exec(this.sql);
    if (result.length === 0) return [];
    return result[0].values.map(vals => {
      const row = {};
      result[0].columns.forEach((col, i) => { row[col] = vals[i]; });
      return row;
    });
  }

  // Returns single row or undefined
  get(...params) {
    const rows = this.all(...params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  // Runs query, returns { changes, lastInsertRowid }
  run(...params) {
    if (params.length > 0) {
      const stmt = this.db.prepare(this.sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      this.db.run(this.sql);
    }
    return { changes: this.db.getRowsModified(), lastInsertRowid: 0 };
  }
}

// Wraps sql.js Database to match better-sqlite3's Database API
export class Database {
  db: any;
  path: string;
  inTransaction: boolean = false;
  constructor(pathOrBuffer: any) {
    if (pathOrBuffer === ':memory:') {
      this.db = new SQL.Database();
    } else {
      const exists = existsSync(pathOrBuffer);
      if (exists) {
        const buffer = readFileSync(pathOrBuffer);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }
    }
    this.path = pathOrBuffer;
    this.inTransaction = false;
  }

  prepare(sql) {
    return new Statement(this.db, sql);
  }

  exec(sql) {
    this.db.run(sql);
  }

  close() {
    this.db.close();
  }

  // Save to file (sql.js needs explicit persistence)
  persist() {
    if (this.path && this.path !== ':memory:') {
      const data = this.db.export();
      writeFileSync(this.path, Buffer.from(data));
    }
  }

  // Transaction support
  transaction(fn) {
    return (...args) => {
      this.db.run('BEGIN TRANSACTION');
      this.inTransaction = true;
      try {
        const result = fn(...args);
        this.db.run('COMMIT');
        this.inTransaction = false;
        return result;
      } catch (e) {
        this.db.run('ROLLBACK');
        this.inTransaction = false;
        throw e;
      }
    };
  }

  get pragma() {
    const self = this;
    const fn = (sql) => { self.db.run(`PRAGMA ${sql}`); };
    fn.set = (key, val) => { self.db.run(`PRAGMA ${key} = ${val}`); };
    fn.get = (key) => { 
      const r = self.db.exec(`PRAGMA ${key}`);
      return r.length > 0 && r[0].values.length > 0 ? r[0].values[0][0] : undefined;
    };
    return fn;
  }

  get memory() { return this.db; }
}
