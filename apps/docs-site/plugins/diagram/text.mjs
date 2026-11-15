// Text measuring and wrapping for diagrams. There is no DOM at build time, so widths are
// estimated from a table of Inter's advance widths (in em), rounded up, and from JetBrains Mono's
// one fixed width. The estimate runs a few percent wide on purpose: a line that fits by this
// table fits in the browser. scripts or tests never read a real font.

const MONO_EM = 0.6;
const NARROW = new Set("ijl.,:;'|!".split(""));
const SLIM = new Set("ftrI()[]{}/\\-\"` ".split(""));
const WIDE = new Set("mwMW@%".split(""));

/** The estimated width of one character, in em. */
function charEm(char, mono) {
  if (mono) return MONO_EM;
  if (NARROW.has(char)) return 0.3;
  if (SLIM.has(char)) return 0.38;
  if (WIDE.has(char)) return 0.9;
  if (char >= "A" && char <= "Z") return 0.7;
  if (char >= "0" && char <= "9") return 0.64;
  if (char === "→" || char === "←" || char === "·") return 0.7;
  return 0.58;
}

/** The estimated width of `text` at `size` px. */
export function textWidth(text, size, mono = false) {
  let em = 0;
  for (const char of text) em += charEm(char, mono);
  return Math.ceil(em * size * 1.04);
}

/**
 * A label to runs: `code` between backticks is mono, the rest is not.
 * "the `ask()` call" -> [{text: "the "}, {text: "ask()", mono: true}, {text: " call"}]
 */
export function runs(label) {
  return label
    .split(/(`[^`]*`)/)
    .filter((part) => part !== "")
    .map((part) => (part.startsWith("`") && part.endsWith("`") && part.length > 1 ? { text: part.slice(1, -1), mono: true } : { text: part, mono: false }));
}

/** The label without its backticks, for text alternatives and accessible names. */
export const plain = (label) => runs(unbroken(label)).map((run) => run.text).join("");

/** `\n` in a label is where the author wants a line to break. Anywhere a label is one line, it is a space. */
export const BREAK = "\\n";
/** The label's parts at its `\n` marks. A break inside `code` closes the code and opens it again. */
export function parts(label) {
  const out = [];
  let open = false;
  for (const piece of label.split(BREAK)) {
    const text = (open ? "`" : "") + piece.trim();
    open = (text.split("`").length - 1) % 2 === 1;
    out.push(open ? `${text}\`` : text);
  }
  return out;
}
/** The label on one line: a break inside code joins with nothing, any other with a space. */
export function unbroken(label) {
  let out = "";
  let open = false;
  for (const piece of label.split(BREAK)) {
    out += (out === "" || open ? "" : " ") + (open ? piece : piece.trim());
    open = (out.split("`").length - 1) % 2 === 1;
  }
  return out;
}

/** The estimated width of a line of runs. */
export const lineWidth = (line, size) => line.reduce((sum, run) => sum + textWidth(run.text, run.mono ? size * 0.94 : size, run.mono), 0);

/**
 * Wraps a label to lines no wider than `maxWidth` at `size` px. A line is a list of runs. A word
 * wider than the box is split, so no line ever overflows.
 */
export function wrap(label, maxWidth, size) {
  if (label.includes(BREAK)) return parts(label).flatMap((part) => wrap(part, maxWidth, size));
  // Words keep their font; a space belongs to the word before it.
  const words = [];
  for (const run of runs(label)) {
    for (const word of run.text.split(/(?<= )|(?<=[/,])(?=[^ ])/)) if (word !== "") words.push({ text: word, mono: run.mono });
  }
  const lines = [];
  let line = [];
  const push = () => {
    if (line.length === 0) return;
    const last = line[line.length - 1];
    last.text = last.text.replace(/ +$/, "");
    lines.push(line.filter((run) => run.text !== ""));
    line = [];
  };
  const add = (word) => {
    const previous = line[line.length - 1];
    if (previous && previous.mono === word.mono) previous.text += word.text;
    else line.push({ ...word });
  };
  for (let word of words) {
    while (lineWidth([{ ...word, text: word.text.trimEnd() }], size) > maxWidth && word.text.length > 1) {
      // Too wide alone: fill what fits on a line of its own and carry the rest.
      push();
      let cut = word.text.length - 1;
      while (cut > 1 && lineWidth([{ ...word, text: word.text.slice(0, cut) }], size) > maxWidth) cut--;
      // An identifier breaks best after a separator: tenant_ / organization_ids, not tenant_organizat / ion_ids.
      const separator = Math.max(...["_", ".", "-", ":", "("].map((mark) => word.text.lastIndexOf(mark, cut - 1))) + 1;
      if (separator > 1) cut = separator;
      lines.push([{ text: word.text.slice(0, cut), mono: word.mono }]);
      word = { text: word.text.slice(cut), mono: word.mono };
    }
    const candidate = [...line.map((run) => ({ ...run })), { ...word, text: word.text.trimEnd() }];
    if (line.length > 0 && lineWidth(candidate, size) > maxWidth) push();
    add(word);
  }
  push();
  return lines.length > 0 ? lines : [[{ text: "", mono: false }]];
}

/** The widest line of a wrapped label. */
export const blockWidth = (lines, size) => Math.max(0, ...lines.map((line) => lineWidth(line, size)));
