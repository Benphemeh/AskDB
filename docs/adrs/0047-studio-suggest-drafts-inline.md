# ADR 0047 — Studio shows Suggest drafts inline, and drafts a table's empty fields only after stating the calls

## Status

Accepted (2026-11-14). The coordinator chose option B on #952 under the 2026-11-05 arrangement (a two-way call the maintainer can reopen). Implemented in PR #980.

## Context

Studio's **Suggest** opened one app-wide modal dialog with 1–3 drafts for one field. A table with five columns took five or more trips through the dialog, the dialog covered the column being described, and drafts for different fields couldn't be compared. The Overview's **Draft enrichment** button promised bulk drafting that didn't exist (#951). Each draft is one model call, and with `modes.omitSensitiveFromPrompt` on, `POST /api/suggest` refuses a sensitive column (#639, ADR 0026).

## Options considered

- **A. Inline drafts.** Drafts appear under the field they belong to, with **Use** and **Dismiss**, for several fields at once. Still one call per field, one field at a time.
- **B. A, plus "Suggest all empty fields" for the open table (chosen).** One action requests a draft for every empty description and alias of the table and its columns. It costs one model call per field, so it states the count and waits for confirmation.
- **C. Keep the dialog.** Rejected: it's the friction the issue reports.

## Decision

Each field with **Suggest** shows its drafts inline, keyed by table, column and field, until **Use** (which fills the unsaved draft) or **Dismiss**. Nothing reaches the artifact until **Save**, so "you confirm every draft before it lands" still holds. **Suggest all empty fields** covers the open table's empty descriptions and aliases, not its primary entity or common query language. It states the number of calls and the sensitive columns it skips, runs only after confirmation, and makes the calls one at a time. Under `omitSensitiveFromPrompt`, Studio doesn't send a column the saved artifact or the unsaved draft marks sensitive. Because every suggestion's prompt is built from the saved artifact, Suggest on a table waits for **Save** while the draft marks the table or a column sensitive that the saved artifact doesn't.

## Consequences

- `GET /api/workspace` returns `omitSensitiveFromPrompt`, so the browser can skip the columns the server would refuse. The server's refusal stays the guard.
- A wide table can mean many model calls; the count shown before the run is the control, and there is no batch endpoint.
- The Overview's **Enrich tables** button still only opens the Tables view; pointing it at this flow is a separate change.
