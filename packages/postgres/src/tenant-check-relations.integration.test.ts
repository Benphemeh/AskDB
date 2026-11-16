/**
 * The Postgres statistics relations `@askdb/core`'s tenant check refuses because they hold values
 * sampled from the rows of other tables (#929), checked against a real Postgres catalog.
 *
 * Protects: each name on that list is a relation in `pg_catalog` on the fixture's Postgres 17 (the
 * three views any role can read, and the two catalogs behind them), and the tenant check refuses
 * a read of it, bare and qualified. A misspelled entry would let the real relation through;
 * `pg_class` here is the independent source of the names. It also pins the sentence the docs
 * make about row-level security: each of the three views filters on `row_security_active`, so
 * Postgres hides a table's statistics from a role that table's row security applies to.
 * Catches: a typo in the list, or a name dropped from it, that the unit tests can't check against
 * a server; a Postgres release that renames one of the relations or drops the row-security filter.
 *
 * Skipped unless ASKDB_FIXTURE_HOST is set; CI sets it with ASKDB_REQUIRE_INTEGRATION=1.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSchema, validateTenantGuardrails } from "@askdb/core";
import { expect, it } from "vitest";
import { createPostgresCatalogQueryRunner } from "./exec/postgres.js";
import { integrationSuite } from "../../../scripts/test-utils/integration.mjs";
import { FIXTURE_HOST_ENV, connectionUrl } from "../../../fixtures/multi-engine/src/index.js";

const fixtureSuite = integrationSuite({ env: [FIXTURE_HOST_ENV] });

/** Views over the planner statistics. Any role can read them. */
const STATISTICS_VIEWS = ["pg_stats", "pg_stats_ext", "pg_stats_ext_exprs"];

/** The catalogs behind the views. A role reads them only when granted. */
const STATISTICS_CATALOGS = ["pg_statistic", "pg_statistic_ext_data"];

const RELATIONS = [...STATISTICS_VIEWS, ...STATISTICS_CATALOGS];

const here = dirname(fileURLToPath(import.meta.url));
const schema = loadSchema(join(here, "../../../fixtures/schemas/agency-multi-tenant.schema"));
const policy = { ...schema.tenantPolicy!, enforcement: "warn" as const };
const scope = { access: { kind: "ids" as const, tenantRoot: "table:public.agencies", ids: ["42"] } };

const quoted = (names: string[]) => names.map((name) => `'${name}'`).join(", ");

fixtureSuite("the tenant check's uncheckable Postgres relations (live Postgres)", () => {
  it("are relations in pg_catalog, and the tenant check refuses a read of each", async () => {
    const runner = createPostgresCatalogQueryRunner(connectionUrl("postgres", "reader"));
    const result = await runner(
      "SELECT c.relname, c.relkind FROM pg_catalog.pg_class c " +
        "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace " +
        `WHERE n.nspname = 'pg_catalog' AND c.relname IN (${quoted(RELATIONS)}) ORDER BY c.relname`,
    );
    const expected = [
      ...STATISTICS_VIEWS.map((name) => [name, "v"]),
      ...STATISTICS_CATALOGS.map((name) => [name, "r"]),
    ].sort(([a], [b]) => (a! < b! ? -1 : 1));
    expect(result.rows.map(([name, kind]) => [name, kind])).toEqual(expected);

    for (const name of RELATIONS) {
      for (const sql of [`SELECT * FROM ${name}`, `SELECT * FROM pg_catalog.${name}`]) {
        const warnings = validateTenantGuardrails(sql, policy, scope, { dialect: { id: "postgres" } }).warnings;
        expect(warnings.map((w) => w.rule), sql).toEqual(["UNCHECKABLE_RELATION"]);
      }
    }
  });

  it("each statistics view filters on row_security_active", async () => {
    const runner = createPostgresCatalogQueryRunner(connectionUrl("postgres", "reader"));
    const result = await runner(
      "SELECT viewname FROM pg_catalog.pg_views " +
        `WHERE schemaname = 'pg_catalog' AND viewname IN (${quoted(STATISTICS_VIEWS)}) ` +
        "AND definition LIKE '%row_security_active%' ORDER BY viewname",
    );
    expect(result.rows.map(([name]) => name)).toEqual([...STATISTICS_VIEWS].sort());
  });
});
