import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const sql = readFileSync(0, "utf8"); // 0 is stdin
if (!sql.trim()) process.exit(1); // askdb ask failed, and printed why
const db = new DatabaseSync("shop.db", { readOnly: true });
console.table(db.prepare(sql).all());
