import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";

const db = new PGlite();

async function runAll() {
  const cells = document.querySelectorAll(".sqlrepl-cell");

  for (const cell of cells) {
    const sql = cell.textContent.trim();

    try {
      const result = await db.query(sql);

      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(result, null, 2);

      cell.appendChild(pre);
    } catch (err) {
      const pre = document.createElement("pre");
      pre.textContent = err.message;
      cell.appendChild(pre);
    }
  }
}

window.addEventListener("DOMContentLoaded", runAll);
