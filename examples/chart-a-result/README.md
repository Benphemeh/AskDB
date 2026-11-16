# Chart a query result

The runnable version of the guide [Chart a query result](https://askdb.tools/guides/plan-a-chart/). It asks a question of the [Quickstart](https://askdb.tools/quickstart/)'s shop database, runs the SQL AskDB returns, asks the model which chart fits the result with `@askdb/client/charts`, and draws that chart with [Apache ECharts](https://echarts.apache.org/). The `shadcn/` folder draws the same chart spec with [shadcn/ui charts](https://ui.shadcn.com/docs/components/chart), which are [Recharts](https://recharts.org/).

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
- `first-chart.mjs`: the script the tutorial [Chart your first answer](https://askdb.tools/chart-your-first-answer/) builds, as it is after the last step. It runs in the Quickstart's project folder, where it reads `shop.db` and `askdb/`, with `to-echarts.mjs` next to it.
- `recorded/run.json`: one real run of `chart.mjs`, with its date and model: the question, the SQL, the rows, the classified result, the prompt `planChart()` sent, and the chart plan it returned. The tutorial and the guide show this run.
- `draw-recorded.mjs`: draws the recorded run again, in ECharts' light and dark themes. It makes no model call.
- `shadcn/components/spec-chart.tsx`: `SpecChart`, a React component that draws a chart spec with shadcn/ui's chart component, for all six chart types. The guide shows this file in its "shadcn/ui (Recharts)" tab.
- `shadcn/components/answer.tsx`: where an application shows a result: the table when no chart fits, `SpecChart` when one does. The guide shows this file too.
- `shadcn/components/ui/chart.tsx` and `shadcn/components/ui/card.tsx`: shadcn/ui's own chart and card components, as `npx shadcn@latest add chart` copies them into a project. They are copied unchanged from shadcn's `base-nova` registry, under shadcn/ui's MIT license, with a header that says so.
- `shadcn/components/result-table.tsx`: a stand-in for your application's own table, which `answer.tsx` imports.
- `shadcn/spec-chart.test.mjs`: renders `SpecChart` and `Answer` with React into [happy-dom](https://github.com/capricorn86/happy-dom), with no browser and no model call. It checks the SVG Recharts draws for the recorded run and for each chart type. The folder is laid out as a shadcn project, so `@/` is `shadcn/`.
- `chart.test.mjs`: checks with no model call, such as that the prompt holds no value from the rows. One runs `first-chart.mjs` against a local stand-in for the model provider, which answers with the recorded SQL and plan.

## The shadcn/ui version

`SpecChart` imports from `@/components/ui/chart` and `@/components/ui/card`, as a component in a shadcn project does. To use it, run `npx shadcn@latest add chart` in your project, which adds both, and copy `shadcn/components/spec-chart.tsx` to your `components/` folder. The chart colors come from shadcn's `--chart-1` to `--chart-5` CSS variables.

The test compiles the TSX with esbuild and renders it into happy-dom. happy-dom lays nothing out, so the test gives the chart's container the size a browser would (640 × 360) and turns on reduced motion, so Recharts draws its last frame at once.

The tests pass with these versions: recharts 3.8.0 (the version shadcn's chart component asks for) and 3.10.1, react and react-dom 19.2.0 and 19.3.1, cn 0.5.2, happy-dom 21.0.4 and esbuild 0.28.2. shadcn's `chart.tsx` and `card.tsx` are from its registry on 2026-11-15, when the `shadcn` CLI was at 4.23.0.

## Draw the recorded run, with no API key

```bash
node draw-recorded.mjs
```

It writes `chart-light.svg` and `chart-dark.svg`. Open either in a browser.

The docs guide shows these two files. After you record a new run or change `to-echarts.mjs`, copy them to `apps/docs-site/src/assets/charts/total-spent-light.svg` and `total-spent-dark.svg`. No check compares them.

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

If you install with pnpm 11 or newer, approve esbuild's build script when pnpm asks: the shadcn test compiles the TSX with esbuild.
