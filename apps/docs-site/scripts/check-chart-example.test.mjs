/**
 * The chart guide and concept page show one real run of `examples/chart-a-result`
 * (`recorded/run.json`) and the example's mapping function. This keeps the pages and the
 * example in step: each code block the pages take from the example must be the example's.
 * installable-smoke runs the example's own tests against the packed packages.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const guide = read("apps/docs-site/src/content/docs/guides/plan-a-chart.mdx");
const concept = read("apps/docs-site/src/content/docs/concepts/chart-planning.mdx");
const reference = read("apps/docs-site/src/content/docs/reference/client-charts-api.mdx");
const run = JSON.parse(read("examples/chart-a-result/recorded/run.json"));

/** The bodies of every fenced block in `page` that opens with `opening`. */
function fences(page, opening) {
  const bodies = [];
  for (let at = page.indexOf(`${opening}\n`); at !== -1; at = page.indexOf(`${opening}\n`, at + 1)) {
    const body = page.slice(at + opening.length + 1);
    bodies.push(body.slice(0, body.indexOf("\n```")));
  }
  return bodies;
}

const jsonBlocks = (page) => fences(page, "```json").map((body) => JSON.parse(body));
const has = (blocks, value) => blocks.some((block) => JSON.stringify(block) === JSON.stringify(value));

test("the guide's to-echarts.mjs block is the example's file", () => {
  const [block] = fences(guide, '```js title="to-echarts.mjs"');
  assert.equal(`${block}\n`, read("examples/chart-a-result/to-echarts.mjs"));
});

test("the guide shows the recorded SQL, rows, shape and plan", () => {
  assert.ok(guide.includes(`"${run.question}"`), "the recorded question");
  assert.deepEqual(fences(guide, "```sql"), [run.sql]);
  const blocks = jsonBlocks(guide);
  assert.ok(has(blocks, run.rows), "the recorded rows");
  assert.ok(has(blocks, run.result.shape), "the recorded result.shape");
  assert.ok(has(blocks, run.plan), "the recorded plan");
  assert.ok(guide.includes(`from ${run.model} on ${run.recordedOn}`), "the model and date of the recorded run");
});

test("the concept page shows the recorded prompt and chart spec", () => {
  assert.deepEqual(fences(concept, '```text title="What planChart() sent"'), [run.prompt.user]);
  assert.ok(has(jsonBlocks(concept), run.plan.primary), "the recorded chart spec");
  assert.ok(concept.includes(`with ${run.model}, on ${run.recordedOn}`), "the model and date of the recorded run");
});

test("the reference page's example plan is the recorded plan", () => {
  assert.ok(has(jsonBlocks(reference), run.plan), "the recorded plan");
});

test("the example's shop.sql is the Quickstart's", () => {
  assert.equal(read("examples/chart-a-result/shop.sql"), read("examples/quickstart-shop/shop.sql"));
});
