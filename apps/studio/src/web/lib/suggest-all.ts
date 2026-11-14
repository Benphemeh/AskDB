import type { SuggestSource, TableDraft } from "@askdb/enrich";
import type { StudioTableDto } from "@/shared/api";
import { tableSensitivity } from "./sensitivity";

export type SuggestAllPlan = {
  /** One model call each, in the order the Enrichment tab shows the fields. */
  sources: SuggestSource[];
  /** Columns Suggest won't run for: sensitive ones under `modes.omitSensitiveFromPrompt` (#639). */
  refusedColumns: Set<string>;
  skippedSensitive: number;
  /**
   * Under `omitSensitiveFromPrompt`, the unsaved draft marks the table or a column sensitive that the
   * saved artifact doesn't. `POST /api/suggest` builds every prompt from the saved artifact, so any
   * suggestion for this table would still name that column; Suggest waits for Save.
   */
  blockedByUnsavedSensitivity: boolean;
};

/**
 * The empty description and alias fields of one table and its columns, for "Suggest all empty
 * fields" (#952), and which columns Suggest refuses. Under `omitSensitiveFromPrompt`, a column is
 * refused when the saved artifact (what `POST /api/suggest` reads) or the unsaved draft marks it.
 */
export function planSuggestAll(
  table: Pick<StudioTableDto, "physical" | "draft" | "escalatedByOtherFiles">,
  draft: TableDraft,
  options: { omitSensitiveFromPrompt: boolean },
): SuggestAllPlan {
  const tableId = table.physical.id;
  const saved = tableSensitivity(table, table.draft);
  const unsaved = tableSensitivity(table, draft);
  const refusedColumns = new Set<string>();
  let blockedByUnsavedSensitivity = false;
  if (options.omitSensitiveFromPrompt) {
    blockedByUnsavedSensitivity = unsaved.effective && !saved.effective;
    for (const column of table.physical.columns) {
      const savedSensitive = saved.columns[column.id]?.effective !== false;
      const unsavedSensitive = unsaved.columns[column.id]?.effective !== false;
      if (unsavedSensitive && !savedSensitive) blockedByUnsavedSensitivity = true;
      if (savedSensitive || unsavedSensitive) refusedColumns.add(column.id);
    }
  }

  const sources: SuggestSource[] = [];
  if (!blockedByUnsavedSensitivity) {
    if (isBlank(draft.description)) sources.push({ scope: "table", tableId, field: "description" });
    if (!draft.aliases?.length) sources.push({ scope: "table", tableId, field: "aliases" });
    for (const column of table.physical.columns) {
      if (refusedColumns.has(column.id)) continue;
      const columnDraft = draft.columns[column.id] ?? {};
      if (isBlank(columnDraft.description)) {
        sources.push({ scope: "column", tableId, columnId: column.id, field: "description" });
      }
      if (!columnDraft.aliases?.length) {
        sources.push({ scope: "column", tableId, columnId: column.id, field: "aliases" });
      }
    }
  }
  return { sources, refusedColumns, skippedSensitive: refusedColumns.size, blockedByUnsavedSensitivity };
}

/** One field's key in Studio's suggestion state. */
export function suggestionKey(source: SuggestSource): string {
  if (source.scope === "table") return `table:${source.tableId}:${source.field}`;
  return `column:${source.tableId}:${source.columnId}:${source.field}`;
}

function isBlank(text: string | undefined): boolean {
  return !text?.trim();
}
