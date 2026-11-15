---
"@askdb/docs-site": patch
---

Privacy model: the "No middlemen" diagram is now a Mermaid flowchart that draws both crossings (question and schema text out to your model provider, SQL back) and shows your application running the SQL on your own database. The hand-built `PrivacyFlowDiagram` component and its CSS are gone. Most docs pages no longer say which beta release brought a behavior: they state the current behavior. Lines about templates or bundles an old beta stored now say "a beta release" and link the upgrade note. Citations of the published security advisories stay as written.
