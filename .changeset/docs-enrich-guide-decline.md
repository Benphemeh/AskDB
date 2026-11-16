---
"@askdb/docs-site": patch
---

"Enrich your schema" step 2 now shows what AskDB 1.0.0-rc.2 does with the guide's question before enrichment: the default OpenAI model declines it and AskDB says what the schema is missing. The page used to show a guessed `status = 'active'` that returned `null`, and now names that as what an older or different model may do. Step 3's codes-only note matches the same run.
