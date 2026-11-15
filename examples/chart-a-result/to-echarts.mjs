/**
 * Turns a chart spec from @askdb/client/charts into an ECharts option.
 * ECharts reads your rows from `dataset.source` and picks columns by name with `encode`,
 * so the spec's `category` and `series` go in as they are.
 * A metric is one number, not a chart: it gets no option.
 *
 * @param {import("@askdb/client/charts").ChartSpec} spec
 * @param {Record<string, unknown>[]} rows
 * @returns {import("echarts").EChartsOption | null}
 */
export function toEChartsOption(spec, rows) {
  if (spec.type === "metric") return null;
  const base = {
    title: { text: spec.title, subtext: spec.description },
    dataset: { source: rows },
    tooltip: {},
  };
  if (spec.type === "pie") {
    return { ...base, series: [{ type: "pie", encode: { itemName: spec.category, value: spec.series[0] } }] };
  }
  const horizontal = spec.type === "horizontal-bar";
  const categoryAxis = { type: "category", inverse: horizontal }; // inverse: the first row at the top
  const valueAxis = { type: "value" };
  return {
    ...base,
    legend: { show: spec.series.length > 1, bottom: 0 },
    grid: { top: 80 },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: spec.series.map((column) => ({
      type: spec.type === "line" || spec.type === "area" ? "line" : "bar",
      name: column,
      ...(spec.type === "area" ? { areaStyle: {} } : {}),
      encode: horizontal ? { x: column, y: spec.category } : { x: spec.category, y: column },
    })),
  };
}
