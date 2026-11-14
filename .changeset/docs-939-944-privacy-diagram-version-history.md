---
"@askdb/docs-site": patch
---

Privacy model: the "No middlemen" diagram is now a Mermaid flowchart that draws both crossings (question and schema text out to your model provider, SQL back) and shows your application running the SQL on your own database. The hand-built `PrivacyFlowDiagram` component and its CSS are gone. Pages other than the upgrade notes no longer say which beta release brought a behavior. Lines about templates or bundles an old beta stored now say "a beta release" and link the upgrade note, and the SQL checks reference links the published advisories instead of listing them.
