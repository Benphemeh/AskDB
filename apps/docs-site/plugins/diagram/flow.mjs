// The two layouts of a flow. Wide: each actor is a lane, a column, and a step sits in its owner's
// lane, on its row. Narrow (a phone): the steps are one stack of cards, each tagged with its owner.
// Both come from the same parsed diagram, and the stylesheet shows one of them by container width.
import { icon, round } from "./icons.mjs";
import { arrowMarker, groupTab, labelSize, linkLabel, nodeShape, roundedPath, textBlock } from "./svg.mjs";
import { blockWidth, lineWidth, runs, unbroken, wrap } from "./text.mjs";

const FONT = 13;
const LINE = 18;
const LABEL = 11.5;
/** A decision's pointed sides take this much of its width on each side. */
const POINT = 10;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const oneLine = (label) => [runs(unbroken(label))];
const overlap = (a, b, pad = 2) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + pad) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + pad);

/**
 * Puts each link label on its own link, clear of every step, header and other label. A label tries
 * the middle of the link's longest run first, then other points along the link, and takes the
 * first that touches nothing. `obstacles` are rectangles {x0, y0, x1, y1}.
 */
function labelPlacer(obstacles, width, height) {
  const placed = [];
  return (lines, points, preferred) => {
    const size = labelSize(lines, LABEL);
    const candidates = preferred ? [preferred] : [];
    const segments = points.slice(1).map((point, index) => ({ from: points[index], to: point, last: index === points.length - 2 }));
    const length = (segment) => Math.abs(segment.to[0] - segment.from[0]) + Math.abs(segment.to[1] - segment.from[1]);
    const horizontal = (segment) => segment.from[1] === segment.to[1];
    const ordered = [...segments.filter(horizontal).sort((a, b) => length(b) - length(a)), ...segments.filter((segment) => !horizontal(segment)).sort((a, b) => length(b) - length(a))];
    for (const segment of ordered) {
      if (length(segment) < 12) continue;
      // Near its end a link has its arrowhead: the label keeps off it.
      const stops = segment.last && segments.length > 1 ? [0.5, 0.35, 0.2] : [0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9];
      for (const t of stops) candidates.push([segment.from[0] + (segment.to[0] - segment.from[0]) * t, segment.from[1] + (segment.to[1] - segment.from[1]) * t]);
    }
    let best;
    for (const [x, y] of candidates) {
      const cx = clamp(x, 4 + size.width / 2, width - 4 - size.width / 2);
      const cy = clamp(y, 4 + size.height / 2, height - 4 - size.height / 2);
      const rect = { x0: cx - size.width / 2, y0: cy - size.height / 2, x1: cx + size.width / 2, y1: cy + size.height / 2 };
      const cost = [...obstacles, ...placed].reduce((sum, other) => sum + overlap(rect, other), 0);
      if (!best || cost < best.cost) best = { cx, cy, rect, cost };
      if (cost === 0) break;
    }
    placed.push(best.rect);
    return linkLabel(lines, best.cx, best.cy, LABEL, 4, width - 4);
  };
}

