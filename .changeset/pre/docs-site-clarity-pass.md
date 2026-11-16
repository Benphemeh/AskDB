---
"@askdb/docs-site": patch
---

Rewrite the docs' prose for a first read. Each section now opens with the common case, and defaults, thresholds and edge cases sit in a list under it. The reader's goal comes before the mechanism, terms are explained in a clause at first use, and concept pages lead with an example. No sentence is over 30 words, and no sentence outside the reference pages has more than three code spans: `scripts/check-prose.mjs` counts both, and the docs tests now fail on either. No page says less than it did. The pass also corrects four statements that disagreed with the code: a strict tenant policy fails to load on a missing column or foreign-key ID, not on a missing table; SQL Server's first driver marker is `@p0`; SQL Server refuses a `?` written against a name or number; and Studio's Suggest waits for an unsaved sensitive mark only while sensitive columns are kept out of prompts.
