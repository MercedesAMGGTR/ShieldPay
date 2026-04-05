import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

/**
 * better-sqlite3–compatible sync API on top of Node's built-in SQLite (no native addon).
 * Avoids node-gyp / prebuild issues on newer Node versions.
 */
export function createSqliteDatabase(filePath) {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const native = new DatabaseSync(resolved);

  return {
    pragma(pragmaLine) {
      native.exec(`PRAGMA ${pragmaLine}`);
    },
    exec(sql) {
      native.exec(sql);
    },
    prepare(sql) {
      const stmt = native.prepare(sql);
      return {
        get(...params) {
          return stmt.get(...params);
        },
        all(...params) {
          return stmt.all(...params);
        },
        run(...params) {
          const r = stmt.run(...params);
          return {
            changes: Number(r.changes),
            lastInsertRowid: Number(r.lastInsertRowid),
          };
        },
      };
    },
  };
}
