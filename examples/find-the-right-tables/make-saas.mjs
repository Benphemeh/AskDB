import { readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

rmSync("saas.db", { force: true });
new DatabaseSync("saas.db").exec(readFileSync("saas.sql", "utf8"));
console.log("Created saas.db: 63 tables");
