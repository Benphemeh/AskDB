// Small SVG builders shared by the layouts.
import { lineWidth } from "./text.mjs";

/** A coordinate to one decimal place. */
export const round = (value) => Math.round(value * 10) / 10;

export const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One line of runs as a <text>. `anchor` is start, middle or end. */
export function textLine(line, x, y, size, anchor = "middle", className = "dg-text") {
  const body = line.map((run) => (run.mono ? `<tspan class="dg-mono" font-size="${round(size * 0.94)}">${escape(run.text)}</tspan>` : escape(run.text))).join("");
  return `<text class="${className}" x="${round(x)}" y="${round(y)}" font-size="${size}" text-anchor="${anchor}" xml:space="preserve">${body}</text>`;
}

/** Wrapped lines, centered on `cx` when `anchor` is middle, with the first baseline at `y`. */
export function textBlock(lines, x, y, size, lineHeight, anchor = "middle", className = "dg-text") {
  return lines.map((line, index) => textLine(line, x, y + index * lineHeight, size, anchor, className)).join("");
}

/** A path through right-angle `points` with its corners rounded by `radius`. */
export function roundedPath(points, radius = 8) {
  const clean = points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]);
  let d = `M${round(clean[0][0])} ${round(clean[0][1])}`;
  for (let i = 1; i < clean.length; i++) {
    const [x, y] = clean[i];
    const next = clean[i + 1];
    if (!next) {
      d += `L${round(x)} ${round(y)}`;
      break;
    }
    const [px, py] = clean[i - 1];
    const before = Math.hypot(x - px, y - py);
    const after = Math.hypot(next[0] - x, next[1] - y);
    const r = Math.min(radius, before / 2, after / 2);
    const start = [x - (Math.sign(x - px) || 0) * r, y - (Math.sign(y - py) || 0) * r];
    const stop = [x + (Math.sign(next[0] - x) || 0) * r, y + (Math.sign(next[1] - y) || 0) * r];
    d += `L${round(start[0])} ${round(start[1])}Q${round(x)} ${round(y)} ${round(stop[0])} ${round(stop[1])}`;
  }
  return d;
}

/** The size of a link label's patch, for lines at `size` px. */
export function labelSize(lines, size) {
  return { width: Math.max(...lines.map((line) => lineWidth(line, size))) + 12, height: lines.length * (size + 3) + 4 };
}

/** A link's label on a small patch of the canvas color, centered on (cx, cy). Clamped to [minX, maxX]. */
export function linkLabel(lines, cx, cy, size, minX, maxX) {
  const { width, height } = labelSize(lines, size);
  const lineHeight = size + 3;
  const x = Math.min(Math.max(cx, minX + width / 2), maxX - width / 2);
  return (
    `<rect class="dg-label-bg" x="${round(x - width / 2)}" y="${round(cy - height / 2)}" width="${round(width)}" height="${round(height)}" rx="5"/>` +
    textBlock(lines, x, cy - height / 2 + 2 + size * 0.86, size, lineHeight, "middle", "dg-label")
  );
}

/** A group's label, as a tab on the top edge of its frame. A link that enters the group passes behind it. */
export function groupTab(lines, x, y, maxWidth) {
  const width = Math.min(maxWidth, Math.max(...lines.map((line) => lineWidth(line, 11))) + 16);
  // A label of more than one line grows the tab upward, so it never covers the group's first step.
  const height = groupTabHeight(lines);
  const top = y + 9 - height;
  return {
    rect: { x0: x, y0: top, x1: x + width, y1: y + 9 },
    svg: `<rect class="dg-group-tab" x="${round(x)}" y="${round(top)}" width="${round(width)}" height="${height}" rx="9"/>` + textBlock(lines, x + 8, top + 12.8, 11, 14, "start", "dg-group-label"),
  };
}

/** How tall a group's tab is for its wrapped label: 18 px for one line, 14 more for each further line. */
export const groupTabHeight = (lines) => 18 + (lines.length - 1) * 14;

/** A step's outline: a rounded card, or for a decision a card with pointed sides. */
export function nodeShape(kind, decision, x, y, w, h) {
  if (!decision) return `<rect class="dg-node dg-node-${kind}" x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="10"/>`;
  const c = 11;
  const d = `M${round(x + c)} ${round(y)}H${round(x + w - c)}L${round(x + w)} ${round(y + h / 2)}L${round(x + w - c)} ${round(y + h)}H${round(x + c)}L${round(x)} ${round(y + h / 2)}Z`;
  return `<path class="dg-node dg-node-${kind} dg-decision" d="${d}"/>`;
}

/** The arrowhead marker for one diagram. */
export const arrowMarker = (id) =>
  `<marker id="${id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path class="dg-arrowhead" d="M1.5 1.5 8.5 5 1.5 8.5"/></marker>`;
