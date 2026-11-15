// The actor icons, and AskDB's mark redrawn as vector from docs/assets/brand/light-icon.png. Each
// icon is the inside of an <svg>: `icon(kind, x, y, size)` places it. Strokes take `currentColor`;
// the mark's bubble and sparkles take the accent through the `dg-mark-accent` class.

import { round } from "./svg.mjs";

/** A four-point sparkle centered on (cx, cy). */
const sparkle = (cx, cy, r) => {
  const k = r * 0.3;
  return `M${cx} ${cy - r}C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy}C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r}C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy}C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
};

/** AskDB's mark, in a 352 × 404 box: a speech bubble open at the top right, sparkles, and a database. */
export const MARK_VIEWBOX = "0 0 352 404";
export const MARK =
  `<path class="dg-mark-accent" fill="none" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" d="M203 83H130C69 83 19 133 19 194V391L57 350H186C245 350 293 302 293 243V187"/>` +
  `<circle class="dg-mark-accent-fill" cx="293" cy="146" r="12"/>` +
  `<path class="dg-mark-accent-fill" d="${sparkle(262, 80, 33)}${sparkle(305, 25, 25)}${sparkle(327, 102, 25)}${sparkle(335, 43, 11)}${sparkle(236, 125, 14)}"/>` +
  `<g fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">` +
  `<ellipse cx="150" cy="176" rx="63" ry="23"/>` +
  `<path d="M87 176V270C87 283 115 293 150 293S213 283 213 270V176"/>` +
  `<path d="M87 223C87 236 115 246 150 246S213 236 213 223"/>` +
  `</g>`;

const STROKE = `fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;

/** Line icons in a 24 × 24 box, one per actor kind. */
const ICONS = {
  app: `<g ${STROKE}><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9h18"/><path d="M6.2 6.8h.01M8.8 6.8h.01"/><path d="m9.5 12.5-2 2 2 2M14.5 12.5l2 2-2 2"/></g>`,
  model: `<g ${STROKE}><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/><path d="M10.5 10.5h3v3h-3z"/></g>`,
  database: `<g ${STROKE}><ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/></g>`,
  files: `<g ${STROKE}><path d="M13.5 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3.5v5h5"/><path d="M8.5 13h7M8.5 16.5h4.5"/></g>`,
  person: `<g ${STROKE}><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.6-3.7 3.5-5.8 7.2-5.8s6.6 2.1 7.2 5.8"/></g>`,
  agent: `<g ${STROKE}><rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 8V4.6"/><circle cx="12" cy="3.8" r=".9"/><path d="M9.2 12.8v1.6M14.8 12.8v1.6"/><path d="M2.5 12.5v3M21.5 12.5v3"/></g>`,
  service: `<g ${STROKE}><rect x="3.5" y="4.5" width="17" height="6.2" rx="2"/><rect x="3.5" y="13.3" width="17" height="6.2" rx="2"/><path d="M7 7.6h.01M7 16.4h.01M11 7.6h6M11 16.4h6"/></g>`,
};

/** The icon of `kind`, drawn `size` px square with its top-left corner at (x, y). */
export function icon(kind, x, y, size) {
  if (kind === "askdb") {
    // The mark is taller than wide: fit its height, and center it.
    const width = (size * 352) / 404;
    return `<svg class="dg-icon dg-mark" x="${round(x + (size - width) / 2)}" y="${round(y)}" width="${round(width)}" height="${round(size)}" viewBox="${MARK_VIEWBOX}" aria-hidden="true">${MARK}</svg>`;
  }
  return `<svg class="dg-icon" x="${round(x)}" y="${round(y)}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[kind]}</svg>`;
}

