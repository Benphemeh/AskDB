---
"@askdb/studio": patch
"@askdb/docs-site": patch
---

Studio's Playground now shows the sensitive-column warning for the SQL it generates, as `askdb ask` prints it: "Generated SQL references sensitive columns: public.customers.name. Review carefully before sharing or running this SQL outside AskDB." `POST /api/ask` returns the check `ask()` ran as `sensitiveGuardrail`, with the columns and, as `unresolvedScopeNote`, the check's note when it couldn't resolve every table, or `null` when the schema marks nothing sensitive. Before, Studio dropped the check's result, so a column marked sensitive in Studio looked unmarked until Execute ran the query (#957). The Studio page says so.
