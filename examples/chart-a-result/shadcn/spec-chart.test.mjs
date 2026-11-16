// Keyless checks for the shadcn/ui version of the mapping: no model call and no browser.
// esbuild compiles components/spec-chart.tsx and components/answer.tsx, which import shadcn's
// own chart.tsx and card.tsx from components/ui/, as a shadcn project does. React then renders
// them into happy-dom, a DOM in this process, and the checks read the SVG Recharts drew.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { Window } from "happy-dom";

const project = fileURLToPath(new URL("./", import.meta.url)); // the shadcn project: `@/` is this folder
const run = JSON.parse(readFileSync(new URL("../recorded/run.json", import.meta.url), "utf8"));
// Inside node_modules, so the compiled file finds react and recharts, and git ignores it.
const buildDir = fileURLToPath(new URL("../node_modules/.cache/askdb-spec-chart-test/", import.meta.url));

let window;
let React;
let createRoot;
let renderToString;
let SpecChart;
let Answer;

before(async () => {
  // A browser window, with reduced motion so Recharts draws its final frame at once.
  window = new Window({ url: "http://localhost/", settings: { device: { prefersReducedMotion: "reduce" } } });
  for (const name of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    Object.defineProperty(globalThis, name, { value: name === "window" ? window : window[name], configurable: true, writable: true });
  }
  // happy-dom lays nothing out, so every element measures 0 × 0. Recharts sizes the chart from its
  // container, so give that container the size a browser would: 640 × 360, the 16:9 of shadcn's
  // `aspect-video`. A ResizeObserver that never fires keeps it at that size.
  const measure = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (!this.classList.contains("recharts-responsive-container")) return measure.call(this);
    return { x: 0, y: 0, top: 0, left: 0, right: 640, bottom: 360, width: 640, height: 360, toJSON() {} };
  };
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  mkdirSync(buildDir, { recursive: true });
  await esbuild.build({
    stdin: { contents: 'export { SpecChart } from "@/components/spec-chart"; export { Answer } from "@/components/answer";', resolveDir: project, loader: "js" },
    bundle: true,
    packages: "external", // react, recharts and cn load from node_modules, as in an app
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    outfile: `${buildDir}components.cjs`,
    logLevel: "warning",
    plugins: [
      {
        name: "shadcn-alias", // the `@/*` path a shadcn project's tsconfig.json maps to its root
        setup(build) {
          build.onResolve({ filter: /^@\// }, ({ path }) => ({ path: `${project}${path.slice(2)}.tsx` }));
        },
      },
    ],
  });
  const require = createRequire(buildDir);
  React = require("react");
  ({ createRoot } = require("react-dom/client"));
  ({ renderToString } = require("react-dom/server"));
  ({ SpecChart, Answer } = require(`${buildDir}components.cjs`));
});

after(async () => {
  rmSync(buildDir, { recursive: true, force: true });
  await window.happyDOM.close();
});

/** Renders `element` into the document and returns its container, after every effect has run. */
async function render(component, props) {
  const container = window.document.createElement("div");
  window.document.body.append(container);
  const root = createRoot(container);
  await React.act(async () => root.render(React.createElement(component, props)));
  return { container, unmount: () => React.act(() => root.unmount()) };
}

/** Moves the mouse over the middle of the chart, so Recharts shows its tooltip. */
async function hover(container) {
  const event = new window.MouseEvent("mousemove", { bubbles: true, clientX: 320, clientY: 180 });
  await React.act(async () => container.querySelector(".recharts-wrapper").dispatchEvent(event));
}

const texts = (element, selector) => [...element.querySelectorAll(selector)].map((node) => node.textContent);
/** The tick labels Recharts drew along one axis: "xAxis" (horizontal) or "yAxis" (vertical). */
const ticks = (container, axis) => texts(container, `.recharts-${axis}-tick-labels .recharts-cartesian-axis-tick-value`);

test("SpecChart draws the recorded run's horizontal bar chart, with the names on the vertical axis", async () => {
  const { primary: spec } = run.plan;
  const { container, unmount } = await render(SpecChart, { spec, rows: run.rows });
  assert.equal(container.querySelector('[data-slot="card-title"]').textContent, spec.title);
  assert.equal(container.querySelector('[data-slot="card-description"]').textContent, spec.description);
  assert.ok(container.querySelector('[data-slot="chart"] svg.recharts-surface'), "no chart drawn");
  assert.deepEqual(ticks(container, "yAxis"), run.rows.map((row) => row.name), "the names, top to bottom, on the vertical axis");
  assert.ok(ticks(container, "xAxis").every((tick) => /^[\d,.]+$/.test(tick)), "numbers on the horizontal axis");
  assert.equal(container.querySelectorAll(".recharts-bar-rectangle path").length, run.rows.length);
  await unmount();
});

test("a column name with a space keeps its color", async () => {
  // SQL can alias a column as "Total Spent". The series takes its color directly, not from a CSS
  // variable named after the column, which a space would break.
  const spec = { type: "bar", category: "name", series: ["Total Spent"], title: "Spend", description: "By customer." };
  const rows = [{ name: "Grace", "Total Spent": 398 }, { name: "Ada", "Total Spent": 138.99 }];
  const { container, unmount } = await render(SpecChart, { spec, rows });
  const bars = [...container.querySelectorAll(".recharts-bar-rectangle path")];
  assert.equal(bars.length, 2);
  assert.ok(bars.every((bar) => bar.getAttribute("fill") === "var(--chart-1)"), "each bar is filled with the first chart color");
  await unmount();
});

test("series keep their colors in the legend and the tooltip", async () => {
  // The ChartConfig holds no colors, so the swatches take theirs from the lines, areas and bars.
  const spec = { type: "line", category: "month", series: ["revenue", "orders"], title: "Revenue", description: "d" };
  const rows = [{ month: "2026-01", revenue: 398, orders: 2 }, { month: "2026-02", revenue: 377, orders: 1 }];
  const { container, unmount } = await render(SpecChart, { spec, rows });
  const swatches = [...container.querySelectorAll(".recharts-legend-wrapper > div > div > div")].map((swatch) => swatch.style.backgroundColor);
  assert.deepEqual(swatches, ["var(--chart-2)", "var(--chart-1)"], "orders, then revenue: Recharts sorts the legend by name");
  await hover(container);
  const dots = [...container.querySelectorAll(".recharts-tooltip-wrapper .shrink-0")].map((dot) => dot.style.getPropertyValue("--color-bg"));
  assert.deepEqual(dots, ["var(--chart-1)", "var(--chart-2)"]);
  await unmount();
});

test("a column name or value from the SQL never reaches a <style> element", async () => {
  // The model writes the SQL, so it picks the column aliases. shadcn's ChartStyle writes each
  // ChartConfig key that has a color into a <style> element, so the config has no colors.
  for (const name of ["</style><img src=x onerror=alert(1)>", "x}body{display:none}"]) {
    const specs = [
      { type: "bar", category: "month", series: [name, "orders"] }, // as a series
      { type: "bar", category: name, series: ["revenue"] }, // as the category
      { type: "pie", category: name, series: ["revenue"] }, // as the category of a pie, and a slice
    ];
    for (const shape of specs) {
      const spec = { ...shape, title: "t", description: "d" };
      const rows = [{ month: "2026-01", [name]: name, revenue: 398, orders: 2 }, { month: "2026-02", [name]: "b", revenue: 377, orders: 1 }];
      if (spec.series[0] === name) for (const row of rows) row[name] = row.revenue;
      const html = renderToString(React.createElement(SpecChart, { spec, rows }));
      assert.ok(!html.includes("<img"), `server: ${html}`);
      assert.ok(!html.includes("<style") && !html.includes("</style>"), `server: ${html}`);
      const { container, unmount } = await render(SpecChart, { spec, rows });
      assert.equal(container.querySelector("img"), null);
      assert.ok(container.textContent.includes(name), "the name is drawn as text");
      assert.ok([...window.document.querySelectorAll("style")].every((style) => !style.textContent.includes(name)));
      await unmount();
    }
  }
});

test("a pie draws numbers that the driver returns as strings", async () => {
  // node-postgres returns bigint and numeric columns as strings.
  const spec = { type: "pie", category: "status", series: ["orders"], title: "Orders", description: "By status." };
  const { container, unmount } = await render(SpecChart, { spec, rows: [{ status: "paid", orders: "12" }, { status: "refunded", orders: "3" }] });
  assert.equal(container.querySelectorAll(".recharts-pie-sector path").length, 2);
  await unmount();
});

test("a pie of 8 slices gives each slice its own color and a legend entry", async () => {
  const names = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const spec = { type: "pie", category: "name", series: ["total"], title: "Total", description: "By name." };
  const { container, unmount } = await render(SpecChart, { spec, rows: names.map((name, index) => ({ name, total: index + 1 })) });
  const fills = [...container.querySelectorAll(".recharts-pie-sector path")].map((path) => path.getAttribute("fill"));
  assert.equal(fills.length, 8);
  assert.equal(new Set(fills).size, 8, `distinct fills: ${fills}`);
  assert.deepEqual(texts(container, ".recharts-legend-wrapper > div > div"), names);
  await unmount();
});

test("SpecChart draws every chart type", async () => {
  const rows = [
    { month: "2026-01", revenue: 398, orders: 2 },
    { month: "2026-02", revenue: 377, orders: 1 },
    { month: "2026-03", revenue: 138.99, orders: 3 },
  ];
  const months = rows.map((row) => row.month);
  for (const type of ["line", "area", "bar", "horizontal-bar", "pie", "metric"]) {
    const series = type === "pie" || type === "metric" ? ["revenue"] : ["revenue", "orders"];
    const spec = { type, ...(type === "metric" ? {} : { category: "month" }), series, title: `A ${type} chart`, description: "d" };
    const { container, unmount } = await render(SpecChart, { spec, rows });
    assert.equal(container.querySelector('[data-slot="card-title"]').textContent, spec.title, type);
    const svg = container.querySelector("svg.recharts-surface");
    if (type === "metric") {
      assert.equal(svg, null, "a metric is no chart");
      assert.equal(container.querySelector("p").textContent, "398");
    } else if (type === "pie") {
      assert.equal(container.querySelectorAll(".recharts-pie-sector path").length, rows.length);
      assert.deepEqual([...container.querySelectorAll(".recharts-pie-sector path")].map((path) => path.getAttribute("fill")), ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]);
    } else {
      const graphical = { line: ".recharts-line", area: ".recharts-area", bar: ".recharts-bar", "horizontal-bar": ".recharts-bar" }[type];
      assert.equal(container.querySelectorAll(graphical).length, series.length, `${type}: one ${graphical} for each series`);
      const categoryAxis = type === "horizontal-bar" ? "yAxis" : "xAxis";
      assert.deepEqual(ticks(container, categoryAxis), months, `${type}: the months on the ${categoryAxis}`);
      // Recharts sorts legend entries by name.
      assert.deepEqual(texts(container, ".recharts-legend-wrapper > div > div"), series.toSorted(), `${type}: a legend entry for each series`);
    }
    await unmount();
  }
});

test("Answer shows the table when no chart fits, and the chart when one does", async () => {
  const table = await render(Answer, { plan: { primary: null, source: "fallback", latencyMs: 0 }, rows: run.rows });
  assert.deepEqual(texts(table.container, "th"), ["name", "total_spent"]);
  assert.equal(table.container.querySelector("svg"), null);
  await table.unmount();
  const chart = await render(Answer, { plan: run.plan, rows: run.rows });
  assert.equal(chart.container.querySelectorAll(".recharts-bar-rectangle path").length, run.rows.length);
  await chart.unmount();
});
