// Parses a `diagram` fence. The format, line by line:
//
//   flow | sequence                      the kind, first
//   title: One sentence.                 the accessible name, required
//   lane <id> [<kind>]: Label | note     an actor; <kind> defaults to <id>
//   boundary Label: <lane> <lane>        a frame around neighbouring lanes ("Your stack")
//   # a note for maintainers             never reaches the page
//
// flow:
//   step <id> @<lane>: Label             a step the lane's actor owns, on a new row
//   + step <id> @<lane>: Label           the same, on the previous step's row
//   decide <id> @<lane>: Question?       a step that asks a question; its links are the answers
//   group Label: <step> <step>           a frame around steps of one lane, such as the ones inside `ask()`
//   a -> b: data                         a link; `..>` draws it dashed (a return, or optional)
//
// sequence:
//   a -> b: message                      between lanes; `..>` is a reply; a -> a is the actor's own step
//
// A lane's note follows the first " | " outside backticks. A group's steps are next to each other
// in their lane, and a link along a row has no step between its ends.
// Labels take `code` in backticks, and `\n` where a line must break. Authors never write a
// coordinate or a color. A flow has four lanes at most, a sequence five.

export const KINDS = ["app", "askdb", "model", "database", "files", "person", "agent", "service"];

/** Thrown for a diagram that can't be drawn. `line` counts from the line after the opening fence. */
export class DiagramError extends Error {
  constructor(message, line) {
    super(message);
    this.name = "DiagramError";
    this.line = line;
  }
}

const ID = "[A-Za-z][\\w-]*";
const LANE = new RegExp(`^lane\\s+(${ID})(?:\\s+(${ID}))?\\s*:\\s*(.+)$`);
const STEP = new RegExp(`^(\\+\\s*)?(step|decide)\\s+(${ID})\\s+@(${ID})\\s*:\\s*(.+)$`);
const MAX_LANES = { flow: 4, sequence: 5 };
const LINK = new RegExp(`^(${ID})\\s*(->|\\.\\.>)\\s*(${ID})(?:\\s*:\\s*(.+))?$`);

/** A lane's text to its label and its note: the note follows the first " | " that isn't inside backticks. */
function labelAndNote(text) {
  let code = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "`") code = !code;
    if (!code && text[i] === "|" && /\s/.test(text[i - 1] ?? " ") && /\s/.test(text[i + 1] ?? " ")) {
      return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
    }
  }
  return [text.trim(), undefined];
}

