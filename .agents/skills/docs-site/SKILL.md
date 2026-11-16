---
name: docs-site
description: Write, restructure or restyle AskDB's docs site (apps/docs-site, askdb.tools) so a page stays clear on a first read, visual and readable by agents. Use when editing a page under apps/docs-site/src/content/docs, adding a diagram or visual to one, or changing the site's theme, layout or components.
---

# AskDB docs site

The site has two readers: a developer looking at the page, and an agent reading its Markdown twin. A change is done when it is right for both. `apps/docs-site/STYLE.md` is the house style and the single source of truth for voice, terminology, page anatomy, components, visuals and diagrams. This skill adds the working steps, the design rules ([DESIGN.md](DESIGN.md)) and a screenshot tool (`shot.mjs` in this folder).

Pick your branch: a **page** (content under `src/content/docs/`) or the **look** (styles, layout, components).

## Page: write or revise one

1. **Read `apps/docs-site/STYLE.md` in full.** It is short, and every section binds. If the `diataxis-docs` skill is available, use it for the page's type and structure, with STYLE.md as its house style.
2. **Name the page's Diátaxis type and its reader's goal in one sentence.** A page is one type. Content of another type moves to that type's page and leaves a link.
3. **Trace every fact to source.** Each API, option, default, flag, path and error on the page matches `packages/*` or `apps/*` today. When you restructure a page, every fact, caveat and link that was on it is still on it or on the page you moved it to: diff the old and new text to check.
4. **Shape the page to "Page anatomy" in STYLE.md.** Lede first, then the body for its type, then "Use with your agent" on a task guide, then "Read next".
5. **Write for a first read** (STYLE.md, "Writing rules"). Section by section: the common case first in one or two plain sentences, then the exceptions in a list below or on the reference page; the reader's goal before the mechanism; one real example before each rule; two code spans a sentence where you can. Then run `node scripts/check-prose.mjs <page path under src/content/docs>` from `apps/docs-site` and split every sentence it lists.
6. **Give each section its form from the "Visuals" table in STYLE.md.** Walk the page section by section and ask what the content is: a flow, a boundary or an ownership split gets a diagram (a `diagram` fence: STYLE.md, "Diagrams"), files get a `FileTree`, a lookup gets a table, a file's contents get a titled code block. Prose that already reads well stays prose.
7. **Look at it.** Start the dev server (`pnpm docs:dev`, port 4310) and screenshot the page in both themes and at phone width, then read the images:

   ```bash
   node .agents/skills/docs-site/shot.mjs http://127.0.0.1:4310/guides/<page>/ /tmp/page-light.png --theme light --full
   node .agents/skills/docs-site/shot.mjs http://127.0.0.1:4310/guides/<page>/ /tmp/page-dark.png --theme dark --full
   node .agents/skills/docs-site/shot.mjs http://127.0.0.1:4310/guides/<page>/ /tmp/page-phone.png --width 390 --theme light --full
   ```

   `--selector "<css>"` scrolls to one element instead of capturing the whole page. Fix what you see: a diagram wider than the column, a table that scrolls sideways at 1440, a wall of text with nothing to anchor the eye, an aside stack.
8. **Read it as an agent.** `curl -s http://127.0.0.1:4310/guides/<page>.md` and read the Markdown top to bottom. Every tab label, code title, caption and diagram step must make sense there, with no fact left behind in layout.
9. **Cold read.** Give a fresh agent, on the cheapest model you have, only the page's twin and [COLD-READ.md](COLD-READ.md), and no other context. It answers questions a newcomer would ask and marks where it had to guess. Rewrite each place it guessed or got wrong, and run it again on a new agent. An agent that has seen the old page, the source or this conversation is not a cold reader.
10. **Run the checks** from `apps/docs-site`: `pnpm test` (the prose limits, the build, then links, anchors, exports, the error reference and the Markdown twins) and `pnpm lint`. Add a patch changeset for `@askdb/docs-site`.

Done when the cold reader answers every question from the page alone, the screenshots look deliberate in both themes and at 390 px, the twin reads cleanly, every fact from step 3 is accounted for, and both checks pass.

## Look: change the theme, layout or a component

1. **Read [DESIGN.md](DESIGN.md).** It holds the design principles, the file map and the rules a change must keep.
2. **Change tokens before rules, and rules before overrides.** A new color, radius or shadow is a token in `src/styles/tokens.css`, for both themes. A page never styles itself.
3. **Check every page type**, since one rule reaches all of them: the home page, `/quickstart/`, a guide (`/guides/multi-tenancy/`), a concept with a diagram (`/concepts/how-askdb-works/`), a table-heavy reference (`/reference/core-api/ask/`), `/studio/` and `/404`, in both themes, at 1440, 1024 and 390 px wide, with `shot.mjs`.
4. **Keep the agent's view whole.** If the change touches markup that `src/utils/html-to-markdown.ts` reads (tabs, asides, code frames, link cards, figures), read a twin (`/quickstart.md`) before and after.
5. **Run the checks** as in the page branch, step 10. Update STYLE.md when the change gives authors a new component or convention, and DESIGN.md when it changes a principle or the file map.

Done when every page type in step 3 holds up in both themes at all three widths, the twins are unchanged or better, and both checks pass.
