import type { ChartPlan } from "@askdb/client/charts";
import { ResultTable } from "@/components/result-table"; // your own table
import { SpecChart } from "@/components/spec-chart";

export function Answer({ plan, rows }: { plan: ChartPlan; rows: Record<string, unknown>[] }) {
  if (!plan.primary) return <ResultTable rows={rows} />; // no chart fits this result
  return <SpecChart spec={plan.primary} rows={rows} />;
}