export function parseDiagram(source) {
  const diagram = { kind: undefined, title: undefined, lanes: [], boundaries: [], steps: [], groups: [], links: [] };
  const lanes = new Map();
  const steps = new Map();
  let row = -1;
  source.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    const at = index + 1;
    const fail = (message) => {
      throw new DiagramError(message, at);
    };
    if (line === "" || line.startsWith("#")) return;
    if (!diagram.kind) {
      if (line !== "flow" && line !== "sequence") fail(`the first line names the kind, "flow" or "sequence", not "${line}"`);
      diagram.kind = line;
      return;
    }
    let match;
    if ((match = line.match(/^title\s*:\s*(.+)$/))) {
      if (diagram.title) fail('the diagram has two "title:" lines: keep one');
      diagram.title = match[1];
    } else if ((match = line.match(LANE))) {
      const [, id, kind = id, text] = match;
      if (!KINDS.includes(kind)) fail(`lane "${id}" needs a kind, one of: ${KINDS.join(", ")}`);
      if (lanes.has(id)) fail(`lane "${id}" is declared twice`);
      if (steps.has(id)) fail(`"${id}" is already a step: a lane and a step can't share an id`);
      if (diagram.lanes.length === MAX_LANES[diagram.kind]) fail(`a ${diagram.kind} has ${MAX_LANES[diagram.kind]} lanes at most: merge two owners, or split the diagram`);
      const [label, note] = labelAndNote(text);
      if (label === "" || note === "") fail(`lane "${id}" needs a label${note === "" ? ', and a note after its " | "' : ""}`);
      const lane = { id, kind, label, note };
      lanes.set(id, lane);
      diagram.lanes.push(lane);
    } else if ((match = line.match(/^boundary\s+(.+?)\s*:\s*(.+)$/))) {
      const ids = match[2].trim().split(/\s+/);
      for (const id of ids) if (!lanes.has(id)) fail(`boundary "${match[1]}" names the lane "${id}", which isn't declared above it`);
      const indexes = ids.map((id) => diagram.lanes.indexOf(lanes.get(id))).sort((a, b) => a - b);
      if (indexes.some((value, i) => i > 0 && value !== indexes[i - 1] + 1)) fail(`boundary "${match[1]}" must hold lanes that are next to each other`);
      diagram.boundaries.push({ label: match[1], from: indexes[0], to: indexes[indexes.length - 1] });
    } else if (diagram.kind === "flow" && (match = line.match(/^group\s+(.+?)\s*:\s*([\w\s-]+)$/))) {
      const ids = match[2].trim().split(/\s+/);
      for (const id of ids) {
        if (!steps.has(id)) fail(`group "${match[1]}" names the step "${id}", which isn't declared above it`);
        if (steps.get(id).group !== undefined) fail(`step "${id}" is in two groups`);
        steps.get(id).group = diagram.groups.length;
      }
      if (new Set(ids.map((id) => steps.get(id).lane)).size > 1) fail(`group "${match[1]}" holds steps of more than one lane: a group frames steps of one lane (use "boundary" to frame lanes)`);
      // The frame is drawn around the group's steps, so a step of the same lane between them would
      // sit inside it without being in the group.
      const rows = ids.map((id) => steps.get(id).row);
      const between = diagram.steps.find((step) => step.lane === steps.get(ids[0]).lane && !ids.includes(step.id) && step.row > Math.min(...rows) && step.row < Math.max(...rows));
      if (between) fail(`group "${match[1]}" skips the step "${between.id}", which sits between its steps in the same lane: add it to the group, or move it`);
      diagram.groups.push({ label: match[1], steps: ids });
    } else if (diagram.kind === "flow" && (match = line.match(STEP))) {
      const [, sameRow, form, id, laneId, label] = match;
      if (!lanes.has(laneId)) fail(`step "${id}" is in the lane "${laneId}", which isn't declared`);
      if (steps.has(id)) fail(`step "${id}" is declared twice`);
      if (lanes.has(id)) fail(`"${id}" is already a lane: a lane and a step can't share an id`);
      if (sameRow && row < 0) fail(`step "${id}" starts with "+", but there is no step before it`);
      if (!sameRow) row++;
      const lane = diagram.lanes.indexOf(lanes.get(laneId));
      if (diagram.steps.some((step) => step.row === row && step.lane === lane)) fail(`step "${id}" shares a row and a lane with another step: drop its "+"`);
      const step = { id, lane, row, label, group: undefined, decision: form === "decide" };
      steps.set(id, step);
      diagram.steps.push(step);
    } else if ((match = line.match(LINK))) {
      const [, from, arrow, to, label] = match;
      const ends = diagram.kind === "flow" ? steps : lanes;
      const noun = diagram.kind === "flow" ? "step" : "lane";
      for (const id of [from, to]) if (!ends.has(id)) fail(`the link "${from} ${arrow} ${to}" names the ${noun} "${id}", which isn't declared`);
      if (diagram.kind === "flow" && from === to) fail(`step "${from}" links to itself`);
      if (diagram.kind === "sequence" && !label) fail(`the message "${from} ${arrow} ${to}" needs a label`);
      diagram.links.push({ from, to, label, dashed: arrow === "..>" });
    } else {
      fail(`can't read "${line}"`);
    }
  });
  const end = source.split("\n").length;
  if (!diagram.kind) throw new DiagramError('the diagram is empty: start with "flow" or "sequence"', 1);
  if (!diagram.title) throw new DiagramError('the diagram needs a "title:" line, its accessible name', end);
  if (diagram.lanes.length === 0) throw new DiagramError("the diagram declares no lane", end);
  if (diagram.kind === "flow" && diagram.steps.length === 0) throw new DiagramError("the flow has no step", end);
  if (diagram.kind === "sequence" && diagram.links.length === 0) throw new DiagramError("the sequence has no message", end);
  if (diagram.kind === "flow") {
    const used = new Set(diagram.steps.map((step) => step.lane));
    const empty = diagram.lanes.find((_, index) => !used.has(index));
    if (empty) throw new DiagramError(`lane "${empty.id}" holds no step`, end);
    // A link along a row is one straight line, so a step between its ends would look like a stop on the way.
    const stepOf = new Map(diagram.steps.map((step) => [step.id, step]));
    for (const link of diagram.links) {
      const a = stepOf.get(link.from);
      const b = stepOf.get(link.to);
      if (a.row !== b.row) continue;
      const passed = diagram.steps.find((step) => step.row === a.row && step.lane > Math.min(a.lane, b.lane) && step.lane < Math.max(a.lane, b.lane));
      if (passed) throw new DiagramError(`the link "${link.from} ${link.dashed ? "..>" : "->"} ${link.to}" runs along a row through the step "${passed.id}": put one of the three steps on another row`, end);
    }
    for (const step of diagram.steps.filter((step) => step.decision)) {
      const answers = diagram.links.filter((link) => link.from === step.id);
      if (answers.length < 2 || answers.some((link) => !link.label)) throw new DiagramError(`the decision "${step.id}" needs two or more links out, each labelled with its answer`, end);
    }
  }
  return diagram;
}
