---
"@askdb/studio": patch
---

The Playground shows the model's reason in place of SQL when it declines a question the schema can't answer, or one that asks to change data, so Execute has nothing to run (#949). `POST /api/ask` answers it with `422`, with `error.message` set to `AskDB can't answer this as a read-only query: <reason>`.
