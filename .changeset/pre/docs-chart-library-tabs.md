---
"@askdb/docs-site": patch
---

"Chart a query result" now draws the chart spec with two charting libraries, in tabs at step 4: ECharts, and shadcn/ui charts (Recharts) with a `SpecChart` React component. The tutorial and both pages' agent prompts point to the two mappings, and the chart example's tests render the shadcn/ui component with shadcn's own `chart.tsx`.
