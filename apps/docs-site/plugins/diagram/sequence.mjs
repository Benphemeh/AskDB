// The layout of a sequence: each actor is a column with a lifeline, and each message is a row.
// A message from an actor to itself is that actor's own step, drawn as a card on its lifeline.
// The same function draws the wide and the narrow copy, from different widths.
import { icon } from "./icons.mjs";
import { arrowMarker, linkLabel, round, textBlock } from "./svg.mjs";
import { blockWidth, runs, unbroken, wrap } from "./text.mjs";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function sequence(diagram, id, maxWidth = 700) {
  const { lanes, links, boundaries } = diagram;
  const n = lanes.length;
  const compact = maxWidth < 480;
  const FONT = compact ? 11.5 : 12.5;
  const LABEL = compact ? 11 : 12;
  const LINE = LABEL + 3;
  const bounded = boundaries.length > 0;
  const PADX = bounded ? 12 : 4;
  const PADY = 10;
  // Five actors on a phone get narrower columns, so the drawing keeps its size and its text stays readable.
  const colW = clamp(Math.floor((maxWidth - 2 * PADX) / n), n > 4 ? 64 : 78, 190);
  const width = 2 * PADX + n * colW;
  const cx = (index) => PADX + index * colW + colW / 2;
  const laneIndex = new Map(lanes.map((lane, index) => [lane.id, index]));
  const boxes = [];

  // Actor cards: the icon beside the label when there is room, above it on a phone.
  const cardW = colW - (compact ? 8 : 20);
  const room = compact ? cardW - 6 : cardW - 16 - 24;
  const HEAD = compact ? 11 : FONT;
  const headers = lanes.map((lane) => {
    const label = wrap(lane.label, room, HEAD);
    const note = lane.note ? wrap(lane.note, room, 11) : [];
    boxes.push({ lines: label, size: HEAD, room }, { lines: note, size: 11, room });
    const text = label.length * 15 + (note.length ? 3 + note.length * 13 : 0);
    return { label, note, height: compact ? 8 + 18 + 4 + text + 8 : 11 + text + 9 };
  });
  const top = PADY + (bounded ? 24 : 0);
  const headerH = Math.max(...headers.map((header) => header.height));

  // Rows.
  let y = top + headerH + 16;
  const rows = links.map((link) => {
    const from = laneIndex.get(link.from);
    const to = laneIndex.get(link.to);
    if (from === to) {
      const w = Math.min(colW - 10, 168);
      const lines = wrap(link.label, w - 18, FONT);
      boxes.push({ lines, size: FONT, room: w - 18 });
      const row = { link, own: true, lane: from, lines, w, h: 14 + lines.length * (FONT + 4), y };
      y += row.h + 16;
      return row;
    }
    const span = Math.abs(to - from) * colW;
    // A label may be wider than a short arrow: it sits on its own patch, above the line.
    const room = Math.max(span - 18, compact ? 104 : 130);
    const lines = wrap(link.label, room, LABEL);
    boxes.push({ lines, size: LABEL, room });
    const row = { link, from, to, lines, y: y + lines.length * LINE + 9 };
    y = row.y + 20;
    return row;
  });
  const bottom = y + 2;
  const height = bottom + PADY + (bounded ? 6 : 0);

  const marker = `${id}-arrow`;
  let out = `<defs>${arrowMarker(marker)}</defs>`;
  for (const boundary of boundaries) {
    const x = PADX + boundary.from * colW + (compact ? -1 : 2);
    const w = (boundary.to - boundary.from + 1) * colW - (compact ? -2 : 4);
    out += `<rect class="dg-boundary" x="${round(x)}" y="${round(top - 26)}" width="${round(w)}" height="${round(bottom - top + 34)}" rx="18"/>`;
    out += textBlock([runs(unbroken(boundary.label))], x + 14, top - 9, 11, 14, "start", "dg-boundary-label");
  }
  lanes.forEach((lane, index) => {
    const x = cx(index);
    out += `<path class="dg-lifeline dg-lifeline-${lane.kind}" d="M${round(x)} ${round(top + headerH)}V${round(bottom)}"/>`;
    out += `<circle class="dg-lifeline-end dg-lifeline-end-${lane.kind}" cx="${round(x)}" cy="${round(bottom)}" r="2.5"/>`;
    const { label, note } = headers[index];
    out += `<rect class="dg-node dg-actor dg-node-${lane.kind}" x="${round(x - cardW / 2)}" y="${round(top)}" width="${round(cardW)}" height="${round(headerH)}" rx="10"/>`;
    if (compact) {
      out += `<g class="dg-header dg-header-${lane.kind}">${icon(lane.kind, x - 9, top + 8, 18)}${textBlock(label, x, top + 8 + 18 + 4 + 11, HEAD, 15, "middle", "dg-header-label")}</g>`;
      if (note.length) out += textBlock(note, x, top + 8 + 18 + 4 + label.length * 15 + 13, 11, 13, "middle", "dg-note");
    } else {
      const block = Math.max(blockWidth(label, FONT), blockWidth(note, 11));
      const startX = x - (24 + block) / 2;
      const textTop = top + (headerH - (label.length * 15 + (note.length ? 3 + note.length * 13 : 0))) / 2;
      out += `<g class="dg-header dg-header-${lane.kind}">${icon(lane.kind, startX, top + headerH / 2 - 9, 18)}${textBlock(label, startX + 24, textTop + 11.5, FONT, 15, "start", "dg-header-label")}</g>`;
      if (note.length) out += textBlock(note, startX + 24, textTop + label.length * 15 + 3 + 10, 11, 13, "start", "dg-note");
    }
  });
  let labels = "";
  for (const row of rows) {
    if (row.own) {
      const x = cx(row.lane);
      const kind = lanes[row.lane].kind;
      out += `<rect class="dg-node dg-node-${kind}" x="${round(x - row.w / 2)}" y="${round(row.y)}" width="${round(row.w)}" height="${round(row.h)}" rx="9"/>`;
      out += textBlock(row.lines, x, row.y + 7 + FONT * 0.9, FONT, FONT + 4);
      continue;
    }
    const right = row.to > row.from;
    const x1 = cx(row.from) + (right ? 1 : -1);
    const x2 = cx(row.to) + (right ? -3 : 3);
    out += `<path class="dg-link${row.link.dashed ? " dg-link-dashed" : ""}" d="M${round(x1)} ${round(row.y)}H${round(x2)}" marker-end="url(#${marker})"/>`;
    labels += linkLabel(row.lines, (cx(row.from) + cx(row.to)) / 2, row.y - 6 - (row.lines.length * LINE + 4) / 2, LABEL, 2, width - 2);
  }
  return { width, height: round(height), body: out + labels, boxes };
}
