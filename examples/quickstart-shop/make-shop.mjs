import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

new DatabaseSync("shop.db").exec(readFileSync("shop.sql", "utf8"));
console.log("Created shop.db");
