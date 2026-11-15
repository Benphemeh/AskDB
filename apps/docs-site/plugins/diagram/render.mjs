// A parsed diagram to the HTML the page gets: a wide SVG, a narrow SVG, and a text alternative.
// src/styles/content.css shows one SVG by the figure's width and hides the text from sight. The
// text stays in the HTML for screen readers and for the page's Markdown twin, which prints it in
// place of the picture (src/utils/html-to-markdown.ts).
import { flowNarrow, flowWide } from "./flow.mjs";
import { parseDiagram } from "./parse.mjs";
import { sequence } from "./sequence.mjs";
import { escape } from "./svg.mjs";
import { plain, runs, unbroken } from "./text.mjs";

/** A label as HTML: backticks become <code>. */
const html = (label) => runs(unbroken(label)).map((run) => (run.mono ? `<code>${escape(run.text)}</code>` : escape(run.text))).join("");

/** What the picture says with its frame and its lane notes: who is inside a boundary, and each lane's note. */
function framing(diagram) {
  const { lanes, boundaries } = diagram;
  const lines = [];
  for (const boundary of boundaries) {
    const inside = lanes.slice(boundary.from, boundary.to + 1).map((lane) => html(lane.label));
    lines.push(`<li><strong>${html(boundary.label)}</strong> holds: ${inside.join(", ")}</li>`);
  }
  for (const lane of lanes) if (lane.note) lines.push(`<li><strong>${html(lane.label)}:</strong> ${html(lane.note)}</li>`);
  return lines.length ? `<ul class="dg-text-frame">${lines.join("")}</ul>` : "";
}

/**
 * The diagram in words. A flow: each step with its owner, then where it leads; a decision reads as
 * its question, then each answer and where that leads. A sequence: each message. Lane notes and
 * boundaries come first, so no fact is in the picture alone.
 */
export function textAlternative(diagram) {
  const { lanes, steps, links, groups } = diagram;
  const wrapper = (list) => `<div class="dg-text-alt">${framing(diagram)}${list}</div>`;
  if (diagram.kind === "sequence") {
    const name = new Map(lanes.map((lane) => [lane.id, lane.label]));
    const items = links.map((link) =>
      link.from === link.to
        ? `<li><strong>${html(name.get(link.from))}:</strong> ${html(link.label)}</li>`
        : `<li><strong>${html(name.get(link.from))} → ${html(name.get(link.to))}${link.dashed ? " (reply)" : ""}:</strong> ${html(link.label)}</li>`,
    );
    return wrapper(`<ol>${items.join("")}</ol>`);
  }
  const byId = new Map(steps.map((step) => [step.id, step]));
  const ordered = [...steps].sort((a, b) => a.row - b.row || a.lane - b.lane);
  const items = ordered.map((step) => {
    const group = step.group === undefined ? "" : ` (${html(groups[step.group].label)})`;
    const out = links
      .filter((link) => link.from === step.id)
      .map((link) =>
        step.decision
          ? `<li>${html(link.label)} → ${html(byId.get(link.to).label)}</li>`
          : `<li>→ ${html(byId.get(link.to).label)}${link.label ? `: ${html(link.label)}` : ""}${link.dashed ? " (optional)" : ""}</li>`,
      );
    return `<li><strong>${html(lanes[step.lane].label)}${group}:</strong> ${step.decision ? "Decision: " : ""}${html(step.label)}${out.length ? `<ul>${out.join("")}</ul>` : ""}</li>`;
  });
  return wrapper(`<ul>${items.join("")}</ul>`);
}

const svg = (layout, className, title) =>
  `<svg class="dg ${className}" xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escape(title)}">${layout.body}</svg>`;

/** The layouts of a parsed diagram: `wide` and `narrow`, each with its SVG body and its text boxes. */
export function layouts(diagram, id) {
  return diagram.kind === "flow"
    ? { wide: flowWide(diagram, `${id}-w`), narrow: flowNarrow(diagram, `${id}-n`) }
    : { wide: sequence(diagram, `${id}-w`, 700), narrow: sequence(diagram, `${id}-n`, 336) };
}

/** `diagram` fence source to HTML. `id` keeps the SVG ids unique on the page. */
export function renderDiagram(source, id) {
  const diagram = parseDiagram(source);
  const { wide, narrow } = layouts(diagram, id);
  const title = plain(diagram.title);
  return (
    `<div class="askdb-diagram" data-diagram="${diagram.kind}">` +
    svg(wide, "dg-wide", title) +
    svg(narrow, "dg-narrow", title) +
    textAlternative(diagram) +
    `</div>`
  );
}
