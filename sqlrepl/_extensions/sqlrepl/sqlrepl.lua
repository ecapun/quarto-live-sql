print("lua is running.")
local injected = false

---@diagnostic disable: undefined-global
function CodeBlock(cb)
  if not cb.classes:includes("sqlrepl") then
    return nil
  end

  local envir = cb.attributes["envir"] or "global"
  local exercise = cb.attributes["exercise"] or ""
  local isSetup = cb.attributes["setup"] == "true"
  local isCheck = cb.attributes["check"] == "true"

  local role = "exercise"
  if isSetup then
    role = "setup"
  elseif isCheck then
    role = "check"
  end

  local badgeText = role
  if envir ~= "" then
    badgeText = badgeText .. " · " .. envir
  end
  if exercise ~= "" then
    badgeText = badgeText .. " · " .. exercise
  end

  local content = {
    pandoc.RawBlock("html", '<div class="sqlrepl-meta">' .. badgeText .. '</div>')
  }

  if role == "exercise" then
    table.insert(content, pandoc.RawBlock("html", '<div class="sqlrepl-editor"></div>'))
  end

  if role == "check" then
    table.insert(content, pandoc.RawBlock("html", '<div class="sqlrepl-output"></div>'))
    table.insert(content, pandoc.RawBlock("html", '<div class="sqlrepl-feedback"></div>'))
  end

  local div = pandoc.Div(
    content,
    pandoc.Attr("", { "sqlrepl-cell" }, {
      { "data-sql", cb.text },
      { "data-role", role },
      { "data-envir", envir },
      { "data-exercise", exercise }
    })
  )

  if injected then
    return div
  end

  injected = true

  local script = pandoc.RawBlock("html", [[
    <script type="module" src="./sqlrepl/_extensions/sqlrepl.js"></script>
  ]])
  
  local css = pandoc.RawBlock("html", [[
    <style>
      :root {
        --sqlrepl-bg: #f6f7f9;
        --sqlrepl-card: #ffffff;
        --sqlrepl-border: #e5e7eb;
        --sqlrepl-text: #111827;
        --sqlrepl-muted: #6b7280;
        --sqlrepl-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        --sqlrepl-radius: 14px;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        text-align: left !important;
      }

      body #quarto-content,
      body main.content,
      body #quarto-document-content,
      body .content,
      body .page-columns,
      body .page-layout-article,
      body .page-layout-full,
      body .column-page,
      body .column-body,
      body .column-body-outset,
      body .column-body-inset {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        box-sizing: border-box !important;
      }

      body .page-columns {
        display: block !important;
      }

      #quarto-document-content h2,
      #quarto-document-content h3,
      #quarto-document-content h4,
      body main.content h2,
      body main.content h3,
      body main.content h4 {
        width: 90% !important;
        max-width: 90% !important;
        margin: 24px auto 12px auto !important;
        box-sizing: border-box !important;
        text-align: left !important;
      }

      #quarto-document-content {
        width: 100% !important;
        max-width: 100% !important;
        padding: 32px !important;
        margin: 0 !important;
      }

      #title-block-header,
      .quarto-title-block,
      .quarto-title-banner,
      h1.title,
      .title {
        width: 95% !important;
        max-width: 95% !important;
        margin: 0 auto 24px auto !important;
        box-sizing: border-box !important;
        text-align: left !important;
      }

      h1, h2, h3 {
        color: var(--sqlrepl-text);
        letter-spacing: -0.02em;
        text-align: left !important;
      }

      h1 {
        font-size: 2.4rem;
        margin-bottom: 2rem;
      }

      .sqlrepl-cell {
        display: block;
        width: 90% !important;
        max-width: 90% !important;
        box-sizing: border-box !important;
        margin: 24px auto !important;
        padding: 18px 18px 16px;
        background: var(--sqlrepl-card);
        border: 1px solid var(--sqlrepl-border);
        border-radius: var(--sqlrepl-radius);
        box-shadow: var(--sqlrepl-shadow);
      }

      .sqlrepl-meta {
        display: inline-flex;
        align-items: center;
        margin-bottom: 12px;
        padding: 4px 10px;
        border-radius: 999px;
        background: #f3f4f6;
        color: var(--sqlrepl-muted);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.01em;
        text-transform: lowercase;
      }

      .sqlrepl-editor {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        margin-top: 4px;
        overflow: hidden;
        border-radius: 12px;
        box-sizing: border-box;
      }

      .sqlrepl-editor > *,
      .sqlrepl-editor pglite-repl {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box;
      }

      .sqlrepl-output {
        margin-top: 12px;
      }

      .sqlrepl-feedback {
        margin-top: 12px;
        font-weight: 500;
      }

      .sqlrepl-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
        background: #fff;
        font-size: 0.95rem;
      }

      .sqlrepl-table th,
      .sqlrepl-table td {
        border: 1px solid var(--sqlrepl-border);
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
      }

      .sqlrepl-table th {
        background: #f9fafb;
        font-weight: 600;
      }

      .sqlrepl-output pre,
      .sqlrepl-feedback pre,
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  ]])

  return { script, div, css }
end