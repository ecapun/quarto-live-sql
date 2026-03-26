print("lua is running.")
local injected = false

---@diagnostic disable: undefined-global
---@param cb any
function CodeBlock(cb)
  if not cb.classes:includes("sqlrepl") then
    return nil
  end

  -- Div-Inhalt muss aus Blocks bestehen, nicht String
  local div = pandoc.Div(
  {},
  pandoc.Attr("", { "sqlrepl-cell" }, { { "data-sql", cb.text } })
  )

  if injected then
    return div
  end

  injected = true

  local script = pandoc.RawBlock("html", [[
    <script type="module" src="./sqlrepl/_extensions/sqlrepl.js"></script>
    ]]
  )

  local css = pandoc.RawBlock("html", [[
    <style>
    .sqlrepl-table {
      border-collapse: collapse;
      margin-top: 8px;
    }

    .sqlrepl-table th,
    .sqlrepl-table td {
      border: 1px solid #ccc;
      padding: 4px 8px;
      text-align: left;
    }
    </style>
    ]]
  )

  return { script, css, div }
end
