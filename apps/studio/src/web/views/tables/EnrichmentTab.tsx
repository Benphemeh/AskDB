import { useState } from "react";
import { Loader2, Sparkles, ChevronRight } from "lucide-react";
import type { SuggestSource, TableDraft } from "@askdb/enrich";
import type { StudioTableDto } from "@/shared/api";
import { suggestionKey, useWorkspace } from "../../contexts/workspace-context";
import { Badge } from "../../components/ui/badge";
import { Field } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { ListInput } from "../../components/ui/list-input";
import { Textarea } from "../../components/ui/textarea";
import { tableSensitivity, UNKNOWN_COLUMN_SENSITIVITY } from "../../lib/sensitivity";
import { planSuggestAll, refusedSuggestColumns } from "../../lib/suggest-all";
import type { ReactNode } from "react";

export function EnrichmentTab() {
  const {
    workspace,
    selectedTable,
    selectedDraft,
    updateTableDraft,
    updateColumnDraft,
  } = useWorkspace();

  if (!selectedTable || !selectedDraft || !workspace) return null;

  const aiConfigured = workspace.aiConfigured;
  const table = selectedTable;
  const draft = selectedDraft;
  const tableId = table.physical.id;
  const sensitivity = tableSensitivity(table, draft);
  const omitSensitiveFromPrompt = workspace.omitSensitiveFromPrompt;
  const refusedColumns = refusedSuggestColumns(table, draft, { omitSensitiveFromPrompt });

  return (
    <div className="stack" style={{ padding: "var(--pad-y) var(--pad-x)" }}>
      {aiConfigured && (
        <SuggestAllBar
          key={tableId}
          table={table}
          draft={draft}
          omitSensitiveFromPrompt={omitSensitiveFromPrompt}
        />
      )}
      <section className="card">
        <div className="card-hd"><h3>Table Enrichment</h3></div>
        <div className="card-bd">
          <div style={{ display: "grid", gap: 16 }}>
            <FieldWithSuggest
              aiConfigured={aiConfigured}
              label="Description"
              source={{ scope: "table", tableId, field: "description" }}
            >
              <Textarea
                value={draft.description}
                onChange={(e) => updateTableDraft(tableId, (d) => ({ ...d, description: e.target.value }))}
              />
            </FieldWithSuggest>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
              <FieldWithSuggest
                aiConfigured={aiConfigured}
                label="Aliases"
                source={{ scope: "table", tableId, field: "aliases" }}
              >
                <ListInput
                  value={draft.aliases}
                  onChange={(v) => updateTableDraft(tableId, (d) => ({ ...d, aliases: v }))}
                />
              </FieldWithSuggest>
              <FieldWithSuggest
                aiConfigured={aiConfigured}
                label="Primary entity"
                source={{ scope: "table", tableId, field: "primaryEntity" }}
              >
                <Input
                  value={draft.primaryEntity ?? ""}
                  onChange={(e) =>
                    updateTableDraft(tableId, (d) => ({
                      ...d,
                      primaryEntity: e.target.value.trim() || undefined,
                    }))
                  }
                />
              </FieldWithSuggest>
            </div>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 220px" }}>
              <Field label="Tags" description="Comma-separated labels used for browsing and filtering.">
                <ListInput
                  value={draft.tags}
                  onChange={(v) => updateTableDraft(tableId, (d) => ({ ...d, tags: v }))}
                />
              </Field>
              <SensitiveSelect
                label="Table sensitivity override"
                value={draft.sensitive}
                forced={sensitivity.forced}
                onChange={(v) => updateTableDraft(tableId, (d) => ({ ...d, sensitive: v }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Common Query Language</h3></div>
        <div className="card-bd">
          <FieldWithSuggest
            aiConfigured={aiConfigured}
            label="Business vocabulary"
            source={{ scope: "table", tableId, field: "commonQueryLanguage" }}
          >
            <Textarea
              className="min-h-36"
              value={draft.commonQueryLanguage ?? ""}
              onChange={(e) => updateTableDraft(tableId, (d) => ({ ...d, commonQueryLanguage: e.target.value }))}
            />
          </FieldWithSuggest>
        </div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Example Questions</h3></div>
        <div className="card-bd">
          <Field label="Questions">
            <Textarea
              className="min-h-32"
              value={draft.exampleQuestions ?? ""}
              onChange={(e) => updateTableDraft(tableId, (d) => ({ ...d, exampleQuestions: e.target.value }))}
            />
          </Field>
        </div>
      </section>

      <section className="card">
        <div className="card-hd">
          <h3>Columns</h3>
          {table.missingColumnIds.length > 0 && (
            <Badge variant={table.missingColumnIds.length > 0 ? "warning" : "secondary"}>
              {table.missingColumnIds.length} missing
            </Badge>
          )}
        </div>
        <div className="card-bd">
          <div style={{ display: "grid", gap: 12 }}>
            {table.physical.columns.map((column) => {
              const columnDraft = draft.columns[column.id] ?? {};
              const columnSensitivity = sensitivity.columns[column.id] ?? UNKNOWN_COLUMN_SENSITIVITY;
              return (
                <section className="column-row" key={column.id}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600 }}>{column.name}</h4>
                        <Badge variant="outline">{column.type}</Badge>
                        {column.primaryKey && <Badge variant="secondary">PK</Badge>}
                        {column.nullable && <Badge variant="outline">nullable</Badge>}
                        {columnSensitivity.effective && <Badge variant="danger">sensitive</Badge>}
                      </div>
                      <p className="muted tiny" style={{ marginTop: 4, wordBreak: "break-all" }}>{column.id}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                    <FieldWithSuggest
                      aiConfigured={aiConfigured}
                      label="Description"
                      source={{ scope: "column", tableId, columnId: column.id, field: "description" }}
                      refused={refusedColumns.has(column.id)}
                    >
                      <Textarea
                        value={columnDraft.description ?? ""}
                        onChange={(e) =>
                          updateColumnDraft(tableId, column.id, (d) => ({ ...d, description: e.target.value }))
                        }
                      />
                    </FieldWithSuggest>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr", alignItems: "start" }}>
                      <FieldWithSuggest
                        aiConfigured={aiConfigured}
                        label="Aliases"
                        source={{ scope: "column", tableId, columnId: column.id, field: "aliases" }}
                        refused={refusedColumns.has(column.id)}
                      >
                        <ListInput
                          value={columnDraft.aliases}
                          onChange={(v) => updateColumnDraft(tableId, column.id, (d) => ({ ...d, aliases: v }))}
                        />
                      </FieldWithSuggest>
                      <Field label="Enum notes">
                        <ListInput
                          value={columnDraft.enum}
                          onChange={(v) => updateColumnDraft(tableId, column.id, (d) => ({ ...d, enum: v }))}
                        />
                      </Field>
                      <SensitiveSelect
                        label="Sensitivity override"
                        value={columnDraft.sensitive}
                        forced={columnSensitivity.forced}
                        onChange={(v) => updateColumnDraft(tableId, column.id, (d) => ({ ...d, sensitive: v }))}
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-hd"><h3>Relationships</h3></div>
        <div className="card-bd">
          {table.physical.relationships && table.physical.relationships.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {table.physical.relationships.map((rel, i) => (
                <div className="relationship-row" key={`${rel.from}-${rel.to}-${i}`}>
                  <span style={{ wordBreak: "break-all" }}>{rel.from}</span>
                  <ChevronRight size={14} style={{ color: "var(--ink-400)", flexShrink: 0 }} />
                  <span style={{ wordBreak: "break-all" }}>{rel.to}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>No relationships recorded for this table.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function FieldWithSuggest({
  aiConfigured,
  children,
  label,
  refused = false,
  source,
}: {
  aiConfigured: boolean;
  children: ReactNode;
  label: string;
  /** A sensitive column under `modes.omitSensitiveFromPrompt`: the server refuses Suggest for it (#639). */
  refused?: boolean;
  source: SuggestSource;
}) {
  const { suggestions, suggestingKeys, requestSuggestion, applySuggestion, dismissSuggestion } = useWorkspace();
  const key = suggestionKey(source);
  const suggesting = suggestingKeys.has(key);
  const suggestion = suggestions[key];
  const title = !aiConfigured
    ? "Configure an AI key to enable suggestions"
    : refused
      ? "This column is sensitive, and modes.omitSensitiveFromPrompt keeps it out of the model's prompt"
      : "Suggest with configured AI model";
  return (
    <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
        <button
          type="button"
          className="suggest-link"
          disabled={!aiConfigured || refused || suggesting}
          onClick={() => void requestSuggestion(source)}
          title={title}
        >
          {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Suggest
        </button>
      </div>
      {children}
      {suggestion && (
        <div className="inline-drafts" role="group" aria-label={`Drafts for ${label}`}>
          {suggestion.candidates.map((candidate) => (
            <div key={candidate.text} className="candidate">
              <p>{candidate.text}</p>
              <button type="button" className="btn sm" onClick={() => applySuggestion(source, candidate.text)}>
                Use
              </button>
            </div>
          ))}
          <div className="inline-drafts-ft">
            <span className="muted tiny">Draft{suggestion.candidates.length === 1 ? "" : "s"} from the model. Nothing is written until Use and Save.</span>
            <button type="button" className="btn ghost sm" onClick={() => dismissSuggestion(source)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Suggest all empty fields" for the open table (#952): states the number of model calls, and
 * the sensitive columns it skips, before it runs anything.
 */
function SuggestAllBar({
  draft,
  omitSensitiveFromPrompt,
  table,
}: {
  draft: TableDraft;
  omitSensitiveFromPrompt: boolean;
  table: StudioTableDto;
}) {
  const { suggestions, suggestAll, suggestAllProgress } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const plan = planSuggestAll(table, draft, { omitSensitiveFromPrompt });
  // A field already showing drafts doesn't need another call.
  const sources = plan.sources.filter((source) => !suggestions[suggestionKey(source)]);
  const calls = sources.length;
  const skipped = plan.skippedSensitive > 0
    ? ` ${plan.skippedSensitive} sensitive column${plan.skippedSensitive === 1 ? " is" : "s are"} skipped: modes.omitSensitiveFromPrompt keeps ${plan.skippedSensitive === 1 ? "it" : "them"} out of the model's prompt.`
    : "";

  if (suggestAllProgress) {
    return (
      <div className="suggest-all-bar" role="status">
        <Loader2 size={14} className="animate-spin" />
        <span>Drafting field {suggestAllProgress.done + 1} of {suggestAllProgress.total}…</span>
      </div>
    );
  }
  if (confirming && calls > 0) {
    return (
      <div className="suggest-all-bar">
        <span>
          Draft {calls} empty field{calls === 1 ? "" : "s"} with {calls} model call{calls === 1 ? "" : "s"}, one per field?{skipped}
        </span>
        <div className="suggest-all-actions">
          <button type="button" className="btn ghost sm" onClick={() => setConfirming(false)}>Cancel</button>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => {
              setConfirming(false);
              void suggestAll(sources);
            }}
          >
            Run {calls} call{calls === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="suggest-all-bar">
      <span className="muted">
        {calls > 0
          ? `${calls} empty description and alias field${calls === 1 ? "" : "s"} on this table.`
          : plan.sources.length > 0
            ? "Every empty description and alias field has drafts below. Use or Dismiss them."
            : `No empty description or alias fields to draft.${skipped}`}
      </span>
      <button type="button" className="btn sm" disabled={calls === 0} onClick={() => setConfirming(true)}>
        <Sparkles size={12} /> Suggest all empty fields
      </button>
    </div>
  );
}

function SensitiveSelect({
  forced,
  label,
  onChange,
  value,
}: {
  /** Sensitive regardless of the override, so "Not sensitive" could not take effect. */
  forced: boolean;
  label: string;
  onChange: (value: boolean | undefined) => void;
  value: boolean | undefined;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <select
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value === undefined ? "inherit" : value ? "true" : "false"}
        onChange={(e) => {
          if (e.target.value === "inherit") onChange(undefined);
          else onChange(e.target.value === "true");
        }}
      >
        <option value="inherit">Inherit physical metadata</option>
        <option value="true">Sensitive</option>
        <option value="false" disabled={forced}>Not sensitive</option>
      </select>
    </label>
  );
}
