---
"@askdb/sqlite": patch
---

SQLite introspection now writes `"nullable": false` for an `INTEGER PRIMARY KEY` column, so the prompt reads `id INTEGER (PK)` instead of `id INTEGER (PK NULL)` (#962). SQLite's `PRAGMA table_info` reports such a column as nullable unless `NOT NULL` is written out, but it aliases `rowid` and can never hold NULL. Other primary keys keep the nullability SQLite reports: on a rowid table they do accept NULL, an old SQLite bug kept for compatibility, and a `WITHOUT ROWID` table's key is already reported as `NOT NULL`.
