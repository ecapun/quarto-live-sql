# Quarto Live SQL

Minimaler, browserbasierter SQL-REPL für Quarto Live.  
PostgreSQL läuft vollständig im Browser (PGlite/WASM).

## Ausführung der Applikation

**Voraussetzung:** Quarto installiert  
https://quarto.org/docs/get-started/

In das Projekt-Root-Verzeichnis wechseln und im Terminal ausführen:

```bash
quarto preview main.qmd
```
Die hauptsächlich verwendeten Dateien sind main.qmd und mini-repl.js.
Alle weiteren Dateien dienten nur zu Experimentierzwecken.
