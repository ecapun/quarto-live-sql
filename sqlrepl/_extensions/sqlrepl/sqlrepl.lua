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
<script type="module" src="./sqlrepl/_extensions/sqlrepl.js"></script>
]])

  return { script, div }
end
