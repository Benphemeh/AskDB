---
"@askdb/core": patch
---

`suggestEnrichment()`'s system prompt, which Studio's **Suggest** uses, now tells the model not to restate the table or column name in a description and to start with what it holds, such as "One row per order placed …" (#953). `ask()`'s prompt prints a table description right under `TABLE <name>` and a column description on the column's own line, so a draft such as "The customers table stores …" repeated the line above and cost tokens on every `ask()`. The sensitive-column rules are unchanged.
