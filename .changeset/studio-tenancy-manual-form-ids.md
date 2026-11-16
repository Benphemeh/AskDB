---
"@askdb/studio": patch
"@askdb/docs-site": patch
---

Studio's Tenancy **Configure manually** form now writes the root's tenant ID column as its stable ID from `schema.json` (`table:public.customers#id`), not its bare name (`id`). Before, a `strict` policy made there failed to save ("column id is not in schema.json"), and a `warn` one saved with an `orphaned_column_id` warning (#1014).

The form also declares scoped tables now: for each table, pick the column that holds the root's tenant ID, or leave it unscoped. It says that a table reaching the root through a join is added in `tenant-policy.md` or with **Draft with AI**, and that a table left neither scoped nor global stays unknown. The Studio docs page describes the form as it is.
