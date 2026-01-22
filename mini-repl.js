import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js"

export async function mountMiniRepl() {
    
    const root = document.createElement("div")

    
    // <textarea> for SQL-Query input
    const input = document.createElement("textarea")
    input.style.display = "block"
    root.appendChild(input)

    const btn = document.createElement("button")
    btn.textContent = "Run"
    btn.style.display = "block"
    root.appendChild(btn)

    // Creating a <pre> for showing the query results
    const out = document.createElement("pre")
    root.appendChild(out)
    
    async function run(sql) {
        return db.query(sql || "SELECT 1;")
    }

    btn.onclick = async () => {
        const res = await run(input.value)
        out.textContent = JSON.stringify(res, null, 2)
    }

    
    // Creating a empty WASM DB
    const db = new PGlite()

    // Creating a demo table for testing queris
    // Demo-Query: SELECT * FROM demo
    await db.exec("CREATE TABLE demo (id INT, name TEXT); INSERT INTO demo VALUES (1, 'Alice'), (2, 'Bob');")
    return root
}