/** Lays the lanes out as columns. Returns the SVG and, for tests, every text box with its room. */
export function flowWide(diagram, id, maxWidth = 700) {
  const { lanes, steps, links, groups, boundaries } = diagram;
  const n = lanes.length;
  const byId = new Map(steps.map((step) => [step.id, step]));
  const bounded = boundaries.length > 0;
  const PADX = bounded ? 20 : 12;
  const PADY = 12;
  const LANE_PAD = 14;
  const boxes = [];

  // Link labels wrap. One between two steps on a row, in neighbouring lanes, sits in the gap between
  // those lanes, so it wraps narrow and only that gap grows to hold it.
  const gaps = Array(Math.max(0, n - 1)).fill(bounded ? 18 : 16);
  const labelLines = new Map();
  for (const link of links) {
    if (!link.label) continue;
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    const inGap = a.row === b.row && Math.abs(a.lane - b.lane) === 1;
    const room = inGap ? 92 : 150;
    const lines = wrap(link.label, room, LABEL);
    labelLines.set(link, lines);
    boxes.push({ lines, size: LABEL, room });
    if (inGap) {
      const gap = Math.min(a.lane, b.lane);
      gaps[gap] = Math.max(gaps[gap], labelSize(lines, LABEL).width + 32 - 2 * LANE_PAD);
    }
  }
  const textRoom = (step, nodeW) => nodeW - 24 - (step.decision ? 2 * POINT : 0);
  // Each lane is as wide as its longest step wants, up to a cap. When the lanes together are wider
  // than the column, they shrink in proportion, and the steps wrap.
  const wants = lanes.map((lane, index) => {
    const own = steps.filter((step) => step.lane === index).map((step) => Math.max(...wrap(step.label, 1000, FONT).map((line) => lineWidth(line, FONT))) + 26 + (step.decision ? 2 * POINT : 0));
    const header = lineWidth(runs(lane.label), 12.5) + 24 + 12;
    // One or two lanes have the column to themselves, so a step may be wider before it wraps.
    return clamp(Math.max(header - 2 * LANE_PAD, ...own), 112, n <= 2 ? 264 : 216);
  });
  const available = maxWidth - 2 * PADX - gaps.reduce((sum, gap) => sum + gap, 0) - n * 2 * LANE_PAD;
  // Lanes that want less than an even share keep what they want; the rest split what is left.
  const nodeWs = wants.map(() => 0);
  let left = available;
  let open = wants.map((_, index) => index).sort((a, b) => wants[a] - wants[b]);
  while (open.length) {
    const share = Math.floor(left / open.length);
    const index = open[0];
    nodeWs[index] = Math.max(96, Math.min(wants[index], share));
    left -= nodeWs[index];
    open = open.slice(1);
  }
  const laneWs = nodeWs.map((w) => w + 2 * LANE_PAD);
  const laneXs = laneWs.map((_, index) => PADX + laneWs.slice(0, index).reduce((sum, w, i) => sum + w + gaps[i], 0));
  const laneX = (index) => laneXs[index];
  const width = laneXs[n - 1] + laneWs[n - 1] + PADX;

  // Lane headers.
  const headers = lanes.map((lane, index) => {
    const laneW = laneWs[index];
    const label = wrap(lane.label, laneW - 16 - 24, 12.5);
    const note = lane.note ? wrap(lane.note, laneW - 16, 11) : [];
    boxes.push({ lines: label, size: 12.5, room: laneW - 16 - 24 }, { lines: note, size: 11, room: laneW - 16 });
    return { label, note, height: 12 + label.length * 16 + (note.length ? 2 + note.length * 14 : 0) + 6 };
  });
  const headerH = Math.max(...headers.map((header) => header.height));
  const laneTop = PADY + (bounded ? 24 : 0);
  const groupFirstRow = groups.map((group) => Math.min(...group.steps.map((s) => byId.get(s).row)));
  const groupLastRow = groups.map((group) => Math.max(...group.steps.map((s) => byId.get(s).row)));
  // A group that opens on the first row needs room for its label under the lane header.
  const bodyTop = laneTop + headerH + 8 + (groupFirstRow.includes(0) ? 24 : 0);

  // Steps and rows.
  const nodes = new Map();
  const rowCount = Math.max(...steps.map((step) => step.row)) + 1;
  const rowH = Array(rowCount).fill(0);
  for (const step of steps) {
    const nodeW = nodeWs[step.lane];
    const lines = wrap(step.label, textRoom(step, nodeW), FONT);
    boxes.push({ lines, size: FONT, room: textRoom(step, nodeW) });
    const node = { step, lines, x: laneX(step.lane) + LANE_PAD, w: nodeW, h: 20 + lines.length * LINE };
    node.cx = node.x + nodeW / 2;
    nodes.set(step.id, node);
    rowH[step.row] = Math.max(rowH[step.row], node.h);
  }

  // Links: how each one travels, and which track of a gap its horizontal run takes.
  const gapRuns = Array.from({ length: rowCount }, () => []);
  const gapLabelH = Array(rowCount).fill(0);
  const labelH = (link) => (labelLines.has(link) ? labelSize(labelLines.get(link), LABEL).height : 0);
  const plans = links.map((link) => {
    const a = nodes.get(link.from);
    const b = nodes.get(link.to);
    const dRow = b.step.row - a.step.row;
    const forward = dRow > 0;
    let type;
    if (dRow === 0) type = "row";
    else if (Math.abs(dRow) === 1) type = a.step.lane === b.step.lane ? "straight" : "drop";
    else type = a.step.lane === b.step.lane ? "side" : "channel";
    const plan = { link, a, b, type, forward };
    if (type === "straight") {
      const gap = Math.min(a.step.row, b.step.row);
      gapLabelH[gap] = Math.max(gapLabelH[gap], labelH(link));
    }
    if (type === "drop" || type === "channel") {
      plan.gap = type === "drop" ? Math.min(a.step.row, b.step.row) : forward ? a.step.row : a.step.row - 1;
      plan.endX = type === "drop" ? b.cx : a.cx < b.cx ? b.x - 14 : b.x + b.w + 14;
      const [x1, x2] = [Math.min(a.cx, plan.endX), Math.max(a.cx, plan.endX)];
      const runsHere = gapRuns[plan.gap];
      let track = 0;
      // Unlabelled links into one step, or out of one step, share a track; a labelled link has its
      // own, so its label sits on a run that is only its own.
      const shares = (run) => !link.label && !run.label && ((type === "drop" && run.type === "drop" && run.to === link.to) || run.from === link.from);
      for (;;) {
        const taken = runsHere.some((run) => run.track === track && !shares(run) && run.x1 < x2 + 8 && x1 < run.x2 + 8);
        if (!taken) break;
        track++;
      }
      plan.track = track;
      runsHere.push({ track, x1, x2, from: link.from, to: link.to, type, label: link.label });
      gapLabelH[plan.gap] = Math.max(gapLabelH[plan.gap], labelH(link));
    }
    return plan;
  });
  const reversed = (plan) => plans.find((other) => other !== plan && other.link.from === plan.link.to && other.link.to === plan.link.from);
  // A pair of links there and back on one row run one above the other, far enough apart for both labels.
  for (const plan of plans) {
    const back = plan.type === "row" && reversed(plan);
    plan.offset = back ? Math.max(11, Math.max(labelH(plan.link), labelH(back.link)) / 2 + 2) : 0;
    if (back) rowH[plan.a.step.row] = Math.max(rowH[plan.a.step.row], 2 * plan.offset + 14);
  }
  // A link down a lane past other steps runs beside them: on the right, or on the left when links
  // to a lane on the right leave from the same rows, so the two don't cross. Links from one step
  // share a rail; others take the next one out.
  const sides = plans.filter((plan) => plan.type === "side");
  for (const plan of sides) {
    const [lo, hi] = [Math.min(plan.a.step.row, plan.b.step.row), Math.max(plan.a.step.row, plan.b.step.row)];
    plan.rows = [lo, hi];
    const crossing = (toRight) =>
      plans.filter((other) => {
        if (other.type === "side" || other.type === "straight") return false;
        const lane = plan.a.step.lane;
        const touches = other.a.step.lane === lane || other.b.step.lane === lane;
        const away = other.a.step.lane === lane ? other.b.step.lane : other.a.step.lane;
        const row = other.a.step.lane === lane ? other.a.step.row : other.b.step.row;
        return touches && (toRight ? away > lane : away < lane) && row >= lo && row <= hi;
      }).length;
    plan.left = crossing(true) > crossing(false);
  }
  sides.forEach((plan, index) => {
    let rail = 0;
    const clash = (other) => other.left === plan.left && other.a.step.lane === plan.a.step.lane && other.link.from !== plan.link.from && other.rows[0] < plan.rows[1] && plan.rows[0] < other.rows[1];
    while (sides.slice(0, index).some((other) => other.rail === rail && clash(other))) rail++;
    plan.rail = rail;
  });

  const gapH = [];
  const trackY = [];
  const rowTop = [bodyTop];
  for (let row = 0; row < rowCount; row++) {
    const tracks = gapRuns[row].length ? Math.max(...gapRuns[row].map((run) => run.track)) + 1 : 0;
    const spacing = Math.max(22, gapLabelH[row] + 6);
    const closes = groupLastRow.includes(row) ? 10 : 0;
    const opens = groupFirstRow.includes(row + 1) ? 22 : 0;
    const inner = Math.max(40, 18 + tracks * spacing + 14, gapLabelH[row] + 32);
    gapH[row] = closes + inner + opens;
    const top = rowTop[row] + rowH[row] + closes;
    trackY[row] = (track) => (tracks <= 1 ? top + inner / 2 : top + 16 + spacing / 2 + track * spacing);
    rowTop[row + 1] = rowTop[row] + rowH[row] + gapH[row];
  }
  for (const node of nodes.values()) {
    node.y = rowTop[node.step.row] + (rowH[node.step.row] - node.h) / 2;
    node.cy = node.y + node.h / 2;
  }
  const laneBottom = rowTop[rowCount - 1] + rowH[rowCount - 1] + (groupLastRow.includes(rowCount - 1) ? 20 : 14);
  const height = laneBottom + PADY + (bounded ? 8 : 0);

  const marker = `${id}-arrow`;
  let out = `<defs>${arrowMarker(marker)}</defs>`;
  const obstacles = [];
  let tabs = "";

  for (const boundary of boundaries) {
    const x = laneX(boundary.from) - 8;
    const w = laneX(boundary.to) + laneWs[boundary.to] + 8 - x;
    out += `<rect class="dg-boundary" x="${round(x)}" y="${round(laneTop - 26)}" width="${round(w)}" height="${round(laneBottom - laneTop + 34)}" rx="18"/>`;
    out += textBlock(oneLine(boundary.label), x + 14, laneTop - 9, 11, 14, "start", "dg-boundary-label");
  }
  lanes.forEach((lane, index) => {
    const x = laneX(index);
    const laneW = laneWs[index];
    out += `<rect class="dg-lane dg-lane-${lane.kind}" x="${round(x)}" y="${round(laneTop)}" width="${laneW}" height="${round(laneBottom - laneTop)}" rx="14"/>`;
    const { label, note } = headers[index];
    const block = blockWidth(label, 12.5);
    const startX = x + (laneW - (24 + block)) / 2;
    out += `<g class="dg-header dg-header-${lane.kind}">${icon(lane.kind, startX, laneTop + 11, 18)}${textBlock(label, startX + 24, laneTop + 24.5, 12.5, 16, "start", "dg-header-label")}</g>`;
    if (note.length) out += textBlock(note, x + laneW / 2, laneTop + 12 + label.length * 16 + 13, 11, 14, "middle", "dg-note");
    obstacles.push({ x0: x, y0: laneTop, x1: x + laneW, y1: laneTop + headers[index].height });
  });
  groups.forEach((group) => {
    const members = group.steps.map((s) => nodes.get(s));
    const x0 = Math.min(...members.map((m) => m.x)) - 8;
    const x1 = Math.max(...members.map((m) => m.x + m.w)) + 8;
    const y0 = Math.min(...members.map((m) => m.y)) - 18;
    const y1 = Math.max(...members.map((m) => m.y + m.h)) + 10;
    out += `<rect class="dg-group" x="${round(x0)}" y="${round(y0)}" width="${round(x1 - x0)}" height="${round(y1 - y0)}" rx="12"/>`;
    const label = wrap(unbroken(group.label), x1 - x0 - 36, 11).slice(0, 1);
    boxes.push({ lines: label, size: 11, room: x1 - x0 - 36 });
    const tab = groupTab(label, x0 + 10, y0, x1 - x0 - 20);
    tabs += tab.svg;
    obstacles.push(tab.rect);
  });
  for (const node of nodes.values()) obstacles.push({ x0: node.x, y0: node.y, x1: node.x + node.w, y1: node.y + node.h });

  const place = labelPlacer(obstacles, width, height);
  let labels = "";
  for (const plan of plans) {
    const { a, b, type, forward, link } = plan;
    let points;
    let at;
    if (type === "straight") {
      const x = a.cx + (reversed(plan) ? (forward ? -12 : 12) : 0);
      points = forward ? [[x, a.y + a.h], [x, b.y - 1]] : [[x, a.y], [x, b.y + b.h + 1]];
      at = [x, (points[0][1] + points[1][1]) / 2];
    } else if (type === "row") {
      const right = a.cx < b.cx;
      const y = a.cy + (right ? -plan.offset : plan.offset);
      points = [[right ? a.x + a.w : a.x, y], [right ? b.x - 1 : b.x + b.w + 1, y]];
      at = [(points[0][0] + points[1][0]) / 2, y];
    } else if (type === "drop") {
      const y = trackY[plan.gap](plan.track);
      points = forward ? [[a.cx, a.y + a.h], [a.cx, y], [b.cx, y], [b.cx, b.y - 1]] : [[a.cx, a.y], [a.cx, y], [b.cx, y], [b.cx, b.y + b.h + 1]];
      at = [(a.cx + b.cx) / 2, y];
    } else if (type === "channel") {
      const y = trackY[plan.gap](plan.track);
      const side = a.cx < b.cx ? b.x - 1 : b.x + b.w + 1;
      points = [[a.cx, forward ? a.y + a.h : a.y], [a.cx, y], [plan.endX, y], [plan.endX, b.cy], [side, b.cy]];
      at = [(a.cx + plan.endX) / 2, y];
    } else {
      const reach = 10 + plan.rail * 7;
      const x = plan.left ? a.x - reach : a.x + a.w + reach;
      points = plan.left ? [[a.x, a.cy], [x, a.cy], [x, b.cy], [b.x - 1, b.cy]] : [[a.x + a.w, a.cy], [x, a.cy], [x, b.cy], [b.x + b.w + 1, b.cy]];
      at = undefined;
    }
    out += `<path class="dg-link${link.dashed ? " dg-link-dashed" : ""}" d="${roundedPath(points)}" marker-end="url(#${marker})"/>`;
    if (link.label) labels += place(labelLines.get(link), points, at);
  }
  out += tabs;

  for (const node of nodes.values()) {
    const kind = lanes[node.step.lane].kind;
    out += nodeShape(kind, node.step.decision, node.x, node.y, node.w, node.h);
    out += textBlock(node.lines, node.cx, node.y + 10 + LINE * 0.72, FONT, LINE);
  }
  return { width, height: round(height), body: out + labels, boxes };
}

