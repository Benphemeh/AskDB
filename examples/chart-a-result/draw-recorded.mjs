// Draws the recorded run (recorded/run.json) with ECharts, in its light and dark themes.
// It needs no API key and makes no model call: the chart plan and the rows are in the file.
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import * as echarts from "echarts";
import { toEChartsOption } from "./to-echarts.mjs";

const { plan, rows } = JSON.parse(readFileSync(new URL("./recorded/run.json", import.meta.url), "utf8"));

/** The recorded chart as an SVG string. `theme` is an ECharts theme name: null (light) or "dark". */
export function drawRecorded(theme = null) {
  const chart = echarts.init(null, theme, { renderer: "svg", ssr: true, width: 480, height: 300 });
  chart.setOption({ ...toEChartsOption(plan.primary, rows), animation: false, backgroundColor: "transparent" });
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}

// Node resolves symbolic links in `import.meta.filename`, so resolve them in the script's path too:
// macOS reaches /tmp and /var through one.
if (process.argv[1] && import.meta.filename === realpathSync(process.argv[1])) {
  writeFileSync("chart-light.svg", drawRecorded());
  writeFileSync("chart-dark.svg", drawRecorded("dark"));
  console.log("Wrote chart-light.svg and chart-dark.svg");
}
