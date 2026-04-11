import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js";
import "https://cdn.jsdelivr.net/npm/@electric-sql/pglite-repl/dist-webcomponent/Repl.js";

const db = await PGlite.create();

function readCell(cell) {
  return {
    cell,
    role: cell.dataset.role || "exercise",
    envir: cell.dataset.envir || "global",
    exercise: cell.dataset.exercise || "",
    sql: cell.dataset.sql?.trim() || "",
  };
}

function getExerciseKey(envir, exercise) {
  return `${envir}::${exercise}`;
}

function getContextKey(role, envir, exercise) {
  return `${role}::${envir}::${exercise}`;
}

function createExerciseStore() {
  return new Map();
}

function saveContext(store, context) {
  store.set(getContextKey(context.role, context.envir, context.exercise), context);
}

function getExerciseContext(store, envir, exercise) {
  return store.get(getContextKey("exercise", envir, exercise)) || null;
}

function getCheckContext(store, envir, exercise) {
  return store.get(getContextKey("check", envir, exercise)) || null;
}

function hasExerciseCheck(store, envir, exercise) {
  const context = getExerciseContext(store, envir, exercise);
  return !!context?.hasCheck;
}

function getExerciseEditorSql(context) {
  const editorContent =
    context?.repl?.shadowRoot?.querySelector("[contenteditable='true']");

  return editorContent?.textContent?.trim() || "";
}

function setFeedback(feedbackEl, message) {
  if (!feedbackEl) return;
  feedbackEl.textContent = message;
}

function setOutput(outputEl, value) {
  if (!outputEl) return;

  const firstResult = Array.isArray(value) ? value[0] : null;
  const rows = firstResult?.rows;

  if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object") {
    const columns = Object.keys(rows[0]);

    const thead = `
      <thead>
        <tr>
          ${columns.map((col) => `<th>${escapeHtml(String(col))}</th>`).join("")}
        </tr>
      </thead>
    `;

    const tbody = `
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${columns
                  .map((col) => `<td>${escapeHtml(formatCellValue(row[col]))}</td>`)
                  .join("")}
              </tr>
            `
          )
          .join("")}
      </tbody>
    `;

    outputEl.innerHTML = `
      <table class="sqlrepl-table">
        ${thead}
        ${tbody}
      </table>
    `;
    return;
  }

  outputEl.innerHTML = `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseCheckResult(result) {
  const row = result?.[0]?.rows?.[0];

  return {
    passed: row?.passed,
    message: row?.message || "",
    row,
  };
}

function collectCells(cells) {
  const setupByEnvir = new Map();
  const checkByExercise = new Map();

  for (const cell of cells) {
    const { role, envir, exercise, sql } = readCell(cell);
    if (!sql) continue;

    if (role === "setup") {
      setupByEnvir.set(envir, sql);
    }

    if (role === "check" && exercise) {
      const key = getExerciseKey(envir, exercise);
      checkByExercise.set(key, sql);
    }
  }

  return { setupByEnvir, checkByExercise };
}

async function beforeEach({ db, envir, setupByEnvir }) {
  const setupSql = setupByEnvir.get(envir);
  if (!setupSql) return;
  await db.exec(setupSql);
}

function getCheckSql({ envir, exercise, checkByExercise }) {
  if (!exercise) return null;

  const key = getExerciseKey(envir, exercise);
  return checkByExercise.get(key) || null;
}

function createExerciseContext({ cell, setupByEnvir, checkByExercise }) {
  const { role, envir, exercise, sql: initialSql } = readCell(cell);

  const checkSql =
    role === "exercise"
      ? getCheckSql({
          envir,
          exercise,
          checkByExercise,
        })
      : null;

  const mount = cell.querySelector(".sqlrepl-editor");
  const output = cell.querySelector(".sqlrepl-output");
  const feedback = cell.querySelector(".sqlrepl-feedback");

  return {
    cell,
    role,
    envir,
    exercise,
    initialSql,
    checkSql,
    hasCheck: !!checkSql,
    mount,
    output,
    feedback,
    repl: null,
    setupByEnvir,
  };
}

async function runCheckForExercise(store, envir, exercise) {
  const exerciseContext = getExerciseContext(store, envir, exercise);
  const checkContext = getCheckContext(store, envir, exercise);

  if (!exerciseContext) {
    return {
      ok: false,
      message: `Kein Exercise-Kontext für ${envir} / ${exercise} gefunden.`,
    };
  }

  if (!exerciseContext.hasCheck || !exerciseContext.checkSql) {
    setFeedback(
      checkContext?.feedback,
      `Kein Check für ${envir} / ${exercise} vorhanden.`
    );

    return {
      ok: false,
      message: `Kein Check für ${envir} / ${exercise} vorhanden.`,
    };
  }

  try {
    const result = await db.exec(exerciseContext.checkSql);
    const parsed = parseCheckResult(result);
    const passed = parsed.passed === true || parsed.passed === "true";

    setFeedback(
      checkContext?.feedback,
      parsed.message ||
        (passed
          ? `Check bestanden für ${envir} / ${exercise}.`
          : `Check nicht bestanden für ${envir} / ${exercise}.`)
    );

    return {
      ok: passed,
      message:
        parsed.message ||
        (passed
          ? `Check bestanden für ${envir} / ${exercise}.`
          : `Check nicht bestanden für ${envir} / ${exercise}.`),
      checkSql: exerciseContext.checkSql,
      result,
      parsed,
      exerciseContext,
      checkContext,
    };
  } catch (error) {
    setFeedback(
      checkContext?.feedback,
      `Check fehlgeschlagen für ${envir} / ${exercise}: ${error.message}`
    );

    return {
      ok: false,
      message: `Check fehlgeschlagen für ${envir} / ${exercise}.`,
      error,
      exerciseContext,
      checkContext,
    };
  }
}

