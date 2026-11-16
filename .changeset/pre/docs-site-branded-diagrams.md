---
"@askdb/docs-site": patch
---

Draw the docs site's diagrams with AskDB's own diagram kit. A `diagram` fence renders at build time to an inline SVG with a lane for each owner (your application, AskDB, your model provider, your database, the schema artifact), the AskDB mark on AskDB's lane, labelled links, groups, boundaries and decisions, and a stacked layout on phones. 23 of the site's 25 diagrams moved from Mermaid to the kit, 18 as flows and 4 as sequences, with no change to what they show; each has a text alternative that the page's Markdown twin prints. Two stay Mermaid by design: the Quickstart's ER diagram and the package dependency graph (ADR 0051).
