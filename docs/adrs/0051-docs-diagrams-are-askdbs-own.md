# ADR 0051 — Docs diagrams are AskDB's own, drawn from a `diagram` fence

## Status

Accepted (2026-11-15). The maintainer asked for it: "We're using mermaid charts in many places in the site - they're kind of boring and generic, can we build our own charts using svgs and utilize the AskDB icon and logo where possible to make it more unique". Amends [ADR 0041](0041-docs-diagrams-are-mermaid-rendered-by-pele.md), which keeps the diagrams this one leaves to Mermaid.

## Context

The docs site had 25 diagrams, all Mermaid rendered by pele: 22 flowcharts, 2 sequence diagrams and 1 entity-relationship diagram. Almost every one makes the same point in a different place: who holds what. Your application holds the rows and the credentials, AskDB returns SQL, your model provider sees the prompt, your database enforces the boundary. A generic flowchart draws that as boxes of one kind, so the point lives only in the labels, and the diagrams look like any other project's. On a phone pele scales the whole drawing down, and a four-actor sequence ends up with text near 7 px.

## Options considered

- **A. Restyle pele's output.** Cheap, and the sources stay. But a stylesheet can't give an actor an icon or a lane, or lay a diagram out a second way for a phone.
- **B. Hand-draw each diagram as its own SVG component.** The most freedom. But 25 drawings with coordinates in them are 25 things to redraw when a step changes, and an agent editing a page can't safely move a box.
- **C. A small diagram kit of our own, with a declarative source (chosen).** Authors write actors, steps and links; the kit owns layout, wrapping, icons and color. One grammar across the site, and a wrong diagram fails the build.

## Decision

- **A flow or a sequence is a `diagram` fence**, parsed and drawn at build time by `plugins/remark-diagram.mjs` and `plugins/diagram/`. The source declares lanes (actors, each of a kind: `app`, `askdb`, `model`, `database`, `files`, `person`, `agent`, `service`), steps in a lane, groups, boundaries and labelled links. It holds no coordinate, size or color. `apps/docs-site/STYLE.md`, "Diagrams", is the authoring reference.
- **Ownership is the grammar.** Each actor has a lane, an icon and a place. AskDB's lane carries the brand mark and the accent color, and nothing else does. The mark is redrawn as vector in `plugins/diagram/icons.mjs` from `docs/assets/brand/light-icon.png`.
- **Two layouts from one source.** The kit draws lanes side by side for the content column, and a stack of steps, each tagged with its owner, for a narrow one. The figure is a CSS container and shows one of them. No text is drawn under 11 px.
- **Text fits by measurement.** There is no DOM at build time, so `plugins/diagram/text.mjs` estimates widths from a table of the fonts' advance widths and wraps each label to its box. Tests assert that no line in either layout is wider than its box.
- **A text alternative for both readers.** Each diagram carries a list (each step with its owner and where it leads, or each message with its sender), hidden from sight, read by screen readers, and printed by the page's Markdown twin in place of the picture (ADR 0050). The SVG's accessible name is the diagram's required `title:`.
- **Mermaid stays for diagrams with no actors:** the Quickstart's entity-relationship diagram and the package dependency graph. They are standard notations, a generic renderer suits them, and forcing them into lanes would say something false. ADR 0041 still governs them. The home page's hero stays a hand-drawn SVG.
- **Limits and forms.** A flow has four lanes at most and a sequence five. A group frames steps of one lane, and its label is a tab on the frame's edge. `decide` draws a step that asks a question, with each link out of it as an answer. A link's label is placed on its own link by a search that keeps it clear of every step, header and other label, and a long one wraps.
- **A diagram that can't be drawn fails the build**, naming the page, the line and the reason: an undeclared lane or step, a missing title, two steps in one cell, a group across lanes, a decision without labelled answers.

## Consequences

- The kit is code this repo owns: about 1,000 lines, with its tests in `plugins/remark-diagram.test.mjs`. A new shape of diagram is a new layout there, in the same grammar.
- The width table follows the fonts. A change to `--sl-font` or `--sl-font-mono` in `tokens.css` needs the table in `text.mjs` checked against a browser.
- A flow with four lanes leaves each lane about 130 px, so long step labels wrap to four or five lines. Authors keep labels short, or split the diagram.
- pele stays a dependency for two diagrams. If those are redrawn by hand one day, pele and ADR 0041 can go together.
- The existing Mermaid flowcharts and sequences convert page by page; until a page is converted its Mermaid diagram keeps rendering.
