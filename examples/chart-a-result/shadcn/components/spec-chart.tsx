"use client";

import type { ChartSpec } from "@askdb/client/charts";
import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Row = Record<string, unknown>;
/** The five theme colors, then the same five at 55% strength: enough for a pie's 8 slices. */
const color = (index: number) => {
  const theme = `var(--chart-${(index % 5) + 1})`;
  return index % 10 < 5 ? theme : `color-mix(in oklab, ${theme} 55%, transparent)`;
};

/**
 * Draws a chart spec from @askdb/client/charts with shadcn/ui's chart component, which is Recharts.
 * Recharts reads your rows as they are and picks columns by name with `dataKey`,
 * so the spec's `category` and `series` go in as they are.
 * A metric is one number, not a chart: it shows the value under the title.
 * The config holds labels only: a color in it makes shadcn write the column name, which the model chose, into a <style> element.
 */
export function SpecChart({ spec, rows }: { spec: ChartSpec; rows: Row[] }) {
  // Number(): a pie draws nothing from strings, which drivers return for bigint and numeric columns.
  const slices = rows.map((row, index) => ({ name: String(row[spec.category!]), value: Number(row[spec.series[0]]), fill: color(index) }));
  const labels = spec.type === "pie" ? slices.map((slice) => slice.name) : spec.series;
  const config: ChartConfig = Object.fromEntries(labels.map((label) => [label, { label }]));
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
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                <Pie data={slices} dataKey="value" nameKey="name" />
              </PieChart>
            ) : (
              <CartesianChart spec={spec} rows={rows} type={spec.type} />
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** For each cartesian chart type, the Recharts chart and the line, area or bar it draws for one column. */
const cartesian: Record<Exclude<ChartSpec["type"], "pie" | "metric">, { Chart: typeof BarChart; draw: (column: string, color: string) => ReactNode }> = {
  line: { Chart: LineChart, draw: (column, color) => <Line key={column} dataKey={column} stroke={color} dot={false} /> },
  area: { Chart: AreaChart, draw: (column, color) => <Area key={column} dataKey={column} stroke={color} fill={color} fillOpacity={0.4} /> },
  bar: { Chart: BarChart, draw: (column, color) => <Bar key={column} dataKey={column} fill={color} radius={4} /> },
  "horizontal-bar": { Chart: BarChart, draw: (column, color) => <Bar key={column} dataKey={column} fill={color} radius={4} /> },
};

/** Line, area, bar and horizontal bar: one Recharts chart, with one line, area or bar for each column in `series`. */
function CartesianChart({ spec, rows, type }: { spec: ChartSpec; rows: Row[]; type: keyof typeof cartesian }) {
  const { Chart, draw } = cartesian[type];
  const horizontal = type === "horizontal-bar";
  return (
    <Chart accessibilityLayer data={rows} layout={horizontal ? "vertical" : "horizontal"}>
      <CartesianGrid horizontal={!horizontal} vertical={horizontal} />
      {horizontal ? <XAxis type="number" /> : <XAxis dataKey={spec.category} />}
      {horizontal ? <YAxis type="category" dataKey={spec.category} /> : <YAxis />}
      <ChartTooltip content={<ChartTooltipContent />} />
      {spec.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
      {spec.series.map((column, index) => draw(column, color(index)))}
    </Chart>
  );
}
