---
"@askdb/core": minor
---

`ask()` and `generateSelectSql()` decline a question the schema can't answer, or one that asks to change data, instead of returning unrelated or rewritten SQL (#949). The NL→SQL prompts tell the model to reply with an `askdb-decline` fenced block holding a one-line reason, and to decline a question that mixes a read with a change as a whole. `extractSqlFromModelText()` reads that block, closed or cut off, before any SQL in the reply (so a host calling it with `buildNlToSqlUserPrompt()` gets the decline too), and `ask()` and `generateSelectSql()` throw the new export `QuestionDeclinedError` before any check runs. It extends `AskDbError` and carries `reason`, and its message is `AskDB can't answer this as a read-only query: <reason>`.

A model reply with no SQL fence that opens with a word SQL can't start with (prose such as "I can't answer that") is now reported as `SqlValidationError` `SQL_EMPTY`, whose message now reads `The model didn't return SQL: …`, instead of a rule such as `SQL_UNTERMINATED` from reading the prose as SQL. An unfenced statement that starts with `SELECT`, `WITH` or a keyword the read-only check refuses (`DELETE FROM …`) is checked as before. Questions that produce SQL return the same result as before.

Upgrade notes: code that switches over `ask()`'s error types can add a case for `QuestionDeclinedError`.
