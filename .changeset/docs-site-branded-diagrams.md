---
"@askdb/docs-site": patch
---

Draw the docs site's diagrams with AskDB's own diagram kit. A `diagram` fence renders at build time to an inline SVG with a lane for each owner (your application, AskDB, your model provider, your database, the schema artifact), the AskDB mark on AskDB's lane, labelled links, groups, boundaries and decisions, and a stacked layout on phones. 22 flowcharts and sequence diagrams moved from Mermaid to the kit with no change to what they show; each has a text alternative that the page's Markdown twin prints. The Quickstart's ER diagram and the package dependency graph stay Mermaid (ADR 0051).
