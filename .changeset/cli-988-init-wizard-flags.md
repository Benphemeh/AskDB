---
"askdb": patch
---

`askdb init` in a terminal without `--yes` now uses the flags you pass as the wizard's answers and skips those questions, instead of ignoring them (#988). `npx askdb init --database mysql` used to open the wizard and write a PostgreSQL config; it now writes a MySQL one. `--database`, `--sqlite-file`, `--prisma-schema`, `--schema-out`, `--ai-provider`, `--rag-store` and `--studio-execute`/`--no-studio-execute` skip their questions, and `--connection-env`, `--ai-key-env`, `--ai-model-env` and `--pgvector-env` replace the env var names the wizard would use. With no flags, the wizard asks everything as before. No flag, exit code or JSON output changed.
