import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_CODE_SPANS, MAX_WORDS, proseIssues, sentences } from "./check-prose.mjs";

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
