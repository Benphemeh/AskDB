---
"@askdb/docs-site": patch
---

New agent skill at `/skills/askdb-enrich-schema/SKILL.md`, linked from `/AGENTS.md`. After `askdb introspect`, it walks a user's coding agent through enriching the schema. The agent marks sensitive columns, finds coded values, date pairs, money columns and business terms, asks the user targeted questions, and writes only `tables/*.md` and `concepts.md`. It reads names and types, never rows, keeps sensitive column names out of what it writes, and checks its work with `askdb bundle` and a few `askdb ask` questions. The docs-site link check now also checks the site paths written in `/AGENTS.md` (#958).
