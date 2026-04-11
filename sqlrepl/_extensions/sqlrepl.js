import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";
import "https://cdn.jsdelivr.net/npm/@electric-sql/pglite-repl/dist-webcomponent/Repl.js";

const db = await PGlite.create();

async function run() {
  const cells = document.querySelectorAll(".sqlrepl-cell");
  console.log("sqlrepl: cells", cells.length);

  const beforeAllByEnvir = new Map();
  const beforeEachByEnvir = new Map();
  const executedBeforeAllEnvirs = new Set();

  // 1. Lifecycle-Blöcke einsammeln
  for (const cell of cells) {
    const lifecycle = cell.dataset.lifecycle || "main";
    const envir = cell.dataset.envir || "";
    const sql = cell.dataset.sql?.trim();

    if (!sql || !envir) continue;

    if (lifecycle === "beforeAll") {
      beforeAllByEnvir.set(envir, sql);
    }

    if (lifecycle === "beforeEach") {
      beforeEachByEnvir.set(envir, sql);
    }
  }

  // 2. Nur main-Blöcke mounten
  for (const cell of cells) {
    const lifecycle = cell.dataset.lifecycle || "main";
    const envir = cell.dataset.envir || "";
    const initialSql = cell.dataset.sql?.trim();

    if (lifecycle !== "main") continue;

    try {
      const beforeAllSql = envir ? beforeAllByEnvir.get(envir) : null;
      if (envir && beforeAllSql && !executedBeforeAllEnvirs.has(envir)) {
        await db.exec(beforeAllSql);
        executedBeforeAllEnvirs.add(envir);
      }

      const beforeEachSql = envir ? beforeEachByEnvir.get(envir) : null;
      if (envir && beforeEachSql) {
        await db.exec(beforeEachSql);
      }

      const mount = cell.querySelector(".sqlrepl-editor");
      if (!mount) continue;

      mount.style.width = "100%";
      mount.style.maxWidth = "100%";
      mount.style.minWidth = "0";

      const repl = document.createElement("pglite-repl");
      repl.pg = db;

      if (initialSql) {
        repl.setAttribute("value", initialSql);
      }
            
      repl.style.display = "block";
      repl.style.width = "100%";
      repl.style.maxWidth = "100%";
      repl.style.minWidth = "0";
      repl.style.minHeight = "600px";
      repl.style.height = "600px";
      mount.appendChild(repl);

      console.log("mount width", mount.clientWidth);
      console.log("repl width", repl.clientWidth);

    } catch (e) {
      console.error("sqlrepl lifecycle/mount error", e, { envir, initialSql });
    }
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", run);
} else {
  run();
}