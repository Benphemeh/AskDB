import { QuestionDeclinedError } from "../errors.js";

/** The fence tag the NL→SQL prompts ask the model to decline in (#949). */
export const DECLINE_FENCE_TAG = "askdb-decline";

// A reply cut off before the closing fence still declines: its reason runs to the end.
const DECLINE_FENCE = new RegExp("```" + DECLINE_FENCE_TAG + "(?![\\w-])[^\\S\\n]*\\n?([\\s\\S]*?)(?:```|$)", "i");

/**
 * A reply in the decline format the NL→SQL prompts ask for (an `askdb-decline` fence, closed
 * or not) throws `QuestionDeclinedError` with its reason on one line, before any SQL in the
 * reply is read, so a question that mixes a read with a change is declined as a whole.
 * Otherwise: prefer an explicitly `sql`-tagged fence; fall back to an untagged fence.
 * Never return a fence tagged with anything else (e.g. `json`, `sql-unbound`).
 * With no fence at all, the whole trimmed reply is the SQL.
 */
export function extractSqlFromModelText(raw: string): string {
  const text = raw.trim();
  const declined = DECLINE_FENCE.exec(text);
  if (declined) {
    const reason = declined[1]!.replace(/\s+/g, " ").trim();
    throw new QuestionDeclinedError(reason || "No reason given.");
  }
  const sqlTagged = /```sql(?![\w-])\s*([\s\S]*?)```/im.exec(text);
  if (sqlTagged?.[1]) {
    return sqlTagged[1].trim();
  }
  const untagged = /```(?![a-zA-Z])\s*([\s\S]*?)```/m.exec(text);
  if (untagged?.[1]) {
    return untagged[1].trim();
  }
  // A reply that only has non-sql tagged fences (json, sql-unbound, …) has no SQL.
  if (/```[a-zA-Z][\w-]*/.test(text)) {
    return "";
  }
  return text;
}

/**
 * Extract the ```sql-unbound fence from model text, if present.
 * Returns undefined when the fence is missing or empty.
 */
export function extractUnboundSqlFromModelText(raw: string): string | undefined {
  const text = raw.trim();
  const fence = /```sql-unbound\s*([\s\S]*?)```/im.exec(text);
  if (fence?.[1]) {
    const unbound = fence[1].trim();
    return unbound.length > 0 ? unbound : undefined;
  }
  return undefined;
}
