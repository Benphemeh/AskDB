import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToMarkdown, mermaidSources, pageMarkdown } from "./html-to-markdown.ts";

const pageUrl = "https://askdb.tools/guides/multi-tenancy/";
const convert = (html, options = {}) => htmlToMarkdown(html, { pageUrl, ...options });

// The markup below is what Starlight, Expressive Code and the site's own plugins render, cut down.
const codeBlock = (language, lines, title = "") =>
  `<div class="expressive-code"><link rel="stylesheet" href="/_astro/ec.css"><script type="module" src="/_astro/ec.js"></script>` +
  `<figure class="frame not-content"><figcaption class="header"><span class="title">${title}</span><span class="sr-only">Terminal window</span></figcaption>` +
  `<pre data-language="${language}"><code>${lines
    .map(([text, mark = ""]) => `<div class="ec-line ${mark}"><div class="code"><span style="--0:#82AAFF">${text}</span></div></div>`)
    .join("")}</code></pre>` +
  `<div class="copy"><button title="Copy to clipboard" data-code="x"><div></div></button></div></figure></div>`;

test("a heading keeps its text and loses its anchor link", async () => {
  const html = `<div class="sl-heading-wrapper level-h2"><h2 id="before-you-start">Before you start</h2><a class="sl-anchor-link" href="#before-you-start"><span aria-hidden="true">#</span><span class="sr-only">Section titled “Before you start”</span></a></div><p>You need Node.</p>`;
  assert.equal(await convert(html), "## Before you start\n\nYou need Node.");
});

test("a code block becomes a fence with its language, and its file name as the title", async () => {
  assert.equal(await convert(codeBlock("bash", [["mkdir askdb-shop"], ["cd askdb-shop"]])), "```bash\nmkdir askdb-shop\ncd askdb-shop\n```");
  assert.equal(
    await convert(codeBlock("ts", [["export default {};"]], "askdb.config.ts")),
    '```ts title="askdb.config.ts"\nexport default {};\n```',
  );
});

test("a code block with inserted and deleted lines becomes a diff", async () => {
  const html = codeBlock("ts", [["const a = 1;"], ["const b = 2;", "del"], ["const b = 3;", "ins"]]);
  assert.equal(await convert(html), "```diff\n const a = 1;\n-const b = 2;\n+const b = 3;\n```");
});

test("an image with a copy per theme is written once, as its light copy", async () => {
  const html =
    `<figure class="doc-chart"><img src="/_astro/chart-light.svg" alt="A bar chart." class="dark:sl-hidden">` +
    `<img src="/_astro/chart-dark.svg" alt="A bar chart." class="light:sl-hidden"><figcaption>Drawn with ECharts.</figcaption></figure>`;
  assert.equal(await convert(html), "![A bar chart.](https://askdb.tools/_astro/chart-light.svg)\n\n*Figure: Drawn with ECharts.*");
});

test("a file tree becomes a text fence, one entry per line with its comment", async () => {
  const icon = `<span><svg viewBox="0 0 24 24"><path d="M0 0"></path></svg></span>`;
  const directory = `<span><span class="sr-only">Directory</span><svg viewBox="0 0 24 24"><path d="M0 0"></path></svg></span>`;
  const html =
    `<starlight-file-tree class="not-content"><ul><li class="directory"><details open><summary><span class="tree-entry"><span>${directory}askdb/\n</span></span></summary><ul>` +
    `<li class="file"><span class="tree-entry"><span>${icon}schema.json</span> <span class="comment">the physical layer</span></span></li>` +
    `<li class="directory"><details open><summary><span class="tree-entry"><span>${directory}tables/\n</span></span></summary><ul>` +
    `<li class="file"><span class="tree-entry"><span>${icon}orders.md</span> <span class="comment">one table</span></span></li>` +
    `<li class="file"><span class="tree-entry"><span>${icon}users.md</span></span></li></ul></details></li></ul></details></li></ul></starlight-file-tree>`;
  assert.equal(
    await convert(html),
    "```text\naskdb/\n  schema.json  # the physical layer\n  tables/\n    orders.md  # one table\n    users.md\n```",
  );
});

test("tabs become each label in bold, followed by that tab's content", async () => {
  const html =
    `<starlight-tabs data-sync-key="pkg"><div class="tablist-wrapper not-content"><ul role="tablist">` +
    `<li role="presentation" class="tab"><a role="tab" href="#tab-panel-0" id="tab-0" aria-selected="true">npm</a></li>` +
    `<li role="presentation" class="tab"><a role="tab" href="#tab-panel-1" id="tab-1" aria-selected="false">pnpm</a></li></ul></div>` +
    `<div id="tab-panel-0" role="tabpanel">${codeBlock("bash", [["npm install askdb"]])}</div>` +
    `<div id="tab-panel-1" role="tabpanel" hidden>${codeBlock("bash", [["pnpm add askdb"]])}<p>pnpm waits a day.</p></div></starlight-tabs>`;
  assert.equal(
    await convert(html),
    "**npm**\n\n```bash\nnpm install askdb\n```\n\n**pnpm**\n\n```bash\npnpm add askdb\n```\n\npnpm waits a day.",
  );
});

