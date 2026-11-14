---
"@askdb/studio": patch
---

Studio's Overview button **Draft enrichment** is now **Enrich tables**, without the sparkle icon that marks AI features, because it opens the Tables view and drafts nothing (#951). The **Pending enrichment** card's row link reads **Enrich** for the same reason. The Overview subtitle now shows the schema's dialect and id, such as `sqlite · askdb`, instead of the AI provider's name with `postgres` as the fallback (#963). On a window 960 px wide or narrower, the Tables and Concepts lists open as a drawer from a **Tables** or **Concepts** button in the view header, instead of disappearing with no way to reach them (#954).
