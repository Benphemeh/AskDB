---
"@askdb/docs-site": patch
---

The Quickstart explains the config it shows (the `introspection`, `ai` and `rag` blocks, and why only the API key goes in `.env`), says why it uses OpenAI and what to change for Anthropic or Google, and moves the pnpm and Yarn release-age note into their tabs. It adds a diagram of the shop database, shows what the model receives for the tutorial's question, points readers who prefer a browser at Studio's guided setup, and pipes `askdb ask` into a `run-query.mjs` that reads the SQL from stdin instead of copying it into `query.sql` (#936, #932, #935, #948, #933, #938, #943).
