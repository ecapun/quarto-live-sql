import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";

const db = new PGlite();

async function run() {
  const cells = document.querySelectorAll(".sqlrepl-cell");
  console.log("sqlrepl: cells", cells.length);

  for (const cell of cells) {
    const sql = cell.dataset.sql?.trim();
    if (!sql) continue;

    const statements = sql
      .split(";")
      .map(s => s.trim())   
      .filter(s => s.length > 0); // Handle multiple statements separated by semicolons

    const lastStatement = statements[statements.length - 1];
    const setupStatements = statements.slice(0, -1);


    const output = document.createElement("div");
    output.className = "sqlrepl-output";
    cell.appendChild(output);

    const pre = document.createElement("pre");

    try {
      for (const stmt of setupStatements) {
        await db.exec(stmt);
      }

      const isSelect = /^\s*select\b/i.test(lastStatement);

      if (isSelect) {
        const res = await db.query(lastStatement);
        const rows = res.rows ?? [];

        if (rows.length === 0) {
          pre.textContent = "No rows";
          output.appendChild(pre);
        } else {
          const table = document.createElement("table");
          table.className = "sqlrepl-table";
          
          const thead = document.createElement("thead");
          const headerRow = document.createElement("tr");

          const columns = Object.keys(rows[0]);
          for (const col of columns) {
            const th = document.createElement("th");
            th.textContent = col;
            headerRow.appendChild(th);
          }

          thead.appendChild(headerRow);
          table.appendChild(thead);

          const tbody = document.createElement("tbody");

          for (const row of rows) {
            const tr = document.createElement("tr");

            for (const col of columns) {
              const td = document.createElement("td");
              const value = row[col];
              td.textContent = value == null ? "" : String(value);
              tr.appendChild(td);
            }

            tbody.appendChild(tr);
          }

          table.appendChild(tbody);
          output.appendChild(table);
        }
      } else {
        await db.exec(lastStatement);
        pre.textContent = "OK";
        output.appendChild(pre);
      }
    } catch (e) {
      pre.textContent = String(e?.message ?? e);
      output.appendChild(pre);
      console.error("sqlrepl error", e, { sql });
    }
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
