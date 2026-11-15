# ADR 0050 — Docs pages are Markdown first, and each has a Markdown twin

## Status

Accepted (2026-11-14). Decided by the agent that rebuilt the docs site's look and agent-readiness, under the maintainer's delegation for that work; the maintainer can reopen it. Supersedes nothing. Amends [ADR 0041](0041-docs-diagrams-are-mermaid-rendered-by-pele.md): the `--pele-*` mapping and the font stacks moved out of `custom.css`. Amended 2026-11-15 by [ADR 0051](0051-docs-diagrams-are-askdbs-own.md): a `diagram` fence's twin prints the diagram's text alternative, where this ADR says each diagram is its Mermaid source; that holds only for the diagrams still in a `mermaid` fence.

## Context

The site has two readers: a developer looking at a page, and a coding agent that reads it as text (`apps/docs-site/STYLE.md`, "Readers"). Before this change a page opened with two raw HTML paragraphs (`doc-eyebrow`, `doc-lede`) and closed with an HTML grid of links (`home-path-grid`). An agent's only text view was `/llms-full.txt`, the whole site in one file, where each link card came out as a title run into its description. The look was Starlight's defaults with one 880-line stylesheet, colors written inline, and no web font loaded.

## Options considered

- **A. Keep HTML furniture, and serve only the site-wide `llms*.txt` files.** No new build step. But every page keeps layout markup in its source, and an agent that wants one page fetches all of them or parses HTML.
- **B. A Markdown twin made from each page's MDX source.** The source is already Markdown. But a page's meaning is partly in its components: `InstallTabs`, `Tabs`, `FileTree` and `Aside` render nothing useful as raw MDX, and imports and JSX would reach the reader.
- **C. Markdown furniture, and a twin made from the rendered page (chosen).** The source carries no layout HTML, and the twin shows what the page shows: each tab with its label, each code block with its language and title, each diagram as text and its caption (its Mermaid source at the time of this ADR; the text alternative of a `diagram` fence since ADR 0051).

## Decision

- **Page furniture is Markdown.** A page's first paragraph is its lede; a list whose every item is `[Title](/path/): description` renders as link cards (`plugins/remark-link-cards.mjs`); the breadcrumb comes from the page's sidebar groups. Raw HTML in a page is limited to `<figure>`, `<figcaption>` and `<details>`.
- **Every page has a Markdown twin** at its URL with the trailing slash replaced by `.md` (the home page's is `/index.md`), built from the rendered page by `src/pages/[...slug].md.ts` and `src/utils/html-to-markdown.ts`. Each page links its twin (`<link rel="alternate" type="text/markdown">`), offers it under the title ("Copy as Markdown", "Open in" an AI assistant), and `/llms.txt` lists the common tasks by their twins. `scripts/check-markdown-twins.mjs` fails the build for a page without a clean twin.
- **The look comes from design tokens.** `src/styles/tokens.css` holds every color, font, radius and shadow for both themes; `layout.css`, `content.css` and `home.css` read them. Inter, Manrope and JetBrains Mono are self-hosted through `@fontsource-variable/*`. `content.css` maps pele's `--pele-*` variables to the tokens, and `plugins/remark-mermaid.mjs`'s font stacks equal `--sl-font` and `--sl-font-mono` in `tokens.css` (a test keeps them equal).
- **The rules for authors live in `apps/docs-site/STYLE.md`**, and the working steps and design rules in the `docs-site` skill (`.agents/skills/docs-site/`).

## Consequences

- A page reads the same to both readers, so a fact that only layout shows is a defect: say it in words.
- The twin depends on the markup of Starlight's tabs, asides, code frames and file trees. A Starlight upgrade that changes one changes the twin; the converter's tests and the twin check catch it.
- The build writes one more file per page (58 today) and the site ships three font families, self-hosted. Pages make no request to a font host.
- A new top-level docs folder needs a documentation set in `src/utils/llms-txt.mjs`; a test fails until it has one.
