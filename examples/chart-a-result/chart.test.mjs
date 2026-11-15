// Keyless checks: no model call. They run against the installed @askdb/client and ECharts.
// If a change to @askdb/client/charts fails one, recorded/run.json and the guide that shows it
// (https://askdb.tools/guides/plan-a-chart/) are out of date.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
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

/**
 * A local stand-in for the model provider's API, so first-chart.mjs runs unchanged with no key.
 * It answers ask()'s request with the recorded SQL and planChart()'s with the recorded plan, in
 * the shape of an OpenAI Responses API reply.
 */
function standInProvider() {
  const requests = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      requests.push(body);
      const text = body.includes("You plan a chart") ? JSON.stringify({ ...plan, alternate: null }) : "```sql\n" + sql + "\n```";
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          id: "resp_recorded",
          object: "response",
          created_at: 1763164800,
          status: "completed",
          error: null,
          incomplete_details: null,
          model: JSON.parse(body).model,
          output: [{ type: "message", id: "msg_recorded", status: "completed", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] }],
          usage: { input_tokens: 1, input_tokens_details: { cached_tokens: 0 }, output_tokens: 1, output_tokens_details: { reasoning_tokens: 0 }, total_tokens: 2 },
        }),
      );
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, requests })));
}

test("first-chart.mjs, the tutorial's script, prints the recorded run and draws its chart", async () => {
  // The Quickstart's project, as far as the script reads it: shop.db and the schema artifact.
  const project = mkdtempSync(join(tmpdir(), "askdb-first-chart-"));
  const { server, requests } = await standInProvider();
  try {
    new DatabaseSync(join(project, "shop.db")).exec(readFileSync(new URL("./shop.sql", import.meta.url), "utf8"));
    cpSync(new URL("./askdb", import.meta.url), join(project, "askdb"), { recursive: true });
    const stdout = await new Promise((resolve, reject) => {
      execFile(
        process.execPath,
        [fileURLToPath(new URL("./first-chart.mjs", import.meta.url))],
        { cwd: project, env: { ...process.env, OPENAI_API_KEY: "no-key", OPENAI_MODEL: "", OPENAI_BASE_URL: `http://127.0.0.1:${server.address().port}/v1` } },
        (error, out, err) => (error ? reject(new Error(`${error.message}\n${err}`)) : resolve(out)),
      );
    });
    assert.equal(requests.length, 2, "one request for ask() and one for planChart()");
    for (const row of rows) for (const value of Object.values(row)) assert.ok(!requests[1].includes(String(value)), `planChart()'s request holds ${value}`);
    assert.ok(stdout.startsWith(`${sql}\n`), "the SQL comes first");
    for (const row of rows) assert.match(stdout, new RegExp(`│ '${row.name}'\\s*│ ${String(row.total_spent).replace(".", "\\.")}\\s*│`));
    assert.ok(stdout.includes(`${inspect(result.shape)}\n`), "result.shape, as console.log prints it");
    for (const [field, value] of Object.entries(plan.primary)) assert.ok(stdout.includes(`    ${field}: ${inspect(value)}`), `the chart spec's ${field}`);
    assert.ok(stdout.includes("  source: 'model',\n"), "the plan's source");
    assert.ok(stdout.endsWith("Wrote chart.svg\n"));
    const svg = readFileSync(join(project, "chart.svg"), "utf8");
    for (const row of rows) assert.ok(svg.includes(`>${row.name}<`), `no label for ${row.name}`);
    assert.ok(svg.includes(plan.primary.title));
  } finally {
    server.close();
    rmSync(project, { recursive: true, force: true });
  }
});
