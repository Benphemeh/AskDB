import type { TenantPolicyFrontmatter, V2Table } from "@askdb/core";

/** The Tenancy view's **Configure manually** form. Every table and column is its stable ID. */
export type ManualTenantPolicyForm = {
  enforcement: "strict" | "warn";
  rootTableId: string;
  rootTenantIdColumn: string;
  rootLabel: string;
  globalTableIds: string[];
  /** A scoped table's ID → its column that holds the root's tenant ID. */
  scopedTableColumns: Record<string, string>;
};

/** The options of a column select on the manual form: the value is the column's stable ID. */
export function columnOptions(table: V2Table): { value: string; label: string }[] {
  return table.columns.map((col) => ({
    value: col.id,
    label: `${col.name} (${col.type}${col.primaryKey ? ", PK" : ""})`,
  }));
}

/** The policy front matter the manual form describes, or `null` until it names a root. */
export function manualTenantPolicyFrontmatter(
  schemaId: string,
  form: ManualTenantPolicyForm,
): TenantPolicyFrontmatter | null {
  const label = form.rootLabel.trim();
  if (!form.rootTableId || !form.rootTenantIdColumn || !label) return null;
  // The root can't also be global, and neither can be scoped: the form hides them, and drops a
  // choice made before the table became the root or global.
  const globalTableIds = form.globalTableIds.filter((tableId) => tableId !== form.rootTableId);
  const globalIds = new Set(globalTableIds);
  const scopedTables = Object.entries(form.scopedTableColumns).flatMap(([tableId, column]) =>
    column && tableId !== form.rootTableId && !globalIds.has(tableId)
      ? [{ id: tableId, scopeThrough: [{ root: form.rootTableId, column }] }]
      : [],
  );
  return {
    schemaId,
    enforcement: form.enforcement,
    roots: [{ id: form.rootTableId, tenantIdColumn: form.rootTenantIdColumn, label }],
    ...(scopedTables.length > 0 ? { scopedTables } : {}),
    ...(globalTableIds.length > 0 ? { globalTables: globalTableIds } : {}),
  };
}
