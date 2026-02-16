local injected = false

function CodeBlock(cb)
  if not cb.classes:includes("sqlrepl") then
    return nil
  end

  -- Div-Inhalt muss aus Blocks bestehen, nicht String
  local div = pandoc.Div(
    { pandoc.Plain({ pandoc.Str(cb.text) }) },
    pandoc.Attr("", { "sqlrepl-cell" }, {})
  )

  if injected then
    return div
  end

  injected = true

  local script = pandoc.RawBlock("html", [[
<script type="module">
import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";

const db = new PGlite();

window.addEventListener("DOMContentLoaded", async () => {
  const cells = document.querySelectorAll(".sqlrepl-cell");
  console.log("sqlrepl.js running", cells.length);

  for (const cell of cells) {
    const sql = cell.textContent.trim();

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
      pre.textContent = e?.message ?? String(e);
      cell.appendChild(pre);
    }
  }
});
</script>
]])

  return { script, div }
end
