---
"@askdb/docs-site": patch
---

The schema artifact format, introspect API and introspect-without-a-connection pages now say introspection writes no `"sensitive": false`: `schema.json` has a `sensitive` key only where a person set `"sensitive": true`, re-introspection keeps each `true` and drops each `false`, and an older artifact's explicit `false` still loads (#956).
