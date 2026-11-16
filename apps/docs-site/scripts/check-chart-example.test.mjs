/**
 * The chart tutorial, guide and concept page show one real run of `examples/chart-a-result`
 * (`recorded/run.json`) and the example's code: the ECharts mapping, and the shadcn/ui one in
 * `shadcn/components/`. This keeps the pages and the example in step:
 * each code block and output the pages take from the example must be the example's.
 * installable-smoke runs the example's own tests against the packed packages.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const tutorial = read("apps/docs-site/src/content/docs/chart-your-first-answer.mdx");
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

test("the guide's shadcn/ui blocks are the example's files", () => {
  assert.deepEqual(fences(guide, '```tsx title="components/spec-chart.tsx"').map((block) => `${block}\n`), [read("examples/chart-a-result/shadcn/components/spec-chart.tsx")]);
  assert.deepEqual(fences(guide, '```tsx title="components/answer.tsx"').map((block) => `${block}\n`), [read("examples/chart-a-result/shadcn/components/answer.tsx")]);
});

test("step 4 of the guide has one tab for each library, each with its mapping", () => {
  const step = guide.slice(guide.indexOf("## 4. Draw the chart from your rows"), guide.indexOf("## 5. "));
  const tabs = step.split('<TabItem label="').slice(1);
  assert.ok(step.includes('<Tabs syncKey="chart-lib">'), "the chart-lib tabs");
  assert.deepEqual(tabs.map((tab) => tab.slice(0, tab.indexOf('"'))), ["ECharts", "shadcn/ui (Recharts)"]);
  assert.ok(tabs[0].includes('```js title="to-echarts.mjs"'), "the ECharts tab holds to-echarts.mjs");
  assert.ok(tabs[1].includes('```tsx title="components/spec-chart.tsx"'), "the shadcn/ui tab holds spec-chart.tsx");
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

/** The bodies of the page's fenced blocks that name no language: what a command printed. */
function outputBlocks(page) {
  const bodies = [];
  let open;
  for (const line of page.split("\n")) {
    if (open === undefined) {
      if (line.startsWith("```")) open = { plain: line === "```", lines: [] };
    } else if (line === "```") {
      if (open.plain) bodies.push(open.lines.join("\n"));
      open = undefined;
    } else open.lines.push(line);
  }
  return bodies;
}

/** The value of an object as `console.log` printed it: a JavaScript literal. */
const printed = (text) => new Function(`return (${text});`)();

test("the tutorial's first-chart.mjs blocks build up to the example's file, step by step", () => {
  const file = read("examples/chart-a-result/first-chart.mjs");
  const blocks = [...tutorial.matchAll(/```js title="first-chart\.mjs"[^\n]*\n([\s\S]*?)\n```/g)].map((match) => match[1]);
  assert.equal(blocks.length, 4, "one block for each step");
  assert.equal(`${blocks.at(-1)}\n`, file, "the last step's block is the whole file");
  const fileLines = file.split("\n");
  for (const [index, block] of blocks.entries()) {
    // Each step only adds lines: its block is the file with the later steps' lines left out.
    let at = 0;
    for (const line of block.split("\n")) {
      at = fileLines.indexOf(line, at) + 1;
      assert.notEqual(at, 0, `step ${index + 1} has a line that isn't in first-chart.mjs, or is out of order: ${line}`);
    }
    if (index === 0) continue;
    assert.ok(block.length > blocks[index - 1].length, `step ${index + 1} adds lines to step ${index}`);
    // And it drops none: every line of the step before is still there, in order.
    const lines = block.split("\n");
    let kept = 0;
    for (const line of blocks[index - 1].split("\n")) {
      kept = lines.indexOf(line, kept) + 1;
      assert.notEqual(kept, 0, `step ${index + 1} lost a line that step ${index} had: ${line}`);
    }
  }
});

test("the tutorial's to-echarts.mjs block is the example's file", () => {
  assert.deepEqual(fences(tutorial, '```js title="to-echarts.mjs"').map((block) => `${block}\n`), [read("examples/chart-a-result/to-echarts.mjs")]);
});

test("the tutorial shows the recorded question, SQL, rows, shape and plan", () => {
  assert.ok(read("examples/chart-a-result/first-chart.mjs").includes(`const question = ${JSON.stringify(run.question)};`), "the script asks the recorded question");
  assert.ok(tutorial.includes(`with ${run.model} on ${run.recordedOn}`), "the model and date of the recorded run");
  // What each step prints: the plain blocks, in order. Step 1 prints the SQL, then console.table's rows.
  const [sqlAndRows, shape, plan, wrote, ...more] = outputBlocks(tutorial);
  assert.deepEqual(more, [], "four output blocks");
  assert.ok(sqlAndRows.startsWith(`${run.sql}\n┌`), "the recorded SQL, then the table");
  const cells = sqlAndRows.split("\n").filter((line) => /^│ \d/.test(line)).map((line) => line.split("│").slice(2, -1).map((cell) => printed(cell.trim())));
  assert.deepEqual(cells, run.rows.map((row) => Object.values(row)), "the recorded rows");
  assert.deepEqual(printed(shape), run.result.shape, "the recorded result.shape");
  assert.deepEqual(printed(plan), run.plan, "the recorded plan");
  assert.equal(wrote, "Wrote chart.svg");
});

