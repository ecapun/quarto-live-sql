// assets/db.js
// Browser-build (WASM) direkt aus dist/
import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";

export async function createDb(seedSql = "") {
  // Laut Doku bevorzugt: PGlite.create() (async init)
  const db = await PGlite.create(); // in-memory by default :contentReference[oaicite:1]{index=1}

  if (seedSql && seedSql.trim().length > 0) {
    await db.exec(seedSql);
  }
  return db;
}

export async function runSql(db, sql) {
  const trimmed = (sql ?? "").trim();
  if (!trimmed) return { kind: "empty" };

  try {
    const res = await db.query(trimmed);
    return { kind: "rows", rows: res?.rows ?? [] };
  } catch (e1) {
    try {
      await db.exec(trimmed);
      return { kind: "ok" };
    } catch (e2) {
      const msg =
        (e2 && (e2.message || String(e2))) ||
        (e1 && (e1.message || String(e1))) ||
        "SQL error";
      return { kind: "error", message: msg };
    }
  }
}
