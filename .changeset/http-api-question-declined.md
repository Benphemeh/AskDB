---
"@askdb/http-api": minor
---

`POST /ask` answers a question the model declines with `422` and the new error code `question_declined`, with `error.reason`, the model's one-line reason, which `error.message` also ends with (#949). `AskHttpErrorResponse` adds `question_declined` to `error.code` and an optional `error.reason`.

Upgrade notes: clients that switch over `error.code` can add a case for `question_declined`.