test("an aside becomes a blockquote that opens with its title", async () => {
  const html = `<aside aria-label="Skip the typing" class="starlight-aside starlight-aside--tip"><p class="starlight-aside__title" aria-hidden="true"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M1 1"/></svg>Skip the typing</p><div class="starlight-aside__content"><p>The files are in <a href="https://github.com/Ygilany/AskDB/tree/main/examples/quickstart-shop">examples/quickstart-shop</a>.</p></div></aside>`;
  assert.equal(
    await convert(html),
    "> **Skip the typing**\n>\n> The files are in [examples/quickstart-shop](https://github.com/Ygilany/AskDB/tree/main/examples/quickstart-shop).",
  );
});

const diagram = `<figure><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 10 10"><title>Steps</title><text>ask()</text></svg><figcaption><code>ask()</code> stops at checked SQL.</figcaption></figure>`;

test("a diagram becomes its Mermaid source and its caption, never its SVG", async () => {
  assert.equal(
    await convert(diagram, { diagrams: ["flowchart TB\n  a --> b"] }),
    "```mermaid\nflowchart TB\n  a --> b\n```\n\n*Figure: `ask()` stops at checked SQL.*",
  );
});

test("a diagram whose source isn't known keeps only its caption", async () => {
  assert.equal(await convert(diagram), "*Figure: `ask()` stops at checked SQL.*");
  assert.equal(await convert(diagram + diagram, { diagrams: ["flowchart TB\n  a --> b"] }), "*Figure: `ask()` stops at checked SQL.*\n\n*Figure: `ask()` stops at checked SQL.*");
});

test("a link list rendered as cards reads as `[Title](url): description` again", async () => {
  const html = `<ul class="link-cards"><li><a href="/quickstart/">Quickstart</a><span class="link-card-sep">: </span><span class="link-card-desc">Ask your first question.</span></li><li><a href="/reference/cli/">CLI</a><span class="link-card-sep">: </span><span class="link-card-desc">Every <code>askdb</code> command.</span></li></ul>`;
  assert.equal(
    await convert(html),
    "- [Quickstart](https://askdb.tools/quickstart/): Ask your first question.\n- [CLI](https://askdb.tools/reference/cli/): Every `askdb` command.",
  );
});

test("links and images are absolute, and a link within the page stays a fragment", async () => {
  const html = `<p><a href="/AskDB/reference/cli/#ask">root</a> <a href="../tenant-hierarchy/">relative</a> <a href="#run-the-sql">same page</a> <a href="https://example.com/x">external</a></p><p><img src="/_astro/tables.webp" srcset="/_astro/tables.webp 2x" alt="The Tables view"></p>`;
  assert.equal(
    await convert(html),
    "[root](https://askdb.tools/AskDB/reference/cli/#ask) [relative](https://askdb.tools/guides/tenant-hierarchy/) [same page](#run-the-sql) [external](https://example.com/x)\n\n![The Tables view](https://askdb.tools/_astro/tables.webp)",
  );
});

test("a table stays a table", async () => {
  const html = `<table><thead><tr><th>Field</th><th>Required</th></tr></thead><tbody><tr><td><code>ai</code></td><td>yes</td></tr></tbody></table>`;
  assert.equal(await convert(html), "| Field | Required |\n| ----- | -------- |\n| `ai`  | yes      |");
});

test("site furniture is dropped: buttons, scripts, comments and decoration hidden from assistive technology", async () => {
  const html = `<!-- note --><p>Copy the prompt.</p><button type="button">Copy prompt</button><script>forward()</script><style>p{}</style><span aria-hidden="true">01</span><p>Then paste it.</p>`;
  assert.equal(await convert(html), "Copy the prompt.\n\nThen paste it.");
});

test("mermaidSources returns each Mermaid fence in page order, without maintainer comments", () => {
  const mdx = "Intro.\n\n<figure>\n\n```mermaid\nflowchart TB\n  %% Source of truth: ask.ts\n  a --> b\n```\n\n</figure>\n\n```ts\nconst a = 1;\n```\n\n```mermaid\nsequenceDiagram\n  A->>B: hi\n```\n";
  assert.deepEqual(mermaidSources(mdx), ["flowchart TB\n  a --> b", "sequenceDiagram\n  A->>B: hi"]);
  assert.deepEqual(mermaidSources("No diagrams."), []);
});

test("a page's Markdown twin has its title, description and body, and ends by naming its source and the index", () => {
  const markdown = pageMarkdown({ title: "Quickstart", description: "Ask a question.", body: "Run `askdb init`.", pageUrl: "https://askdb.tools/quickstart/", llmsUrl: "https://askdb.tools/llms.txt" });
  assert.equal(
    markdown,
    "# Quickstart\n\n> Ask a question.\n\nRun `askdb init`.\n\n---\n\nSource: https://askdb.tools/quickstart/ · Index of every page: https://askdb.tools/llms.txt · Every page has a Markdown version at its URL with the trailing slash replaced by `.md`.\n",
  );
  assert.equal(pageMarkdown({ title: "T", body: "B", pageUrl: "u", llmsUrl: "l" }).startsWith("# T\n\nB\n\n---"), true);
});
