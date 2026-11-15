// Renders a Markdown link list as a grid of cards. A list is a link list when every item is one
// paragraph that starts with a link, then ": ", then a description:
//
//   - [Quickstart](/quickstart/): Ask your first question in five minutes.
//
// The source stays plain Markdown, which is what `/llms.txt` lists use, so an agent that reads the
// page as Markdown gets the same lines. The plugin only adds class names: `link-cards` on the list,
// `link-card-sep` on the ": " and `link-card-desc` on the description. src/styles/content.css hides
// the separator and lays the items out as cards. The ": " stays in the HTML so that a converter
// back to Markdown (starlight-llms-txt, the per-page `.md` files) writes the line as it was.

const SEPARATOR = ": ";

/** The item's paragraph when the item is `[link]: description`, else undefined. */
function cardParagraph(item) {
  if (item.children.length !== 1) return undefined;
  const [paragraph] = item.children;
  if (paragraph.type !== "paragraph") return undefined;
  const [link, next] = paragraph.children;
  if (link?.type !== "link" || next?.type !== "text") return undefined;
  if (!next.value.startsWith(SEPARATOR)) return undefined;
  // The description may open with inline code or emphasis, which leaves ": " as the whole text node.
  if (next.value.length === SEPARATOR.length && paragraph.children.length === 2) return undefined;
  return paragraph;
}

const span = (className, children) => ({
  type: "linkCardSpan",
  children,
  data: { hName: "span", hProperties: { className: [className] } },
});

export function remarkLinkCards() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      for (const child of node.children) {
        if (child.type === "list" && !child.ordered && child.children.length > 0) {
          const paragraphs = child.children.map(cardParagraph);
          if (paragraphs.every(Boolean)) {
            child.data = { ...child.data, hProperties: { ...child.data?.hProperties, className: ["link-cards"] } };
            for (const paragraph of paragraphs) {
              const [link, first, ...rest] = paragraph.children;
              const lead = first.value.slice(SEPARATOR.length);
              const description = lead ? [{ ...first, value: lead }, ...rest] : rest;
              paragraph.children = [link, span("link-card-sep", [{ type: "text", value: SEPARATOR }]), span("link-card-desc", description)];
            }
            continue;
          }
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