function bindExerciseRunHandler(context) {
  const tryBind = () => {
    const editorEl =
      context?.repl?.shadowRoot?.querySelector("[contenteditable='true']");

    if (!editorEl) {
      requestAnimationFrame(tryBind);
      return;
    }

    editorEl.addEventListener(
      "keydown",
      async (event) => {
        const isPlainEnter =
          event.key === "Enter" &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey;

        if (!isPlainEnter) return;

        const autocompleteOpen =
          !!context.repl?.shadowRoot?.querySelector(".cm-tooltip-autocomplete");

        if (autocompleteOpen) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        await runExerciseSql(
          window.sqlreplExerciseStore,
          context.envir,
          context.exercise
        );

        await runCheckForExercise(
          window.sqlreplExerciseStore,
          context.envir,
          context.exercise
        );
      },
      true
    );
  };

  tryBind();
}

async function runExerciseSql(store, envir, exercise) {
  const exerciseContext = getExerciseContext(store, envir, exercise);
  const checkContext = getCheckContext(store, envir, exercise);

  if (!exerciseContext) {
    return {
      ok: false,
      message: `Kein Exercise-Kontext für ${envir} / ${exercise} gefunden.`,
    };
  }

  const sql = getExerciseEditorSql(exerciseContext);

  if (!sql) {
    setFeedback(
      checkContext?.feedback,
      `Kein SQL im Editor für ${envir} / ${exercise} vorhanden.`
    );

    return {
      ok: false,
      message: `Kein SQL im Editor für ${envir} / ${exercise} vorhanden.`,
      exerciseContext,
      checkContext,
    };
  }

  try {
    const result = await db.exec(sql);

    setOutput(checkContext?.output, result);

    return {
      ok: true,
      message: `Exercise ausgeführt für ${envir} / ${exercise}.`,
      sql,
      result,
      exerciseContext,
      checkContext,
    };
  } catch (error) {
    setFeedback(
      checkContext?.feedback,
      `Exercise fehlgeschlagen für ${envir} / ${exercise}: ${error.message}`
    );

    return {
      ok: false,
      message: `Exercise fehlgeschlagen für ${envir} / ${exercise}.`,
      sql,
      error,
      exerciseContext,
      checkContext,
    };
  }
}

async function mountExercise(context, db) {
  await beforeEach({
    db,
    envir: context.envir,
    setupByEnvir: context.setupByEnvir,
  });

  if (!context.mount) return context;

  context.repl = document.createElement("pglite-repl");
  context.repl.pg = db;

  context.repl.dataset.envir = context.envir;
  context.repl.dataset.exercise = context.exercise;
  context.repl.dataset.hasCheck = context.hasCheck ? "true" : "false";

  if (context.initialSql) {
    context.repl.setAttribute("value", context.initialSql);
  }

  context.mount.appendChild(context.repl);
  bindExerciseRunHandler(context);

  return context;
}

async function mountExercises({
  cells,
  db,
  setupByEnvir,
  checkByExercise,
  exerciseStore,
}) {
  for (const cell of cells) {
    const context = createExerciseContext({
      cell,
      setupByEnvir,
      checkByExercise,
    });

    saveContext(exerciseStore, context);

    if (context.role !== "exercise") continue;

    const mountedContext = await mountExercise(context, db);
    saveContext(exerciseStore, mountedContext);
  }
}

async function run() {
  const cells = Array.from(document.querySelectorAll(".sqlrepl-cell"));
  const { setupByEnvir, checkByExercise } = collectCells(cells);
  const exerciseStore = createExerciseStore();

  await mountExercises({
    cells,
    db,
    setupByEnvir,
    checkByExercise,
    exerciseStore,
  });

  window.sqlreplExerciseStore = exerciseStore;
}

window.getExerciseContext = function (envir, exercise) {
  return getExerciseContext(window.sqlreplExerciseStore, envir, exercise);
};

window.getCheckContext = function (envir, exercise) {
  return getCheckContext(window.sqlreplExerciseStore, envir, exercise);
};

window.hasExerciseCheck = function (envir, exercise) {
  return hasExerciseCheck(window.sqlreplExerciseStore, envir, exercise);
};

window.getExerciseSql = function (envir, exercise) {
  const context = getExerciseContext(window.sqlreplExerciseStore, envir, exercise);
  return getExerciseEditorSql(context);
};

window.runCheckForExercise = async function (envir, exercise) {
  return await runCheckForExercise(window.sqlreplExerciseStore, envir, exercise);
};

window.runExerciseSql = async function (envir, exercise) {
  return await runExerciseSql(window.sqlreplExerciseStore, envir, exercise);
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", run);
} else {
  run();
}