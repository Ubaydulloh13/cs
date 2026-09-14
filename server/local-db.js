import { DatabaseSync } from "node:sqlite";
export function openDatabase(path = ":memory:") {
  const sql = new DatabaseSync(path);
  sql.exec("PRAGMA foreign_keys=ON");
  sql.exec("PRAGMA journal_mode=WAL");
  const statement = (text, args = []) => ({
    bind: (...v) => statement(text, v),
    async first() {
      return sql.prepare(text).get(...args) || null;
    },
    async all() {
      return { results: sql.prepare(text).all(...args) };
    },
    runSync() {
      const r = sql.prepare(text).run(...args);
      return { success: true, meta: { changes: Number(r.changes) } };
    },
    async run() {
      return this.runSync();
    },
  });
  return {
    prepare: statement,
    async batch(items) {
      sql.exec("BEGIN IMMEDIATE");
      try {
        const out = [];
        for (const item of items) out.push(item.runSync());
        sql.exec("COMMIT");
        return out;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
    close() {
      sql.close();
    },
  };
}
