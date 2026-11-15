// Turns each ```diagram fence into AskDB's own inline SVG at build time (ADR 0051): lanes for who
// owns what, steps for what they do, labelled links for what passes between them. The format is in
// plugins/diagram/parse.mjs. Pages ship no diagram JavaScript. A diagram that can't be drawn fails
// the build, naming the page, the line and the reason.
import { DiagramError } from "./diagram/parse.mjs";
import { renderDiagram } from "./diagram/render.mjs";

export function remarkDiagram() {
  return (tree, file) => {
    let count = 0;
    const walk = (parent) => {
      if (!parent.children) return;
      parent.children.forEach((node, index) => {
        if (node.type === "code" && node.lang === "diagram") {
          parent.children[index] = { type: "html", value: renderFence(node, file, `diagram-${count++}`) };
        } else {
          walk(node);
        }
      });
    };
    walk(tree);
  };
}

function renderFence(node, file, id) {
  try {
    return renderDiagram(node.value, id);
  } catch (error) {
    if (!(error instanceof DiagramError)) throw error;
    const fenceLine = node.position?.start.line;
    const where = `${file.path ?? "a page"}${fenceLine ? `:${fenceLine + error.line}` : ""}`;
    throw new DiagramError(`${where}: the diagram can't be drawn: ${error.message}`, error.line);
  }
}
