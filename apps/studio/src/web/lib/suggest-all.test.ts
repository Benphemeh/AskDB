import { describe, expect, it } from "vitest";
import type { V2Table } from "@askdb/core";
import type { TableDraft } from "@askdb/enrich";
import { planSuggestAll } from "./suggest-all";

const tableId = "table:public.users";
const email = "table:public.users#email";
const name = "table:public.users#name";
const ssn = "table:public.users#ssn";

const physical: V2Table = {
  id: tableId,
  name: "users",
  schema: "public",
  columns: [
    { id: email, name: "email", type: "text", nullable: false, sensitive: true },
    { id: name, name: "name", type: "text", nullable: false },
    { id: ssn, name: "ssn", type: "text", nullable: true },
  ],
};

const saved: TableDraft = { description: "", columns: {} };

describe("planSuggestAll", () => {
  it("plans one model call per empty description and alias field, and none for filled ones", () => {
    const draft: TableDraft = {
      description: "One row per registered account.",
      columns: { [name]: { description: "  ", aliases: ["full name"] } },
    };

    const plan = planSuggestAll({ physical, draft: saved }, draft, { omitSensitiveFromPrompt: false });

    expect(plan.skippedSensitive).toBe(0);
    expect(plan.sources).toEqual([
      { scope: "table", tableId, field: "aliases" },
      { scope: "column", tableId, columnId: email, field: "description" },
      { scope: "column", tableId, columnId: email, field: "aliases" },
      { scope: "column", tableId, columnId: name, field: "description" },
      { scope: "column", tableId, columnId: ssn, field: "description" },
      { scope: "column", tableId, columnId: ssn, field: "aliases" },
    ]);
  });

  it("skips sensitive columns under omitSensitiveFromPrompt, by the saved marking (#639)", () => {
    const savedSsn: TableDraft = { description: "", columns: { [ssn]: { sensitive: true } } };

    const plan = planSuggestAll({ physical, draft: savedSsn }, savedSsn, { omitSensitiveFromPrompt: true });

    expect(plan.blockedByUnsavedSensitivity).toBe(false);
    expect(plan.skippedSensitive).toBe(2);
    expect(plan.sources).toEqual([
      { scope: "table", tableId, field: "description" },
      { scope: "table", tableId, field: "aliases" },
      { scope: "column", tableId, columnId: name, field: "description" },
      { scope: "column", tableId, columnId: name, field: "aliases" },
    ]);

    // Saved sensitive, unmarked in the draft: the server still reads the saved marking, so it stays skipped.
    const unmarked: TableDraft = { description: "", columns: { [ssn]: { sensitive: false } } };
    expect(planSuggestAll({ physical, draft: savedSsn }, unmarked, { omitSensitiveFromPrompt: true }).skippedSensitive).toBe(2);
  });

  // POST /api/suggest builds every prompt from the saved artifact, so a column marked sensitive only in the
  // unsaved draft would still be named, untagged, in any suggestion for its table.
  it.each<{ name: string; draft: TableDraft }>([
    { name: "a column", draft: { description: "", columns: { [ssn]: { sensitive: true } } } },
    { name: "the table", draft: { description: "", sensitive: true, columns: {} } },
  ])("plans nothing under omitSensitiveFromPrompt while $name is marked sensitive only in the unsaved draft", ({ draft }) => {
    const plan = planSuggestAll({ physical, draft: saved }, draft, { omitSensitiveFromPrompt: true });

    expect(plan.blockedByUnsavedSensitivity).toBe(true);
    expect(plan.sources).toEqual([]);
    // With omission off every column reaches the model anyway (only the (sensitive) tag differs), so nothing blocks.
    expect(planSuggestAll({ physical, draft: saved }, draft, { omitSensitiveFromPrompt: false }).blockedByUnsavedSensitivity).toBe(false);
  });
});
