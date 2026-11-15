# AskDB docs house style

Project preferences for the AskDB docs site (askdb.tools). Agents writing docs with a Diátaxis workflow read this as the house style; anything here overrides the workflow's defaults.

## Readers

In priority order (from `docs/mission.md`):

1. **Builders and integrators** — engineers embedding AskDB in a Node app, CLI workflow, or HTTP service. They own schema supply, API keys, execution, modes, and tenant rules.
2. **Agents** — coding assistants implementing AskDB in another project. They read the site and `public/AGENTS.md` (served at `/AGENTS.md`) and need stable, exact APIs.
3. **Askers** — analysts using an app that already integrated AskDB. The site rarely addresses them directly; Studio pages come closest.

## Voice

- Second person ("you"); "we" only inside tutorials, as the teacher alongside the learner.
- US spelling. Sentence-case headings. No emoji.
- The register follows the page type. Reference is austere and neutral. How-to guides are direct. Tutorials and explanation pages may be warmer and more discursive: a tutorial can point out what the learner should notice, and an explanation can weigh alternatives and give the project's view.

## Writing rules

The site follows ASD-STE100 (Simplified Technical English) about 80% of the way. Full STE reads dry, so the site keeps the STE rules that make text clear and softens the rest.

**Write for a first read.** A reader meets a page once, in order, to do one thing. These five rules come first, and the rest serve them:

- **The main path first, the exceptions after.** Open each section with the common case, in one or two sentences a newcomer can act on. A default, a threshold, an edge case or a failure mode that most readers won't meet goes below it, in a short list, or on the reference page with a link. Every one of them stays in the docs: move it, don't drop it.
- **The reader's goal before the mechanism.** Say what the reader wants or what goes wrong, then what the software does about it: "To keep one tenant from seeing another's rows, declare a tenant policy", not "`loadSchema()` reads `tenant-policy.md`".
- **One example before the rule.** Show a real question, table, file or result, then state the general case. On a concept page, each idea gets one.
- **Few names per sentence.** A sentence in a tutorial, guide or concept page has two code spans or fewer where it can, and never more than three. A sentence that needs more is a table, a list or a code block.
- **Short sentences.** No sentence is over 30 words, on any page. Aim for about 20 in a step and 25 in a description.

`scripts/check-prose.mjs` counts the last two, and `pnpm test` fails on a sentence over either limit. It can't judge the first three: the cold read in the `docs-site` skill does.

**Keep:**

