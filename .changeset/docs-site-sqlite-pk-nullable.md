---
"@askdb/docs-site": patch
---

The schema artifact format page's "What introspection writes" now says SQLite introspection writes `"nullable": false` on a primary key that aliases `rowid`, and keeps SQLite's reported nullability on other primary keys (#962).
