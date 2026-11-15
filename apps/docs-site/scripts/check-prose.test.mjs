import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { EXEMPT, MAX_CODE_SPANS, MAX_WORDS, capsCodeSpans, proseIssues, sentences } from "./check-prose.mjs";

const words = (count) => Array.from({ length: count }, (_, index) => `word${index}`).join(" ");

test("a sentence over the word limit is reported with its line, and one at the limit is not", () => {
  const page = `---\ntitle: "A page"\n---\n\nA short lede.\n\n${words(MAX_WORDS)}.\n\n${words(MAX_WORDS + 1)}.\n`;
  assert.deepEqual(
    proseIssues(page).map(({ line, rule, count }) => ({ line, rule, count })),
    [{ line: 9, rule: "words", count: MAX_WORDS + 1 }],
  );
});

test("a sentence with too many code spans is reported, unless the page is exempt from that limit", () => {
  const spans = Array.from({ length: MAX_CODE_SPANS + 1 }, (_, index) => `\`name${index}\``).join(", ");
  const page = `Pass ${spans} to it.\n`;
  assert.deepEqual(proseIssues(page).map(({ rule, count }) => ({ rule, count })), [{ rule: "code", count: MAX_CODE_SPANS + 1 }]);
  assert.deepEqual(proseIssues(page, { capCode: false }), []);
});

test("a code span counts as one word, and a link as its text", () => {
  const long = "`" + words(40) + "`";
  assert.deepEqual(proseIssues(`Run ${long} and read [the long guide about it](/guides/a-very-long-path-to-a-page/).\n`), []);
});

test("code blocks, tables, headings, imports, link cards, file trees and agent prompts aren't prose", () => {
  const big = words(MAX_WORDS + 5);
  const page = [
    `import X from "./x.astro";`,
    "",
    `## ${big}`,
    "",
    "```ts",
    `// ${big}`,
    "```",
    "",
    `| ${big} | b |`,
    "| --- | --- |",
    "",
    `- [A page](/a-page/): ${big}.`,
    "",
    "<AgentPrompt>",
    "",
    `${big}.`,
    "",
    "</AgentPrompt>",
    "",
    "<FileTree>",
    `- askdb/ ${big}`,
    "</FileTree>",
    "",
    "Real prose here.",
  ].join("\n");
  assert.deepEqual(proseIssues(page), []);
  assert.deepEqual(sentences(page).map(({ text }) => text), ["Real prose here."]);
});

test("each list item and each sentence of a paragraph is its own sentence", () => {
  const page = "First one. Second one, with `a.b` in it. Third?\n\n- An item.\n- Another item. With two sentences.\n";
  assert.deepEqual(
    sentences(page).map(({ line, text }) => [line, text]),
    [
      [1, "First one."],
      [1, "Second one, with `a.b` in it."],
      [1, "Third?"],
      [3, "An item."],
      [4, "Another item."],
      [4, "With two sentences."],
    ],
  );
});

test("a colon doesn't end a sentence, and nothing inside a code span does", () => {
  const page = "Pass one of two values: `a. B` or `what? Yes`, and then run it. Done.\n";
  assert.deepEqual(sentences(page).map(({ text }) => text), ["Pass one of two values: `a. B` or `what? Yes`, and then run it.", "Done."]);
  assert.deepEqual(sentences('Take a question: "How much did each spend?" The model answers.\n').map(({ text }) => text), ['Take a question: "How much did each spend?"', "The model answers."]);
  const long = `${words(20)}: ${words(MAX_WORDS - 19)}.\n`;
  assert.deepEqual(proseIssues(long).map(({ rule, count }) => ({ rule, count })), [{ rule: "words", count: MAX_WORDS + 1 }]);
});

test("a sentence at the code-span limit passes, the reference is exempt from that limit, and the upgrade notes from both", () => {
  const spans = Array.from({ length: MAX_CODE_SPANS }, (_, index) => `\`name${index}\``).join(", ");
  assert.deepEqual(proseIssues(`Pass ${spans} to it.\n`), []);
  assert.equal(capsCodeSpans("guides/embed-in-node.mdx"), true);
  assert.equal(capsCodeSpans("studio.mdx"), true);
  assert.equal(capsCodeSpans("reference/cli.mdx"), false);
  assert.deepEqual([...EXEMPT.keys()], ["reference/upgrade-notes.mdx"]);
});

test("run as a script, it exits 1 and names the page and line of a sentence over a limit, and 0 without one", () => {
  const script = fileURLToPath(new URL("./check-prose.mjs", import.meta.url));
  const clean = spawnSync("node", [script, "install.mdx"], { encoding: "utf8" });
  assert.equal(clean.status, 0, clean.stderr);
  // The upgrade notes are exempt, so naming them reports nothing even though they hold long sentences.
  assert.equal(spawnSync("node", [script, "reference/upgrade-notes.mdx"], { encoding: "utf8" }).status, 0);
  const dir = mkdtempSync(join(tmpdir(), "prose-"));
  const page = join(dir, "long.mdx");
  writeFileSync(page, `A lede.\n\n${words(MAX_WORDS + 4)}.\n`);
  const failing = spawnSync("node", [script, relative(fileURLToPath(new URL("../src/content/docs/", import.meta.url)), page)], { encoding: "utf8" });
  assert.equal(failing.status, 1);
  assert.match(failing.stderr, /long\.mdx:3: 34 words \(limit 30\)/);
});
