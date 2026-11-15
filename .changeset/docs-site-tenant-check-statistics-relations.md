---
"@askdb/docs-site": patch
---

The docs say the tenant check refuses a Postgres planner-statistics relation (`pg_stats`, `pg_statistic` and the extended-statistics ones) wherever the SQL names it, under every dialect: the core API reference's `UNCHECKABLE_RELATION` rule row, the tenant policy reference's "What the tenant check requires", the SQL checks reference and an upgrade note. "Enforce tenancy in the database" says Postgres hides a table's planner statistics from a role that table's row-level security applies to.
