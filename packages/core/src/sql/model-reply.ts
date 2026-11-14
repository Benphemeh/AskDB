import type { DialectSpec } from "./dialect-spec.js";
import { extractSqlFromModelText } from "./extract-sql.js";
import { denylistFor } from "./validate.js";

const SQL_FENCE = /```(?:sql(?![\w-])|(?![a-zA-Z]))/i;

/**
 * The SQL in an NL→SQL model reply, for the read-only check to judge. A reply in the decline
 * format throws `QuestionDeclinedError` (see `extractSqlFromModelText`). A reply with no SQL
 * fence whose first word is neither `SELECT`/`WITH` nor a keyword the read-only check refuses
 * (prose such as "I can't answer that") gives `""`, which the check reports as `SQL_EMPTY`, the
 * model not returning SQL, instead of reading the prose as SQL. An unfenced write statement is
 * still SQL, so the check names its rule.
 */
export function readSqlFromModelReply(dialect: DialectSpec, text: string): string {
  const sql = extractSqlFromModelText(text);
  if (SQL_FENCE.test(text)) return sql;
  return startsLikeSql(dialect, sql) ? sql : "";
}

/** False only for text that opens with a word SQL can't start with; anything else is left to the checks. */
function startsLikeSql(dialect: DialectSpec, sql: string): boolean {
  const word = /^[(\s]*([a-zA-Z_]+)/.exec(sql)?.[1]?.toLowerCase();
  if (word === undefined) return sql.trim() !== "";
  return word === "select" || word === "with" || denylistFor(dialect).has(word);
}
