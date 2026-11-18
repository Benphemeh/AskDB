import { describe, expect, it } from "vitest";
import type { NormalizedSchemaV2 } from "@askdb/core";
import {
  buildSuggestionTarget,
  SuggestSourceNotFoundError,
  type SuggestSource,
} from "./suggest.js";

const schema: NormalizedSchemaV2 = {
  schemaId: "clinic",
  warnings: [],
  tables: [
    {
      id: "table:public.patients",
      name: "patients",
      schema: "public",
      sensitive: false,
      columns: [
        { id: "table:public.patients#id", name: "id", type: "uuid", nullable: false, primaryKey: true, sensitive: false },
        { id: "table:public.patients#diagnosis_code", name: "diagnosis_code", type: "text", nullable: false, primaryKey: false, sensitive: false },
      ],
    },
    {
      id: "table:public.visits",
      name: "visits",
      schema: "public",
      sensitive: false,
      columns: [
        { id: "table:public.visits#id", name: "id", type: "uuid", nullable: false, primaryKey: true, sensitive: false },
        { id: "table:public.visits#patient_id", name: "patient_id", type: "uuid", nullable: false, primaryKey: false, sensitive: false },
      ],
    },
  ],
};

function sourceOverrides(overrides: Partial<SuggestSource>): SuggestSource {
  return {
    scope: overrides.scope ?? "table",
    tableId: "table:public.patients",
    field: "description",
    ...overrides,
  } as SuggestSource;
}

describe("buildSuggestionTarget", () => {
  it("throws SuggestSourceNotFoundError for an unknown table", () => {
    let error: unknown;
    try {
      buildSuggestionTarget(schema, sourceOverrides({ scope: "table", tableId: "table:public.nonexistent" }));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SuggestSourceNotFoundError);
    expect((error as Error).message).toBe(`No such table: table:public.nonexistent`);
  });

  it("throws SuggestSourceNotFoundError for an unknown column in the requested table", () => {
    let error: unknown;
    try {
      buildSuggestionTarget(schema, sourceOverrides({
        scope: "column",
        columnId: "table:public.patients#nonexistent",
      }));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SuggestSourceNotFoundError);
    expect((error as Error).message).toBe("Column not found: table:public.patients#nonexistent in public.patients");
  });

  it("throws SuggestSourceNotFoundError for a column of another table (table-scoped, not schema-wide)", () => {
    let error: unknown;
    try {
      buildSuggestionTarget(schema, sourceOverrides({
        scope: "column",
        columnId: "table:public.visits#id",
      }));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SuggestSourceNotFoundError);
    expect((error as Error).message).toBe("Column not found: table:public.visits#id in public.patients");
  });

  it("returns a column target for a valid column of the requested table", () => {
    const target = buildSuggestionTarget(schema, sourceOverrides({
      scope: "column",
      columnId: "table:public.patients#diagnosis_code",
    }));
    expect(target.kind).toBe("column-description");
    if (target.kind === "column-description") {
      expect(target.table.id).toBe("table:public.patients");
      expect(target.columnId).toBe("table:public.patients#diagnosis_code");
    }
  });
});
