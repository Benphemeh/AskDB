---
"askdb": patch
"@askdb/studio": patch
---

`askdb ask` and Studio's Playground now end the sensitive-column warning with "Review carefully before sharing or running this SQL.", without "outside AskDB", which implied AskDB can run SQL. The Playground subtitle mentions running SQL only when Studio execute is on and has a connection, and Studio's code and SQL blocks no longer draw `<=` and `!=` as one joined glyph (#1015).