/** Lays the steps out as one stack of cards, for a narrow column. */
export function flowNarrow(diagram, id, width = 336) {
  const { lanes, links, groups } = diagram;
  const steps = [...diagram.steps].sort((a, b) => a.row - b.row || a.lane - b.lane);
  const index = new Map(steps.map((step, i) => [step.id, i]));
  const PAD = 8;
  const boxes = [];

  // A link between neighbours runs down the spine. Any other link takes a rail on the right.
  const spine = new Map();
  const rails = [];
  for (const link of links) {
    const i = index.get(link.from);
    const j = index.get(link.to);
    if (j === i + 1 && !spine.has(i)) spine.set(i, link);
    else rails.push({ link, i, j, lo: Math.min(i, j), hi: Math.max(i, j) });
  }
  for (const rail of rails) {
    let lane = 0;
    // Links out of one step share a rail, as one line that branches; others take the next rail out.
    while (rails.some((other) => other.lane === lane && other !== rail && other.link.from !== rail.link.from && other.lo < rail.hi && rail.lo < other.hi)) lane++;
    rail.lane = lane;
  }
  const railCount = rails.length ? Math.max(...rails.map((rail) => rail.lane)) + 1 : 0;
  const right = width - PAD - (railCount ? railCount * 12 + 8 : 0);
  const fullW = right - PAD;
  const centerX = PAD + fullW / 2;
  // A rail link leaves its card right of the spine, and its label sits on the run from there to the rail.
  const leaveX = centerX + 26;
  const railRoom = right + 4 - leaveX - 16;

  const groupOf = (step) => step.group;
  const cards = steps.map((step) => {
    const inset = groupOf(step) === undefined ? 0 : 8;
    const w = fullW - 2 * inset;
    const room = w - 24 - (step.decision ? 2 * POINT : 0);
    const lines = wrap(step.label, room, FONT);
    boxes.push({ lines, size: FONT, room });
    return { step, lines, x: PAD + inset, w, h: 12 + 16 + 6 + lines.length * LINE + 10 };
  });

  // Each gap holds a band for the spine link's label, then one for each rail link that leaves through it.
  const bands = cards.map(() => []);
  for (const [i, link] of spine) {
    if (!link.label) continue;
    const lines = wrap(link.label, fullW - 24, LABEL);
    boxes.push({ lines, size: LABEL, room: fullW - 24 });
    bands[i].push({ spine: true, lines });
  }
  for (const rail of rails) {
    rail.gap = rail.j > rail.i ? rail.i : rail.i - 1;
    if (rail.gap < 0) continue;
    rail.lines = rail.link.label ? wrap(rail.link.label, railRoom, LABEL) : undefined;
    if (rail.lines) boxes.push({ lines: rail.lines, size: LABEL, room: railRoom });
    const shared = !rail.lines && bands[rail.gap].find((band) => band.rails && !band.lines && band.rails[0].link.from === rail.link.from);
    if (shared) shared.rails.push(rail);
    else bands[rail.gap].push({ rails: [rail], lines: rail.lines });
  }
  let y = PAD;
  cards.forEach((card, i) => {
    const previous = cards[i - 1];
    if (groupOf(card.step) !== undefined && (!previous || groupOf(previous.step) !== groupOf(card.step))) y += 24;
    card.y = y;
    card.cy = y + card.h / 2;
    y += card.h;
    const next = cards[i + 1];
    if (!next) return;
    if (groupOf(card.step) !== undefined && groupOf(next.step) !== groupOf(card.step)) y += 10;
    let at = y + 9;
    for (const band of bands[i]) {
      const h = band.lines ? labelSize(band.lines, LABEL).height : 10;
      band.y = at + h / 2;
      for (const rail of band.rails ?? []) rail.y = band.y;
      at += h + 5;
    }
    card.gapH = Math.max(30, at - y + 9);
    y += card.gapH;
  });
  const last = cards[cards.length - 1];
  const height = y + (groupOf(last.step) !== undefined ? 10 : 0) + PAD;

  const marker = `${id}-arrow`;
  let out = `<defs>${arrowMarker(marker)}</defs>`;
  // A group frames each unbroken run of its cards: a step of another actor between them stays outside.
  let tabs = "";
  let run = [];
  const frame = () => {
    if (run.length === 0) return;
    const y0 = run[0].y - 16;
    const y1 = run[run.length - 1].y + run[run.length - 1].h + 10;
    out += `<rect class="dg-group" x="${PAD}" y="${round(y0)}" width="${fullW}" height="${round(y1 - y0)}" rx="12"/>`;
    tabs += groupTab(wrap(unbroken(groups[groupOf(run[0].step)].label), fullW - 40, 11).slice(0, 1), PAD + 10, y0, fullW - 20).svg;
    run = [];
  };
  for (const card of cards) {
    if (run.length && groupOf(run[0].step) !== groupOf(card.step)) frame();
    if (groupOf(card.step) !== undefined) run.push(card);
  }
  frame();

  let labels = "";
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    const link = spine.get(i);
    if (!next || !link) return;
    out += `<path class="dg-link${link.dashed ? " dg-link-dashed" : ""}" d="M${centerX} ${round(card.y + card.h)}V${round(next.y - 1)}" marker-end="url(#${marker})"/>`;
    const band = bands[i].find((entry) => entry.spine);
    if (band) labels += linkLabel(band.lines, centerX, band.y, LABEL, PAD, right);
  });
  for (const rail of rails) {
    const a = cards[rail.i];
    const b = cards[rail.j];
    const x = right + 10 + rail.lane * 12;
    const down = rail.j > rail.i;
    const points = rail.gap >= 0 ? [[leaveX, down ? a.y + a.h : a.y], [leaveX, rail.y], [x, rail.y], [x, b.cy], [b.x + b.w + 1, b.cy]] : [[a.x + a.w, a.cy], [x, a.cy], [x, b.cy], [b.x + b.w + 1, b.cy]];
    out += `<path class="dg-link${rail.link.dashed ? " dg-link-dashed" : ""}" d="${roundedPath(points, 6)}" marker-end="url(#${marker})"/>`;
    if (rail.lines) labels += linkLabel(rail.lines, (leaveX + right + 4) / 2, rail.y, LABEL, leaveX + 4, right + 4);
  }

  out += tabs;
  for (const card of cards) {
    const lane = lanes[card.step.lane];
    const pad = card.step.decision ? POINT : 0;
    out += nodeShape(lane.kind, card.step.decision, card.x, card.y, card.w, card.h);
    // The card's tag: its owner, then what the wide layout shows around the lane (its note, its boundary).
    const boundary = diagram.boundaries.find((entry) => card.step.lane >= entry.from && card.step.lane <= entry.to);
    const around = [lane.note, boundary?.label].filter(Boolean).map(unbroken).join(" · ");
    const tagRoom = card.w - 44 - 2 * pad;
    const tag = wrap(unbroken(lane.label), tagRoom, 11).slice(0, 1);
    const rest = around ? wrap(around, tagRoom - blockWidth(tag, 11) - 14, 11).slice(0, 1) : [];
    out += `<g class="dg-header dg-header-${lane.kind}">${icon(lane.kind, card.x + 11 + pad, card.y + 10, 15)}${textBlock(tag, card.x + 32 + pad, card.y + 21.5, 11, 14, "start", "dg-chip")}</g>`;
    if (rest.length && rest[0].some((run) => run.text !== "")) out += textBlock(rest, card.x + 32 + pad + blockWidth(tag, 11) + 8, card.y + 21.5, 11, 14, "start", "dg-note");
    out += textBlock(card.lines, card.x + 12 + pad, card.y + 12 + 16 + 6 + LINE * 0.72, FONT, LINE, "start");
  }
  return { width, height: round(height), body: out + labels, boxes };
}
