import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";
import "https://cdn.jsdelivr.net/npm/@electric-sql/pglite-repl/dist-webcomponent/Repl.js";

const db = await PGlite.create();

async function run() {
  const cells = document.querySelectorAll(".sqlrepl-cell");
  console.log("sqlrepl: cells", cells.length);

  const beforeAllByGroup = new Map();
  const beforeEachByGroup = new Map();
  const executedBeforeAllGroups = new Set();

  // 1. Lifecycle-Blöcke einsammeln
  for (const cell of cells) {
    const lifecycle = cell.dataset.lifecycle || "main";
    const group = cell.dataset.group || "";
    const sql = cell.dataset.sql?.trim();

    if (!sql || !group) continue;

    if (lifecycle === "beforeAll") {
      beforeAllByGroup.set(group, sql);
    }

    if (lifecycle === "beforeEach") {
      beforeEachByGroup.set(group, sql);
    }
  }

  // 2. Nur main-Blöcke mounten
  for (const cell of cells) {
    const lifecycle = cell.dataset.lifecycle || "main";
    const group = cell.dataset.group || "";
    const initialSql = cell.dataset.sql?.trim();

    if (lifecycle !== "main") continue;

    try {
      const beforeAllSql = group ? beforeAllByGroup.get(group) : null;
      if (group && beforeAllSql && !executedBeforeAllGroups.has(group)) {
        await db.exec(beforeAllSql);
        executedBeforeAllGroups.add(group);
      }

      const beforeEachSql = group ? beforeEachByGroup.get(group) : null;
      if (group && beforeEachSql) {
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
      console.error("sqlrepl lifecycle/mount error", e, { group, initialSql });
    }
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", run);
} else {
  run();
}