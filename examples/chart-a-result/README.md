# Chart a query result

The runnable version of the guide [Chart a query result](https://askdb.tools/guides/plan-a-chart/). It asks a question of the [Quickstart](https://askdb.tools/quickstart/)'s shop database, runs the SQL AskDB returns, asks the model which chart fits the result with `@askdb/client/charts`, and draws that chart with [Apache ECharts](https://echarts.apache.org/).

AskDB draws nothing. `planChart()` returns a chart spec (a type, a category column, series columns, a title and a description), and this example's own code draws it from its own rows. The model never sees a row.

`@askdb/client/charts` is experimental: a minor release of `@askdb/client` may change it.

## Get it

```bash
npx gitpick Ygilany/AskDB/tree/main/examples/chart-a-result askdb-chart
cd askdb-chart
npm install
```

You need Node.js 22.23.4 or newer.

## What's here

- `shop.sql`: the Quickstart's three tables and their rows.
- `askdb/schema.json`: the schema artifact `askdb introspect` wrote for that database.
- `to-echarts.mjs`: `toEChartsOption(spec, rows)`, the mapping from a chart spec to an ECharts option. The guide shows this file.
- `chart.mjs`: the whole flow, with two model calls: `ask()`, then `planChart()`. It writes `chart.svg`.
- `recorded/run.json`: one real run of `chart.mjs`, with its date and model: the question, the SQL, the rows, the classified result, the prompt `planChart()` sent, and the chart plan it returned. The guide shows this run.
- `draw-recorded.mjs`: draws the recorded run again, in ECharts' light and dark themes. It makes no model call.
- `chart.test.mjs`: checks with no model call, such as that the prompt holds no value from the rows.

## Draw the recorded run, with no API key

```bash
node draw-recorded.mjs
```

It writes `chart-light.svg` and `chart-dark.svg`. Open either in a browser.

## Run it with your model

Set an OpenAI API key, then run the flow:

```bash
export OPENAI_API_KEY=<your OpenAI API key>
node chart.mjs
```

It prints the SQL, the rows, the prompt the chart planner sent, and the chart plan, and writes `chart.svg`. The model writes the SQL and picks the chart, so yours can differ from the recorded run. `OPENAI_MODEL` picks another OpenAI model; the default is `gpt-4o-mini`.

Ask your own question about the shop:

```bash
node chart.mjs "How many orders did each product get?"
```

`chart.mjs` loads `shop.sql` into an in-memory SQLite database on each run and sets it read-only before it runs the generated SQL, so the folder holds no database file.

## Check it

```bash
npm test
```
