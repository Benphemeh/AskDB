---
"@askdb/introspect": patch
---

Introspection no longer writes `"sensitive": false` on tables, views and columns (#956). It can't know whether a table or column is sensitive, and the explicit `false` read as "not sensitive" even after a person marked the column sensitive in `tables/<name>.md`. `schema.json` now has a `sensitive` key only where a person set `"sensitive": true`: re-introspecting over an existing artifact keeps each `true` by ID and drops each `false`. A missing `sensitive` already meant not sensitive, so artifacts written by earlier versions, with their explicit `false`, load unchanged.
