// Asks a question of the Quickstart's shop database, runs the SQL AskDB returns, asks the
// model which chart fits the result, and draws that chart with ECharts into chart.svg.
// It makes two model calls: ask() and planChart(). Set OPENAI_API_KEY first.
//
//   node chart.mjs ["your question"] [--record]
//
// --record also writes recorded/run.json: the run the guide shows.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { openai } from "@ai-sdk/openai";
import { classifyResult, planChart } from "@askdb/client/charts";
import { ask, loadSchema } from "@askdb/core";
import { wrapLanguageModel } from "ai";
import * as echarts from "echarts";
import { toEChartsOption } from "./to-echarts.mjs";

const args = process.argv.slice(2);
const record = args.includes("--record");
const question = args.find((arg) => !arg.startsWith("--")) ?? "How much has each customer spent in total, highest first?";
const modelId = process.env.OPENAI_MODEL || "gpt-4o-mini";
if (!process.env.OPENAI_API_KEY) {
  console.error("Set OPENAI_API_KEY first. To draw the recorded run with no key: node draw-recorded.mjs");
  process.exit(1);
}
const model = openai(modelId);

// 1. AskDB returns SQL. It never runs it.
const { sql } = await ask({ question, schema: loadSchema("./askdb"), model, dialect: "sqlite" });

// 2. This application runs the SQL, on its own connection, read-only and with a row cap.
const db = new DatabaseSync(":memory:");
db.exec(readFileSync("shop.sql", "utf8"));
db.exec("PRAGMA query_only = ON");
const ROW_CAP = 1000;
const statement = db.prepare(sql);
const rows = [];
let truncated = false;
for (const row of statement.iterate()) {
  if (rows.length === ROW_CAP) {
    truncated = true;
    break;
  }
  rows.push({ ...row }); // node:sqlite rows have no prototype; ECharts needs plain objects
}
const columns = statement.columns().map(({ name, type }) => ({ name, ...(type ? { type } : {}) }));

// 3. Classify the result in this process. No model call, and the rows go nowhere.
const result = classifyResult({ columns, rowCount: rows.length, truncated, rows });

// 4. Ask the model which chart fits. It gets the question, the SQL with its values masked,
//    and result.shape. The wrapper only copies what the model is sent, so you can read it.
let prompt;
const observed = wrapLanguageModel({
  model,
  middleware: {
    transformParams: async ({ params }) => {
      prompt = params.prompt;
      return params;
    },
  },
});
const plan = await planChart({ question, sql, result, model: observed, dialect: "sqlite" });

console.log("-- sql --\n" + sql);
console.table(rows);
console.log("-- what the chart planner sent the model --");
for (const message of prompt ?? []) {
  const text = typeof message.content === "string" ? message.content : message.content.map((part) => part.text ?? "").join("");
  console.log(`[${message.role}]\n${text}\n`);
}
console.log("-- chart plan --\n" + JSON.stringify(plan, null, 2));

// 5. This application draws the chart, from its own rows.
if (!plan.primary) {
  console.log("No chart fits this result. Show the table.");
} else if (plan.primary.type === "metric") {
  console.log(`${plan.primary.title}: ${rows[0][plan.primary.series[0]]}`);
} else {
  // In a browser: echarts.init(element).setOption(toEChartsOption(plan.primary, rows)).
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width: 480, height: 300 });
  chart.setOption({ ...toEChartsOption(plan.primary, rows), animation: false });
  writeFileSync("chart.svg", chart.renderToSVGString());
  chart.dispose();
  console.log("Wrote chart.svg");
}

if (record) {
  mkdirSync("recorded", { recursive: true });
  const text = (role) => {
    const content = prompt?.find((message) => message.role === role)?.content;
    return typeof content === "string" ? content : (content ?? []).map((part) => part.text ?? "").join("");
  };
  const run = {
    recordedOn: new Date().toISOString().slice(0, 10),
    model: modelId,
    question,
    sql,
    columns,
    rows,
    truncated,
    result,
    prompt: { system: text("system"), user: text("user") },
    plan,
  };
  writeFileSync("recorded/run.json", JSON.stringify(run, null, 2) + "\n");
  console.log("Wrote recorded/run.json");
}
