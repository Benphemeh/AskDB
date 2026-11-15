import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { openai } from "@ai-sdk/openai";
import { classifyResult, planChart } from "@askdb/client/charts";
import { ask, loadSchema } from "@askdb/core";
import * as echarts from "echarts";
import { toEChartsOption } from "./to-echarts.mjs";

const question = "How much has each customer spent in total, highest first?";
const model = openai(process.env.OPENAI_MODEL || "gpt-4o-mini"); // reads OPENAI_API_KEY

// 1. AskDB returns the SQL. Our own code runs it.
const { sql } = await ask({ question, schema: loadSchema("./askdb"), model, dialect: "sqlite" });
const statement = new DatabaseSync("shop.db", { readOnly: true }).prepare(sql);
const rows = statement.all().map((row) => ({ ...row })); // plain objects, for ECharts in step 4
console.log(sql);
console.table(rows);

// 2. Classify the columns, here in our own process.
const columns = statement.columns().map(({ name }) => ({ name }));
const result = classifyResult({ columns, rowCount: rows.length, rows });
console.log(result.shape);

// 3. Ask the model which chart fits. It gets the question, the SQL and result.shape.
const plan = await planChart({ question, sql, result, model, dialect: "sqlite" });
console.log(plan);

// 4. Draw the chart ourselves, from our own rows.
const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width: 480, height: 300 });
chart.setOption({ ...toEChartsOption(plan.primary, rows), animation: false });
writeFileSync("chart.svg", chart.renderToSVGString());
chart.dispose();
console.log("Wrote chart.svg");
