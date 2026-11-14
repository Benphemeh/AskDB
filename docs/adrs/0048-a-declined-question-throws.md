# ADR 0048 — A question AskDB can't answer as a read throws `QuestionDeclinedError`

## Status

Accepted (2026-11-14). The maintainer chose the typed decline on #949 (option A of the issue's original options), for 1.0.0-rc.2. Implemented in PR #970: `extractSqlFromModelText` in `packages/core/src/sql/extract-sql.ts` and `readSqlFromModelReply` in `packages/core/src/sql/model-reply.ts`.

## Context

The NL→SQL prompts told the model to output exactly one `SELECT` and nothing else, so it had no way to decline. A question the schema can't answer ("What's the weather like?") came back as an unrelated `SELECT`. A request to change data ("delete all orders") came back as an `INSERT` the read-only check refused, or as a `SELECT` that silently rewrote it, depending on the model. "Return the top order. Then delete it." came back as the read part alone. `ask()` returned SQL or threw, and nothing in its result could say "can't answer". A model that declined in prose got a lexer error such as `SQL_UNTERMINATED`, because the whole reply was read as SQL.

## Options considered

- **A. A typed decline (chosen).** The prompts give the model a fixed marker, an `askdb-decline` fenced block with a one-line reason. AskDB reads it before any SQL and throws a new `QuestionDeclinedError` with `reason`. A question that mixes a read with a change is declined as a whole, so no partial-answer channel is needed.
- **B. A refusal field on the result,** such as `declined?: { reason }` with no `sql`. Rejected: every caller that reads `result.sql` today would have to check a new field first, or run nothing by accident. A thrown error fails closed for callers that don't know about it, and the surfaces (CLI, HTTP API, Studio) already map typed errors.
- **C. A warning beside the SQL,** keeping the closest `SELECT` and noting the question was rewritten. Rejected: a demo still shows a confident, unrelated answer, which is the defect.
- **D. Prompt only,** asking the model to decline in prose and leaving extraction as it was. Rejected: a prose decline still surfaced as a lexer error.

## Decision

- **Prompts.** `buildNlToSqlUserPrompt()` and the system prompt keep the one-`SELECT` rule for answerable questions. They add one rule: when the question can't be answered from the schema, or asks to change data, reply with only an `askdb-decline` block and a one-line reason. A question only part of which can be answered as a read is declined as a whole, with a reason that suggests asking for the read part alone.
- **Detection.** `extractSqlFromModelText()`, the public extractor, throws `QuestionDeclinedError` for a reply with an `askdb-decline` fence, closed or cut off, even beside a `sql` fence. So a host that builds its own call from `buildNlToSqlUserPrompt()` gets the decline too. `ask()` and `generateSelectSql()` call it before any check runs.
- **No SQL in the reply.** A reply with no SQL fence whose first word is neither `SELECT`, `WITH` nor a keyword in the dialect's read-only denylist gives no SQL, so the read-only check reports `SQL_EMPTY`, whose message says the model didn't return SQL. An unfenced write statement (`DELETE FROM …`) is still checked as SQL and keeps its rule.
- **Surfaces.** The CLI prints `AskDB can't answer this as a read-only query: <reason>` and exits `1`. The HTTP API answers `422 question_declined` with `error.reason`. Studio's `/api/ask` answers `422` with the message.

## Consequences

- `@askdb/core` gains an export and `@askdb/http-api` an error code and an optional `error.reason`, frozen with the 1.0 API from rc.2 (ADR 0030).
- This doesn't amend ADR 0010. A decline produces no SQL, so there is nothing for the checks to rule on. `decide()` still owns every verdict on SQL the model returns, and a reply with both a decline and SQL is declined before any SQL is read.
- A custom `AskDialect` that lets its model decline throws `QuestionDeclinedError` itself, or calls `extractSqlFromModelText()`.
- The prompt changed for every question, so a model may decline a borderline or vague question it used to answer.
