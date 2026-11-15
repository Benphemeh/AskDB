---
"askdb": patch
---

`askdb init` in a terminal without `--yes` now uses the flags you pass as the wizard's answers and skips those questions, instead of ignoring them (#988). `npx askdb init --database mysql` used to ask for the engine again, so accepting the wizard's default wrote a PostgreSQL config; it now skips that question and writes a MySQL one. `--database`, `--sqlite-file`, `--prisma-schema`, `--schema-out`, `--ai-provider`, `--rag-store` and `--studio-execute`/`--no-studio-execute` skip their questions, and `--connection-env`, `--ai-key-env`, `--ai-model-env` and `--pgvector-env` set the same env var names they set with `--yes`. The wizard's summary no longer calls those names defaults. With no flags, the wizard asks everything as before. No flag, exit code or JSON output changed.
