// A stand-in for the application's own table of rows, which answer.tsx shows when no chart fits.
export function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = Object.keys(rows[0] ?? {});
  return (
    <table>
      <thead>
        <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>{columns.map((column) => <td key={column}>{String(row[column])}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
