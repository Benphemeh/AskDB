---
"@askdb/studio": patch
"@askdb/docs-site": patch
---

Studio's **Suggest** now shows its drafts under the field they belong to, with **Use** on each draft and **Dismiss** for the set, instead of in a dialog, so you can review drafts for several fields at once (#952). A new **Suggest all empty fields** bar on the Enrichment tab drafts every empty description and alias of the open table and its columns, one model call per field: it states the number of calls and waits for you to confirm. With `modes.omitSensitiveFromPrompt` on, it skips sensitive columns and says how many, **Suggest** is disabled on a sensitive column instead of failing (#639), and while you've marked the table or a column sensitive without saving, every **Suggest** on that table waits for **Save**, because Suggest sends the saved schema. Nothing reaches the artifact until **Use** and **Save**. `GET /api/workspace` now returns `omitSensitiveFromPrompt`. The Studio tour and reference describe the inline drafts.
