import type { SuggestSource, TableDraft } from "@askdb/enrich";
import type { StudioTableDto } from "@/shared/api";
import { tableSensitivity } from "./sensitivity";

export type SuggestAllPlan = {
  /** One model call each, in the order the Enrichment tab shows the fields. */
  sources: SuggestSource[];
  /** Sensitive columns left out because `modes.omitSensitiveFromPrompt` refuses Suggest on them (#639). */
  skippedSensitive: number;
};

/**
 * The empty description and alias fields of one table and its columns, for "Suggest all empty
 * fields" (#952), leaving out the columns `refusedSuggestColumns` names.
 */
export function planSuggestAll(
  table: Pick<StudioTableDto, "physical" | "draft" | "escalatedByOtherFiles">,
  draft: TableDraft,
  options: { omitSensitiveFromPrompt: boolean },
): SuggestAllPlan {
  const tableId = table.physical.id;
  const sources: SuggestSource[] = [];
  if (isBlank(draft.description)) sources.push({ scope: "table", tableId, field: "description" });
  if (!draft.aliases?.length) sources.push({ scope: "table", tableId, field: "aliases" });

  const refused = refusedSuggestColumns(table, draft, options);
  for (const column of table.physical.columns) {
    if (refused.has(column.id)) continue;
    const columnDraft = draft.columns[column.id] ?? {};
    if (isBlank(columnDraft.description)) {
      sources.push({ scope: "column", tableId, columnId: column.id, field: "description" });
    }
    if (!columnDraft.aliases?.length) {
      sources.push({ scope: "column", tableId, columnId: column.id, field: "aliases" });
    }
  }
  return { sources, skippedSensitive: refused.size };
}

/**
 * The columns Studio doesn't send to Suggest: under `omitSensitiveFromPrompt`, every column the
 * saved artifact (what `POST /api/suggest` reads, and refuses for) or the unsaved draft marks
 * sensitive (#639). Empty when the mode is off.
 */
export function refusedSuggestColumns(
  table: Pick<StudioTableDto, "physical" | "draft" | "escalatedByOtherFiles">,
  draft: TableDraft,
  options: { omitSensitiveFromPrompt: boolean },
): Set<string> {
  const refused = new Set<string>();
  if (!options.omitSensitiveFromPrompt) return refused;
  const saved = tableSensitivity(table, table.draft);
  const unsaved = tableSensitivity(table, draft);
  for (const column of table.physical.columns) {
    if (saved.columns[column.id]?.effective !== false || unsaved.columns[column.id]?.effective !== false) {
      refused.add(column.id);
    }
  }
  return refused;
}

function isBlank(text: string | undefined): boolean {
  return !text?.trim();
}
