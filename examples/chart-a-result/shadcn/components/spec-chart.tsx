"use client";

import type { ChartSpec } from "@askdb/client/charts";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Row = Record<string, unknown>;
const color = (index: number) => `var(--chart-${(index % 5) + 1})`;

/**
 * Draws a chart spec from @askdb/client/charts with shadcn/ui's chart component, which is Recharts.
 * Recharts reads your rows as they are and picks columns by name with `dataKey`,
 * so the spec's `category` and `series` go in as they are.
 * A metric is one number, not a chart: it shows the value under the title.
 */
export function SpecChart({ spec, rows }: { spec: ChartSpec; rows: Row[] }) {
  const config: ChartConfig = Object.fromEntries(spec.series.map((column, index) => [column, { label: column, color: color(index) }]));
  const value = rows[0]?.[spec.series[0]];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{spec.title}</CardTitle>
        <CardDescription>{spec.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {spec.type === "metric" ? (
          <p className="text-4xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : String(value)}</p>
        ) : (
          <ChartContainer config={config} className="min-h-[200px] w-full">
            {spec.type === "pie" ? (
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent nameKey={spec.category} hideLabel />} />
                <Pie data={rows.map((row, index) => ({ ...row, fill: color(index) }))} dataKey={spec.series[0]} nameKey={spec.category} />
              </PieChart>
            ) : (
              <CartesianChart spec={spec} rows={rows} />
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Line, area, bar and horizontal bar: one Recharts chart, with one line, area or bar for each column in `series`. */
function CartesianChart({ spec, rows }: { spec: ChartSpec; rows: Row[] }) {
  const horizontal = spec.type === "horizontal-bar";
  const Chart = spec.type === "line" ? LineChart : spec.type === "area" ? AreaChart : BarChart;
  return (
    <Chart accessibilityLayer data={rows} layout={horizontal ? "vertical" : "horizontal"}>
      <CartesianGrid horizontal={!horizontal} vertical={horizontal} />
      {horizontal ? <XAxis type="number" /> : <XAxis dataKey={spec.category} />}
      {horizontal ? <YAxis type="category" dataKey={spec.category} /> : <YAxis />}
      <ChartTooltip content={<ChartTooltipContent />} />
      {spec.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
      {spec.series.map((column, index) =>
        spec.type === "line" ? (
          <Line key={column} dataKey={column} stroke={color(index)} dot={false} />
        ) : spec.type === "area" ? (
          <Area key={column} dataKey={column} stroke={color(index)} fill={color(index)} fillOpacity={0.4} />
        ) : (
          <Bar key={column} dataKey={column} fill={color(index)} radius={4} />
        ),
      )}
    </Chart>
  );
}
