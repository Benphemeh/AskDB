---
"askdb": patch
---

`askdb ask` prints `AskDB can't answer this as a read-only query: <reason>` on stderr, and nothing on stdout, when the model declines the question because the schema can't answer it or it asks to change data (#949). The exit code is `1`, as for every error.