- **One idea per sentence.** When a sentence joins two ideas with "and", "which" or a semicolon, split it or make a list.
- **Active voice.** Name the actor: "`ask()` throws `TenantScopeError`", not "`TenantScopeError` is thrown".
- **Present tense.** Say what the software does: "returns", not "will return".
- **Commands for steps.** Start each step with a verb: "Run `askdb init`." Put a condition before the command: "If you use pnpm 11, approve the build."
- **One word for one meaning.** Use the terms in the [terminology table](#terminology) every time. Don't vary a term for style.
- **Numbers, not adjectives.** "1 MiB", "30 chunks", "60 s", not "large", "a few" or "quickly".
- **A risk first, with its reason.** Put the hazard before the instruction it qualifies, and say why: "Run generated SQL under a read-only role. The SQL checks are heuristics, not a security boundary."
- **No intensifiers or hedges.** Leave out "very", "just", "simply", "actually", "really" and "extremely". Instead of "usually" or "typically", state the condition under which something is true.

**Soften:**

- **Sentence length has a target and a cap.** The target is about 20 words in a step and 25 in a description; the cap is 30. When a split would separate a condition from its result, put the condition in its own sentence first: "Some schemas have a tenant policy. For those, …".
- **Write for flow.** Contractions ("don't", "it's"), connecting words ("so", "but", "then", "because") and varied sentence openings are fine.
- **Common phrasal verbs are fine:** "set up", "log in", "look up", "fall back".
- **Warmth depends on the page type.** Tutorials and explanation pages may be warmer and more discursive than reference pages (see [Voice](#voice)).

**Drop:**

- **STE's approved-word dictionary.** It can't hold API names, product terms or the terminology table. Use the word a developer expects.

## Terminology

| Use | Instead of | Notes |
|---|---|---|
| schema artifact | describable schema, Schema v2 | Say "v2" only where the format version matters (`"version": 2` in `schema.json`). See #273. |
| reviewed schema context | describable context | |
| natural-language analytics | NL-to-SQL | In introductory sections; "NL-to-SQL" is fine in reference. |
| AskDB returns SQL | execution boundary | In beginner-facing sections. |
| your application owns execution | host owns execution | |
| large schemas | RAG | Until the concept is introduced. |
| the read-only check, the tenant check, the sensitive check; together, the SQL checks | validator, lint, guardrail (in prose) | API names keep "guardrail" (`sensitiveGuardrail`, `validateTenantGuardrails`). Say the checks are heuristics where it matters, but don't use "heuristic checks" as their name. |
| engine package | adapter | `@askdb/postgres`, `@askdb/mysql`, `@askdb/sqlite`, `@askdb/sqlserver`. "Connector" is fine for what `create*Connector` returns. |
| Playground | Ask panel | Studio's view for asking a question. |

Introduce these only after the reader understands the product — fine in concept and reference pages, too early on Start pages and the first guides: RAG, BYO runtime, MCP, bounded results, headless contracts, dialect-agnostic, optional peers, runtime snapshot.

Model wiring has two first-party paths: `@askdb/ai`'s built-in providers (`createAiRegistry()`, `createAskDb({ config })`) and a raw Vercel AI SDK `LanguageModel` passed to `ask()`. Present both as equally supported; choose between them by who owns provider config. Name the deprecated `@askdb/ai-*` shims only in deprecation notes and migration tables.

## Site structure

| Sidebar section | Diátaxis type | Folder |
|---|---|---|
| Start | Tutorials (Quickstart, then Chart your first answer), plus orientation pages, each of one type: Overview (explanation), Install (how-to), Studio (a tutorial-style tour of its views) | root |
| Guides | How-to guides, in groups by the reader's task: Build, Run in production, Tenancy, Maintain, Integrations | `guides/`, `guides/integrations/` |
| Concepts | Explanation | `concepts/` |
| Reference | Reference, in groups: Surfaces (CLI, HTTP API, configuration), Formats and rules, Packages and releases, APIs | `reference/` |

A sidebar group with no pages yet stays out of `astro.config.mjs` until its first page lands.

Every page is exactly one Diátaxis type. A sentence that belongs to another type moves to that type's page and is replaced by a link.

Page titles follow the type:

- **Tutorial:** what the learner builds ("Quickstart" is the one exception, for findability).
- **How-to guide:** the reader's goal as a command ("Deploy AskDB as an HTTP service"). The sidebar label may shorten it.
- **Explanation:** a noun phrase that reads after "About" ("Safety boundaries", "The schema artifact").
- **Reference:** the thing it describes ("CLI reference", "@askdb/core API reference").

The sidebar is hand-written in `astro.config.mjs`; every new page needs an entry there. A page that moves or is deleted gets an entry in `redirects` in the same file, so old links and bookmarks still land. Links in the docs go to the new path, since a redirect drops the `#anchor`.

`src/utils/llms-txt.mjs` holds what `/llms.txt` says: the site summary, the common tasks and the four documentation sets (Start, Guides, Concepts, Reference). Update it when sections change. A new top-level folder needs a set there, and a test fails until it has one.

## Page anatomy

Every page has the same parts, in this order. The page header (breadcrumb, title, "Copy as Markdown" and "Open in" actions) comes from the page's sidebar position and front matter, so the body starts at the lede.

1. **Front matter.** `title`, and a `description` of one sentence that states what the reader gets. Search results, link previews, `/llms.txt` and the page's Markdown twin all print it.
2. **Lede.** The first paragraph of the body, in plain Markdown, one to three sentences. Say what the page is for and what the reader has at the end. The site sets it larger, so nothing but imports may come before it: no heading, aside or component.
3. **Body.** Follow the page's Diátaxis type:
   - **Tutorial:** numbered `##` steps ("1. Create the database"), each ending on something the learner can see (output, a file, a screen). Close with what they built.
   - **How-to guide:** "Before you start" (a short list), numbered `##` steps, a step that verifies the result, then "If it fails" when there are known failures.
   - **Explanation:** one diagram or table for the central idea near the top, then prose sections.
   - **Reference:** a signature or usage block, then tables and short entries. No narrative.
4. **Use with your agent** (how-to guides and the tutorial; not lookup pages such as "Fix common errors"). A `## Use with your agent` heading, then an `<AgentPrompt>` with a prompt the reader hands to a coding agent. See [Components](#components).
5. **Read next.** A `## Read next` heading and a link list of two to four pages. See [Link cards](#link-cards).

Write page furniture in Markdown, not HTML. Raw HTML in a page is limited to `<figure>` and `<figcaption>` around a diagram or image, and `<details>` where a long block needs to fold.

### Link cards

A list in which every item is `[Title](/path/): One-sentence description.` renders as a grid of cards. Use it for "Read next" and for hub pages that route to other pages. It is the format `/llms.txt` uses, so the Markdown twin carries the same lines.

```md
## Read next

- [Scope to a tenant hierarchy](/guides/tenant-hierarchy/): Let a user see a tenant and everything beneath it.
- [Tenant policy format](/reference/tenant-policy/): Every policy field, and what the tenant check requires.
```

A list with any other item shape stays a plain list. `plugins/remark-link-cards.mjs` does the marking.

## Machine-readable docs

Agents are the site's second reader, so each page must read well as plain Markdown.

- Every page has a Markdown twin at its URL with the trailing slash replaced by `.md` (`/guides/embed-in-node.md`; the home page's is `/index.md`). `src/pages/[...slug].md.ts` builds it from the rendered page, and `scripts/check-markdown-twins.mjs` checks every page has one.
- The twin prints tabs as labelled blocks, code with its language and `title`, asides as labelled quotes, link cards as their Markdown lines, and a diagram as its text alternative plus its caption: each step with its owner and where it leads, or each message with who sends it. A Mermaid diagram prints as its source. So tab labels, code titles, captions and step labels must make sense as text.
- Don't carry meaning in layout alone. A fact that only a color, an icon or a position shows is missing from the twin: say it in words too.
- `/llms.txt`, `/llms-full.txt`, `/llms-small.txt` and the per-section sets come from `starlight-llms-txt`. `public/AGENTS.md` is the map for an agent that implements AskDB in another project. Keep both accurate when a page moves or an API changes.

## Tooling

- Docs tool: Astro Starlight
- Content root: `apps/docs-site/src/content/docs/`
- Navigation file: `apps/docs-site/astro.config.mjs` (`sidebar`)
- Dev server: `pnpm docs:dev` (127.0.0.1:4310)
- Build / check: `pnpm docs:build`; `pnpm -C apps/docs-site test` (checks the prose limits, builds the site, then fails on an internal link to a missing page or `#anchor`); `node scripts/check-prose.mjs guides/<page>.mdx` checks one page's sentences; `pnpm -C apps/docs-site lint` (`astro check`)
- Look and feel: design tokens in `src/styles/tokens.css`; layout, prose and home styles in `layout.css`, `content.css` and `home.css` beside it. A page never sets its own colors, fonts or spacing. The `docs-site` skill (`.agents/skills/docs-site/`) has the design rules and a screenshot tool for checking a page in both themes.
- Source lines: one line per paragraph, soft-wrapped by the editor (see `AGENTS.md`).
- Internal links: root-absolute (`/guides/embed-in-node/`); a remark plugin rebases them.

## Components

- `InstallTabs` (`<InstallTabs pkgs="…" />`) for every package install. Two pages use hand-written `Tabs` (`syncKey="pkg"`) for npm, pnpm and Yarn instead: the Quickstart, since its install is a dev dependency, and "Chart your first answer", since its Yarn tab adds `zod` and runs the script with `yarn node`. `InstallTabs` can't express either.
- `Tabs` with a `syncKey` so choices persist site-wide: `pkg` (labels exactly npm / pnpm / yarn), `engine` (labels exactly PostgreSQL / MySQL / SQLite / SQL Server, in that order; a tab covers MariaDB under MySQL; add engine tabs wherever a page shows code that differs by engine), `wiring` (config-driven vs direct model).
- `Aside` for a real hazard or a fact the reader must not miss: `note`, `tip`, `caution`, `danger`. At most two on a page. A prerequisite goes in "Before you start", not an aside.
- `Steps` (from `@astrojs/starlight/components`) for a short procedure inside a section. A guide's main procedure uses numbered `##` headings instead, so each step is in the table of contents.
- `FileTree` for a directory layout, with a comment on each file that needs one.
- `Badge` for a status on a heading or in a table: `<Badge text="Experimental" variant="caution" />`. The sidebar entry of an experimental page carries the same badge (`badge` in `astro.config.mjs`).
- `AgentPrompt` (`src/components/AgentPrompt.astro`) for the "Use with your agent" block of a task guide, under a `## Use with your agent` heading, before "Read next". The slot is the prompt: plain paragraphs and lists, with blank lines inside the tags. Name pages by their absolute `.md` URL (`https://askdb.tools/guides/multi-tenancy.md`), state the goal, and repeat the constraints the guide sets (AskDB returns SQL, the application runs it).
- `ExampleLink` to point at a runnable example in the repo.
- A chart that an example drew is a static SVG for each theme, in `src/assets/charts/`. Show it in a `<figure class="doc-chart">` with two `Image`s from `astro:assets`: the light file with `class="dark:sl-hidden"` and the dark file with `class="light:sl-hidden"`, each with the same `alt`. Say in the `<figcaption>` what drew it and from which run. `guides/plan-a-chart.mdx` has the pattern; `examples/chart-a-result/draw-recorded.mjs` draws its two files.
- Diagrams are AskDB's own: a `diagram` fence, drawn as inline SVG at build time by `plugins/remark-diagram.mjs`, with a lane for each actor and AskDB's mark on its own. Pages ship no diagram JavaScript, and CI and the Pages deploy need no binary or browser. See "Diagrams" below.

## Visuals

Pick the form from what the content is. A page of prose with no visual is fine when none of these fits.

| The content is | Use |
|---|---|
| A flow, a boundary, or who owns what | A diagram |
| Files and folders | `FileTree` |
| A lookup: options, fields, flags, errors | A table |
| A comparison of two to four choices | A table, one column per choice |
| Variants of one code block | `Tabs` with a `syncKey` |
| A file's contents | A code block with `title="path/to/file"` |
| A change to code | A code block with `ins={…}` and `del={…}`, or a highlighted line `{3}` |
| What a command prints | A second code block, right after the command |
| A screen | A screenshot in `src/assets/`, inside a `<figure>` with a caption |

Tables:

- Four columns at most. Fold "required" into the default column (`required`), and put a long note under the table.
- Put the name first and the description last. Those two columns wrap; the ones between them don't.
- A table states facts. Explanation goes in the prose around it.

## Diagrams

A diagram shows who owns what: each actor (your application, AskDB, your model provider, your database, files on disk) has a lane with its icon, each step sits in its owner's lane, and a labelled link carries data from one step to the next. AskDB's lane carries its mark and the accent color, so every diagram on the site reads the same way.

- Draw a diagram when the page explains a flow, a boundary or an ownership split that takes more than three sentences to say. One diagram carries one idea, in nine steps or fewer. A second idea is a second diagram.
- Write the diagram in a ```` ```diagram ```` fence in the page, inside a `<figure>`, and end the figure with a `<figcaption>` that says what the diagram shows. Leave a blank line before and after the fence, or MDX doesn't render it.
- The first line is the kind. `flow` is steps in order, each owned by an actor. `sequence` is messages between actors.
- `title:` is the diagram's accessible name: one sentence. It is required.
- `lane <id> [<kind>]: Label | note` declares an actor, left to right. The kind picks the icon and defaults to the id: `app`, `askdb`, `model`, `database`, `files`, `person`, `agent`, `service`. A flow has four lanes at most, and a sequence five. Keep one actor in one lane across a page's diagrams. A lane and a step can't share an id. The note is what follows the first ` | ` outside backticks.
- `boundary Label: <lane> <lane>` frames neighbouring lanes, for "Your stack" and what is outside it.
- In a flow, `step <id> @<lane>: Label` puts a step on a new row. Start the line with `+` to put it on the previous step's row, for two inputs or for a call across two lanes. `group Label: <step> <step>` frames steps of one lane that are next to each other in it, such as the ones inside `ask()`; to frame whole lanes, use `boundary`. A long group label wraps and keeps every word.
- `decide <id> @<lane>: Question?` is a step that asks a question. Each link out of it is an answer, so each needs a label (`check -> commit: yes`).
- `a -> b: data` links two steps (or, in a sequence, sends a message between two lanes). `..>` draws it dashed: a reply, or an optional path. In a sequence, `a -> a: Label` is the actor's own step. In a flow, a link between two steps on one row can't have a third step between them: put one of the three on another row.
- Labels take `code` in backticks. Use the same words as the page: command names, package names and terms from "Terminology". Keep a step label under about 40 characters: the kit wraps it to its lane, and a long label makes a tall box. Write `\n` where a line must break, such as between two code names.
- A link's label sits on its own link, clear of every step and every other label, and wraps when it is long. Give each of two links out of one step its own label.
- Never write a coordinate, a size or a color. The kit lays the diagram out, and `src/styles/content.css` colors it from the design tokens, so it follows the light and dark toggle.
- Put notes for maintainers, such as the source file that proves what the diagram shows, on `#` lines inside the fence. They don't reach the page.
- A diagram the kit can't draw fails the build. The error names the page, the line and the reason: an undeclared lane, a link to a missing step, a missing title.
- The kit draws each diagram twice, and the page shows one by the column's width: lanes side by side, or on a phone one stack of steps, each tagged with its owner. Check the page at 390 px wide, in both themes.
- The page's Markdown twin prints the diagram in words and then the caption: each boundary with the lanes it holds, each lane's note, then each step with its owner and where it leads (a decision with its answers). So lane notes, step labels and link labels must read well as text.

```diagram
flow
title: Where AskDB stops and your application takes over.
# Source of truth: packages/core/src/ask.ts.
lane app: Your application
lane askdb: AskDB
step question @app: asks a question
step sql @askdb: generates and checks the SQL
step run @app: runs it under a read-only role
question -> sql
sql -> run: checked SQL
```

Two kinds of diagram have no actors, and stay [Mermaid](https://mermaid.js.org/) in a `mermaid` fence, rendered at build time by [pele](https://pele.run) (`plugins/remark-mermaid.mjs`): an entity-relationship diagram (the Quickstart's) and a dependency graph (the package reference's). For those, leave colors to the theme, keep the built SVG at 720 px wide or less, and put maintainer notes on `%%` lines. The home page's hero art (`src/components/HomeHeroDiagram.astro`) is a hand-drawn inline SVG.

## Code samples

- Give a block that shows a file its path: ```` ```ts title="askdb.config.ts" ````. Mark the lines a step adds or changes (`ins={4-6}`, `{3}`) when the block repeats code from an earlier step.
- TypeScript for library code; bash for commands. Standalone command snippets use `npx` (readers substitute `pnpm dlx` / `yarn dlx`); multi-command flows use `pkg` tabs.
- Samples show AskDB returning SQL; any execution runs through the reader's own connection (`pg`, Prisma, …), never through AskDB.
- Placeholders: environment variables (`process.env.OPENAI_API_KEY`) rather than inline fake keys.
- Configuration: point readers at the `askdb.config.ts` field, the `env("…")` name they choose for it, or the CLI flag. Other than `ASKDB_DEBUG`, AskDB reads no `ASKDB_*` variable from the shell (the config API reference says so), so don't present one as a variable the reader sets. `@askdb/ai`'s `ASKDB_AI_*` names are keys of the env map a host passes to it, and the docs name them that way.
- Variables in the reader's own code get neutral names (`DATABASE_URL`, not `ASKDB_DATABASE_URL`).

## Sources of truth

- Verify every API, option, default, flag, config key, route, and path against source in `packages/*` and `apps/*` before writing it. Never invent package names, APIs, or paths.
- Behaviour contracts: `docs/contracts/`; decisions: `docs/adrs/`; package boundaries: `docs/architecture.md`; product intent: `docs/mission.md`.
- The docs must never claim AskDB executes SQL, owns credentials, or trains on customer data.

## Process

- A public API change or new integration pattern ships with its docs update in the same PR.
- Docs vs behaviour discrepancies found while writing go to GitHub Issues with the `discrepancy` label (see `docs/agents/issue-tracker.md`); audits and multi-step docs plans go there with `plan` + `documentation`.
- Add a changeset for `@askdb/docs-site` (patch) with docs changes, like any package.
- New pages and restructures: propose the outline first. Edits to existing pages: proceed.
