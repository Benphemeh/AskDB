import { test } from "node:test";
import assert from "node:assert/strict";
import { remarkLinkCards } from "./remark-link-cards.mjs";

const text = (value) => ({ type: "text", value });
const link = (label, url) => ({ type: "link", url, children: [text(label)] });
const item = (...children) => ({ type: "listItem", children: [{ type: "paragraph", children }] });
const list = (...children) => ({ type: "list", ordered: false, children });
const run = (...children) => {
  const tree = { type: "root", children };
  remarkLinkCards()(tree);
  return tree.children;
};

test("a list of `[link]: description` items becomes link cards, and keeps the separator for Markdown readers", () => {
  const [cards] = run(
    list(
      item(link("Quickstart", "/quickstart/"), text(": Ask your first question.")),
      item(link("CLI", "/reference/cli/"), text(": Every "), { type: "inlineCode", value: "askdb" }, text(" command.")),
      item(link("Checks", "/reference/core-api/checks/"), text(": "), { type: "inlineCode", value: "validateSelectSql()" }, text(" and the rest.")),
    ),
  );
  assert.deepEqual(cards.data.hProperties.className, ["link-cards"]);
  const [first, second, third] = cards.children.map((li) => li.children[0].children);
  assert.equal(first[0].url, "/quickstart/");
  assert.deepEqual(first[1].data, { hName: "span", hProperties: { className: ["link-card-sep"] } });
  assert.deepEqual(first[1].children, [text(": ")]);
  assert.deepEqual(first[2].data.hProperties.className, ["link-card-desc"]);
  assert.deepEqual(first[2].children, [text("Ask your first question.")]);
  assert.deepEqual(second[2].children, [text("Every "), { type: "inlineCode", value: "askdb" }, text(" command.")]);
  assert.deepEqual(third[2].children, [{ type: "inlineCode", value: "validateSelectSql()" }, text(" and the rest.")]);
});

test("a list stays a list when any item isn't `[link]: description`", () => {
  const plain = list(item(link("Quickstart", "/quickstart/"), text(": Ask your first question.")), item(text("Install Node 22.")));
  const linkOnly = list(item(link("Quickstart", "/quickstart/")));
  const noDescription = list(item(link("Quickstart", "/quickstart/"), text(": ")));
  const sentence = list(item(link("Quickstart", "/quickstart/"), text(" walks through it.")));
  const ordered = { ...list(item(link("Quickstart", "/quickstart/"), text(": Ask."))), ordered: true };
  const before = structuredClone([plain, linkOnly, noDescription, sentence, ordered]);
  assert.deepEqual(run(plain, linkOnly, noDescription, sentence, ordered), before);
});

test("a link list nested in a component or a section becomes cards too", () => {
  const cards = list(item(link("Quickstart", "/quickstart/"), text(": Ask your first question.")));
  const [wrapper] = run({ type: "mdxJsxFlowElement", name: "div", attributes: [], children: [cards] });
  assert.deepEqual(wrapper.children[0].data.hProperties.className, ["link-cards"]);
});
