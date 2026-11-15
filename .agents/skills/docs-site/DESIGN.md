# Docs site design rules

Reference for changing how the docs site looks. The values live in the stylesheets; this file holds what they can't say: the principles, where things are, and the rules a change must keep.

## Principles

- **A sheet on a canvas.** The page is a neutral canvas (`--ask-bg`). The content sits on one raised sheet (`--ask-surface`, a hairline border, a large radius). The sidebar and the table of contents sit on the canvas with no box of their own. A new element inside the sheet is flat, or a card with a hairline border: never a second raised layer.
- **Crimson marks what is current or clickable.** The accent (`--ask-accent`) is for links, the active sidebar and table-of-contents entries, the primary button and focus. Status has its own hues (`--ask-note`, `--ask-tip`, `--ask-caution`, `--ask-danger`, `--ask-ok`). Decoration uses the neutrals.
- **Three typefaces, three jobs.** Manrope for headings (`--ask-font-display`), Inter for text (`--sl-font`), JetBrains Mono for code (`--sl-font-mono`). All three are self-hosted through `@fontsource-variable/*`: the site makes no request to a font host.
- **Whitespace before boxes.** Separate sections with space and a heading. Reach for a border only for something the reader acts on or scans as a unit: a code block, a table, a card, a diagram.
- **The lede carries the page.** The first paragraph is set larger and muted, right under the title and the page actions. Everything above the lede comes from the page's sidebar position and front matter.
- **Both themes are first-class.** Every color is a token with a dark and a light value. Text meets WCAG AA contrast on the canvas and on the sheet in both.
- **Calm motion.** Transitions are short and stop under `prefers-reduced-motion`. Every interactive element has a visible focus ring.
- **The page works as Markdown.** Each page has a Markdown twin built from its rendered HTML. Structure that carries meaning stays in the markup, and layout only arranges it.

## File map

All paths are under `apps/docs-site/`.

| Path | Holds |
|---|---|
| `src/styles/tokens.css` | Every color, font, radius, shadow and layout width, for both themes, and the mapping onto Starlight's `--sl-*` variables |
| `src/styles/layout.css` | Site header, sidebar, the sheet, table of contents, page header, pagination, badges, focus rings |
| `src/styles/content.css` | Everything inside a page: lede, headings, links, code, tabs, asides, tables, link cards, diagram figures and the `--pele-*` mapping, images, Starlight's `Steps`, `FileTree` and cards |
| `src/styles/home.css` | The home page |
| `src/components/overrides/` | Starlight component overrides: `Header`, `PageTitle` (breadcrumb, title, page actions), `Footer`, `Hero`, `SkipLink` (the hidden hint for agents) |
| `src/components/PageActions.astro` | "Copy as Markdown" and the "Open in" menu |
| `src/components/AgentPrompt.astro` | The "Use with your agent" block |
| `src/components/HomeHeroDiagram.astro` | The home page's hero art: one inline SVG colored from the tokens |
| `plugins/remark-link-cards.mjs` | Marks `[Title](/path/): description` lists as link cards |
| `plugins/remark-diagram.mjs`, `plugins/diagram/` | AskDB's own diagrams: parses a `diagram` fence, lays it out (lanes, or a stack on a phone) and draws inline SVG with the actor icons and AskDB's mark |
| `plugins/remark-mermaid.mjs` | Renders the `mermaid` fences that remain (an entity-relationship diagram, a dependency graph) to inline SVG with pele |
| `src/pages/[...slug].md.ts`, `src/utils/html-to-markdown.ts` | The Markdown twin of every page |
| `src/routeData.ts` | Head entries per page: the Markdown alternate link and JSON-LD |
| `src/utils/llms-txt.mjs` | What `/llms.txt` and the documentation sets say |
| `astro.config.mjs` | The sidebar, `customCss` order, Expressive Code themes, component overrides |

## Rules a change must keep

- **Tokens only.** A stylesheet rule or a component reads `var(--ask-*)` or `var(--sl-*)`. A literal color, font name or shadow appears in `tokens.css` and nowhere else, once per theme.
- **Styles are unlayered.** Starlight's own CSS sits in cascade layers, so a plain rule in these files wins without `!important`. Component-scoped `<style>` blocks are for a component's own parts, with tokens.
- **A diagram shows ownership.** Each actor has a lane, an icon and a fixed place; AskDB's lane carries the mark and the accent, and no other lane or step does. A new kind of diagram keeps that grammar: add a layout to `plugins/diagram/`, not a second look.
- **Diagram text is measured, not guessed.** `plugins/diagram/text.mjs` estimates each line's width from a table of the fonts' advance widths, a little wide on purpose, and wraps to the box. Its tests assert that no line in either layout is wider than its box. Change the fonts in `tokens.css` and that table goes with them.
- **Diagram colors come from the theme.** `content.css` styles the kit's `dg-*` classes from the tokens, and maps pele's `--pele-*` variables for the Mermaid diagrams that remain. The plugin writes no color. `plugins/remark-mermaid.mjs` passes pele the font stacks, and its test compares them with `--sl-font` and `--sl-font-mono` in `tokens.css`.
- **AskDB's mark is one drawing.** `plugins/diagram/icons.mjs` holds it as vector, redrawn from `docs/assets/brand/light-icon.png`. Reuse it from there.
- **Markup the twin reads stays stable.** `html-to-markdown.ts` reads Starlight's tab, aside, code-frame and heading markup, the `link-card-sep` span and `figure > svg.pele`, and the `dg-text-alt` list inside `.askdb-diagram`. Rename or restructure one and the twin changes: its tests in `src/utils/` and `scripts/check-markdown-twins.mjs` say how.
- **The hidden agent hint stays first in `<body>`,** `aria-hidden`, with no links in it.
- **No new runtime JavaScript for looks.** The page actions, the copy buttons and the theme control are the only scripts. A visual effect is CSS.
- **Phone first for anything wide.** A table or a code block scrolls inside itself. The page never scrolls sideways at 390 px.

## Where the look came from

The model was the Prisma docs (November 2026): content on a raised sheet, a display face for headings, a muted lede under the title, page actions for agents, an underline tab strip joined to its code block, and a quiet sidebar with a marker for the current page. AskDB keeps its own crimson, its logo and its neutral palette. When a new element needs a look, check how a current, well-made docs site solves it, then build it from these tokens.
