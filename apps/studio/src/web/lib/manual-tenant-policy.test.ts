import { describe, expect, it } from "vitest";
import { normalizeTenantPolicy, type TenantPolicyFrontmatter, type V2Table } from "@askdb/core";
import { columnOptions, manualTenantPolicyFrontmatter } from "./manual-tenant-policy";

// The Quickstart's shop: customers are the tenants, orders belong to one, products are shared.
function table(name: string, columns: [string, string, boolean?][]): V2Table {
  const id = `table:public.${name}`;
  return {
    id,
    name,
    schema: "public",
    columns: columns.map(([col, type, primaryKey]) => ({
      id: `${id}#${col}`,
      name: col,
      type,
      nullable: false,
      ...(primaryKey ? { primaryKey } : {}),
    })),
  };
}
const customers = table("customers", [["id", "INTEGER", true], ["name", "TEXT"], ["country", "TEXT"]]);
const products = table("products", [["id", "INTEGER", true], ["name", "TEXT"], ["price", "NUMERIC"]]);
const orders = table("orders", [["id", "INTEGER", true], ["customer_id", "INTEGER"], ["product_id", "INTEGER"]]);
const tables = [customers, products, orders];

/** The option the user picks in a column select, by the column name it shows. */
function pick(t: V2Table, columnName: string): string {
  const option = columnOptions(t).find((o) => o.label.startsWith(`${columnName} (`));
  if (!option) throw new Error(`no option for ${columnName}`);
  return option.value;
}

/** What `loadSchema()` checks the saved policy against; under `strict` any warning throws. */
function check(frontmatter: TenantPolicyFrontmatter) {
  const columnOwners = new Map(tables.flatMap((t) => t.columns.map((c) => [c.id, t.id] as const)));
  return normalizeTenantPolicy({ frontmatter, body: "", sections: {} }, new Set(tables.map((t) => t.id)), columnOwners);
}

describe("manualTenantPolicyFrontmatter", () => {
  // #1014: the form wrote the root's column as its bare name ("id"), so a strict policy
  // failed to load (orphaned_column_id) and a warn one saved with that warning.
  it("writes the root's tenant ID column as its stable ID, so a strict policy loads clean", () => {
    const frontmatter = manualTenantPolicyFrontmatter("shop", {
      enforcement: "strict",
      rootTableId: customers.id,
      rootTenantIdColumn: pick(customers, "id"),
      rootLabel: " Customer ",
      globalTableIds: [products.id],
      scopedTableColumns: {},
    });

    expect(frontmatter?.roots).toEqual([
      { id: "table:public.customers", tenantIdColumn: "table:public.customers#id", label: "Customer" },
    ]);
    expect(check(frontmatter!).warnings).toEqual([]);
  });

  // #1014: the form had no way to declare scoped tables, so its policy scoped none.
  it("scopes a table through the root by the column the user picks", () => {
    const frontmatter = manualTenantPolicyFrontmatter("shop", {
      enforcement: "strict",
      rootTableId: customers.id,
      rootTenantIdColumn: pick(customers, "id"),
      rootLabel: "Customer",
      globalTableIds: [products.id],
      scopedTableColumns: { [orders.id]: pick(orders, "customer_id") },
    });

    expect(frontmatter?.scopedTables).toEqual([
      { id: "table:public.orders", scopeThrough: [{ root: "table:public.customers", column: "table:public.orders#customer_id" }] },
    ]);
    const policy = check(frontmatter!);
    expect(policy.warnings).toEqual([]);
    expect(policy.coverage.map((c) => [c.tableId, c.classification])).toEqual(
      expect.arrayContaining([
        ["table:public.customers", "root"],
        ["table:public.orders", "scoped"],
        ["table:public.products", "global"],
      ]),
    );
  });

  it("drops a scoped choice for a table the user then made global", () => {
    const frontmatter = manualTenantPolicyFrontmatter("shop", {
      enforcement: "strict",
      rootTableId: customers.id,
      rootTenantIdColumn: pick(customers, "id"),
      rootLabel: "Customer",
      globalTableIds: [orders.id],
      scopedTableColumns: { [orders.id]: pick(orders, "customer_id") },
    });

    expect(frontmatter?.scopedTables).toBeUndefined();
    expect(frontmatter?.globalTables).toEqual(["table:public.orders"]);
  });
});
