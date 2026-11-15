// Keyless checks: no model call. They run against the installed @askdb/client and ECharts.
// If a change to @askdb/client/charts fails one, recorded/run.json and the guide that shows it
// (https://askdb.tools/guides/plan-a-chart/) are out of date.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { classifyResult, planChart, validateChartSpec } from "@askdb/client/charts";
import * as echarts from "echarts";
import { drawRecorded } from "./draw-recorded.mjs";
import { toEChartsOption } from "./to-echarts.mjs";

const run = JSON.parse(readFileSync(new URL("./recorded/run.json", import.meta.url), "utf8"));
const { question, sql, columns, rows, truncated, result, plan } = run;

/** A model that fails, and keeps the prompt it was sent. planChart() then returns its fallback. */
function failingModel() {
  const model = {
    specificationVersion: "v3",
    provider: "none",
    modelId: "none",
    supportedUrls: {},
    prompt: undefined,
    doGenerate(options) {
      model.prompt = options.prompt;
      throw new Error("no model in this test");
    },
    doStream() {
      throw new Error("no model in this test");
    },
  };
  return model;
}

const userText = (prompt) => prompt.find((message) => message.role === "user").content.map((part) => part.text).join("");

test("the recorded chart draws to SVG in both themes", () => {
  for (const theme of [null, "dark"]) {
    const svg = drawRecorded(theme);
    assert.match(svg, /^<svg /);
    for (const row of rows) assert.ok(svg.includes(`>${row[plan.primary.category]}<`), `no label for ${row[plan.primary.category]}`);
    assert.ok(svg.includes(plan.primary.title));
  }
});

test("classifyResult() still classifies the recorded rows the way the recording says", () => {
  assert.deepEqual(classifyResult({ columns, rowCount: rows.length, truncated, rows }), result);
});

test("the recorded spec passes validateChartSpec(), and a pie for the same result doesn't", () => {
  assert.deepEqual(validateChartSpec(plan.primary, result, { question }), { ok: true });
  assert.deepEqual(validateChartSpec({ ...plan.primary, type: "pie" }, result, { question }), {
    ok: false,
    issues: [{ code: "PIE_NOT_PART_TO_WHOLE", message: "No pie: a ranking isn't part of a whole." }],
  });
});

test("the prompt is the recorded one, and holds no value from the rows", async () => {
  const model = failingModel();
  await planChart({ question, sql, result, model, dialect: "sqlite" });
  assert.equal(userText(model.prompt), run.prompt.user);
  assert.equal(model.prompt.find((message) => message.role === "system").content, run.prompt.system);
  for (const row of rows) for (const value of Object.values(row)) assert.ok(!userText(model.prompt).includes(String(value)), `the prompt holds ${value}`);
});

test("a literal in the SQL reaches the model as ?", async () => {
  const model = failingModel();
  const filtered = sql.replace("GROUP BY", "WHERE customers.country = 'US'\nGROUP BY");
  await planChart({ question, sql: filtered, result, model, dialect: "sqlite" });
  assert.ok(userText(model.prompt).includes("WHERE customers.country = ?\n"));
  assert.ok(!userText(model.prompt).includes("US"));
});

test("when the model fails, the fallback picks the same chart type and columns", async () => {
  const fallback = await planChart({ question, sql, result, model: failingModel(), dialect: "sqlite" });
  assert.equal(fallback.source, "fallback");
  assert.equal(fallback.fallbackReason, "model-error");
  assert.deepEqual(fallback.primary, {
    type: "horizontal-bar",
    category: "name",
    series: ["total_spent"],
    title: "Total spent by name",
    description: "Horizontal bar chart of total spent for each name.",
  });
});

test("toEChartsOption() maps every chart type onto an option ECharts accepts", () => {
  const data = [
    { month: "2026-01", revenue: 138.99, orders: 2 },
    { month: "2026-02", revenue: 398, orders: 1 },
  ];
  assert.equal(toEChartsOption({ type: "metric", series: ["revenue"], title: "t", description: "d" }, data), null);
  for (const type of ["line", "area", "bar", "horizontal-bar", "pie"]) {
    const series = type === "pie" ? ["revenue"] : ["revenue", "orders"];
    const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width: 480, height: 300 });
    chart.setOption({ ...toEChartsOption({ type, category: "month", series, title: "t", description: "d" }, data), animation: false });
    const svg = chart.renderToSVGString();
    chart.dispose();
    assert.ok(svg.includes(">2026-01<") || type === "pie", `${type}: no category label`);
    assert.ok(svg.includes("<path"), `${type}: nothing drawn`);
  }
});
