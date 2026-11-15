import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { COMMON_TASKS, llmsDetails, llmsTxtOptions, pageDescription } from "./llms-txt.mjs";

const docsDir = new URL("../content/docs/", import.meta.url);

/** Every page id under src/content/docs: its path without the extension, `x/index` as `x`. */
function pageIds(dir = docsDir, prefix = "") {
  return readdirSync(fileURLToPath(dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return pageIds(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
    if (!/\.mdx?$/.test(entry.name)) return [];
    return [`${prefix}${entry.name.replace(/\.mdx?$/, "")}`.replace(/(^|\/)index$/, "") || "index"];
  });
}

test("every common task in llms.txt links to the Markdown twin of a page that exists, with that page's description", () => {
  const details = llmsDetails("https://askdb.tools");
  const pages = new Set(pageIds());
  for (const { task, page } of COMMON_TASKS) {
    assert.equal(pages.has(page), true, `${page} is not a page`);
    assert.equal(details.includes(`- [${task}](https://askdb.tools/${page}.md): ${pageDescription(page)}`), true, `${task} is not listed`);
  }
});

test("every page llms.txt links to in its opening notes exists", () => {
  const pages = new Set(pageIds());
  const linked = [...llmsDetails("https://askdb.tools").matchAll(/https:\/\/askdb\.tools\/([^\s)`]+)\.md/g)].map(([, page]) => page);
  assert.equal(linked.length > COMMON_TASKS.length, true);
  for (const page of linked) {
    if (page === "AGENTS") assert.equal(existsSync(fileURLToPath(new URL("../../public/AGENTS.md", import.meta.url))), true);
    else assert.equal(pages.has(page), true, `${page} is not a page`);
  }
});

test("llms.txt links carry the base path the site is served under", () => {
  const details = llmsDetails("https://ygilany.github.io/AskDB");
  assert.equal(details.includes("](https://ygilany.github.io/AskDB/quickstart.md)"), true);
  assert.equal(details.includes("](https://ygilany.github.io/AskDB/AGENTS.md)"), true);
  assert.equal(/\]\(https:\/\/askdb\.tools/.test(details), false);
});

test("llms.txt leads with what an agent must not get wrong", () => {
  const details = llmsDetails("https://askdb.tools");
  const tasks = details.indexOf("## Common tasks");
  for (const fact of ["AskDB returns SQL and never executes it.", "The SQL checks are heuristics, not a security boundary.", "Tenant scope comes from the host application."]) {
    const at = details.indexOf(fact);
    assert.equal(at > -1 && at < tasks, true, fact);
  }
});

test("each documentation set covers at least one page, and together they cover every page", () => {
  const pages = pageIds();
  const { customSets } = llmsTxtOptions("https://askdb.tools");
  const inSet = (page, set) => set.paths.some((path) => (path.endsWith("/**") ? page.startsWith(path.slice(0, -2)) : page === path));
  for (const set of customSets) assert.equal(pages.some((page) => inSet(page, set)), true, `${set.label} is empty`);
  for (const page of pages) assert.equal(customSets.some((set) => inSet(page, set)), true, `${page} is in no documentation set`);
});

test("a task that names a missing page fails loudly", () => {
  assert.throws(() => pageDescription("guides/no-such-page"), /no page at src\/content\/docs\/guides\/no-such-page\.mdx/);
});
