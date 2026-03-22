import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";

const db = new PGlite();

async function run() {
  const cells = document.querySelectorAll(".sqlrepl-cell"); // exakt deine Klasse
  console.log("sqlrepl: cells", cells.length);

  for (const cell of cells) {
    const sql = cell.textContent.trim();
    if (!sql) continue;

    try {
      const isSelect = /^\s*select\b/i.test(sql);
      const pre = document.createElement("pre");

      if (isSelect) {
        const res = await db.query(sql);
        pre.textContent = JSON.stringify(res, null, 2);
      } else {
        await db.exec(sql);
        pre.textContent = "OK";
      }

      cell.appendChild(pre);
    } catch (e) {
      const pre = document.createElement("pre");
      pre.textContent = String(e?.message ?? e);
      cell.appendChild(pre);
      console.error("sqlrepl error", e, { sql });
    }
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
