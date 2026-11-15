// Browser-side helpers for the copy buttons (components/PageActions.astro, AgentPrompt.astro).

/**
 * Copies text to the clipboard. `text` may be a promise, such as a fetch of a page's Markdown: the
 * write starts inside the click, which Safari requires, and the text arrives later.
 */
export async function copyText(text: string | Promise<string>): Promise<void> {
  if (typeof text !== "string" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return;
    } catch {
      // Some browsers don't take a promise in a ClipboardItem. Fall through to writeText.
    }
  }
  await navigator.clipboard.writeText(await text);
}

/**
 * Shows "Copied" (or a failure) on a copy control for two seconds, then its own label again. The
 * control holds its label in a `[data-label]` element, which is an `aria-live` region.
 */
export function flashLabel(control: HTMLElement, message: string, state: "copied" | "failed") {
  const label = control.querySelector<HTMLElement>("[data-label]");
  if (!label) return;
  const original = label.dataset.original ?? label.textContent ?? "";
  label.dataset.original = original;
  label.textContent = message;
  control.dataset.state = state;
  window.setTimeout(() => {
    label.textContent = original;
    delete control.dataset.state;
  }, 2000);
}

/**
 * An element's content as the plain text an agent should get: paragraphs and list items on their
 * own lines, links as `[text](absolute URL)`, inline code in backticks, code blocks in fences.
 */
export function readableText(root: Element): string {
  const read = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s+/g, " ");
    if (!(node instanceof HTMLElement)) return "";
    const inner = () => [...node.childNodes].map(read).join("");
    switch (node.tagName) {
      case "A": {
        const text = inner().trim();
        const href = (node as HTMLAnchorElement).href;
        return !href || text === href ? text : `[${text}](${href})`;
      }
      case "CODE":
        return node.parentElement?.tagName === "PRE" ? (node.textContent ?? "") : `\`${node.textContent ?? ""}\``;
      case "PRE":
        return `\n\n\`\`\`\n${(node.textContent ?? "").replace(/\n$/, "")}\n\`\`\`\n\n`;
      case "BR":
        return "\n";
      case "LI": {
        const list = node.parentElement;
        const marker = list?.tagName === "OL" ? `${[...list.children].indexOf(node) + 1}. ` : "- ";
        return `\n${marker}${inner().trim()}`;
      }
      case "P":
      case "UL":
      case "OL":
      case "BLOCKQUOTE":
      case "DIV":
        return `\n\n${inner().trim()}\n\n`;
      default:
        return inner();
    }
  };
  return read(root)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
