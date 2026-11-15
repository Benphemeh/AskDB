// A docs page's rendered HTML, back to Markdown an agent can read: the body of the page's `.md`
// twin (src/pages/[...slug].md.ts). The page is rendered first so that MDX components (tabs,
// asides, install commands) come out as their content, and then the site furniture a reader of
// plain text doesn't need is taken off: heading anchor links, copy buttons, icons, syntax colors.
//
// This file has no Astro imports, so `node --test` can run it.
import type { Element, ElementContent, Nodes, Root } from "hast";
import { matches, select, selectAll } from "hast-util-select";
import { toText } from "hast-util-to-text";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";

export interface HtmlToMarkdownOptions {
  /** The absolute URL of the HTML page. Links and images are made absolute against it. */
  pageUrl: string;
  /**
   * The page's Mermaid sources, in page order (see `mermaidSources`). Each takes the place of the
   * diagram's SVG. When their number doesn't match the diagrams on the page, the SVGs are dropped
   * and only the captions stay.
   */
  diagrams?: string[];
}

/**
 * Site furniture: nothing in these carries the page's content. `light:sl-hidden` is Starlight's
 * class for the dark-theme copy of an image that has one per theme; the light copy stands for both.
 */
const FURNITURE = "script, style, link, template, button, .sl-anchor-link, .sr-only, .link-card-icon, .light\\:sl-hidden";

const element = (tagName: string, children: ElementContent[], properties: Element["properties"] = {}): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});
const text = (value: string) => ({ type: "text" as const, value });

/** Removes every node `test` accepts. */
function removeWhere(tree: Root, test: (node: Nodes) => boolean) {
  visit(tree, (node, index, parent) => {
    if (parent && index !== undefined && test(node)) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }
    return undefined;
  });
}

/** Turns `node` into another element in place, so its parent needs no update. */
function become(node: Element, replacement: Element) {
  node.tagName = replacement.tagName;
  node.properties = replacement.properties;
  node.children = replacement.children;
}

/**
 * An Expressive Code block to `<pre data-lang data-title>` holding the code as plain text. The
 * `pre` handler below writes it as a fence, with the file name the block shows as `title="…"`.
 * A block with inserted or deleted lines becomes a `diff` fence.
 */
function simplifyCodeBlocks(tree: Root) {
  for (const block of selectAll(".expressive-code", tree)) {
    const pre = select("pre", block);
    if (!pre) continue;
    const title = select("figcaption .title", block);
    const lines = selectAll(".ec-line", pre);
    const changed = lines.some((line) => matches(".ins, .del", line));
    const language = String(pre.properties.dataLanguage ?? "");
    const code = lines
      .map((line) => {
        const value = toText(select(".code", line) ?? line, { whitespace: "pre" }).replace(/\n$/, "");
        if (!changed || language === "diff") return value;
        return (matches(".ins", line) ? "+" : matches(".del", line) ? "-" : " ") + value;
      })
      .join("\n");
    become(
      block,
      element("pre", [text(code)], {
        dataLang: changed && language !== "diff" ? "diff" : language,
        dataTitle: title ? toText(title).trim() : "",
      }),
    );
  }
}

/** Starlight tabs to each tab's label in bold, then its panel, one after the other. */
function flattenTabs(tree: Root) {
  for (const tabs of selectAll("starlight-tabs", tree)) {
    const isElement = (child: ElementContent): child is Element => child.type === "element";
    // The tab list and the panels are direct children, so a tab set nested in a panel isn't read here.
    const tablist = tabs.children.filter(isElement).find((child) => !matches('[role="tabpanel"]', child));
    const labels = tablist ? selectAll('[role="tab"]', tablist) : [];
    const panels = tabs.children.filter(isElement).filter((child) => matches('[role="tabpanel"]', child));
    const children: ElementContent[] = [];
    panels.forEach((panel, index) => {
      const tab = labels[index];
      const label = tab ? toText(tab).trim() : "";
      if (label) children.push(element("p", [element("strong", [text(label)])]));
      children.push(...panel.children);
    });
    become(tabs, element("div", children));
  }
}

/**
 * A Starlight file tree to a `text` fence: one line per entry, indented two spaces per level, with
 * the entry's comment after `#`. As nested list items the names and comments run together.
 */
function drawFileTrees(tree: Root) {
  const isElement = (child: ElementContent): child is Element => child.type === "element";
  for (const fileTree of selectAll("starlight-file-tree", tree)) {
    const entries: { name: string; comment: string }[] = [];
    const walk = (list: Element, depth: number) => {
      for (const item of list.children.filter(isElement)) {
        // A directory holds its own entry in <summary>, and its children's entries in the <ul> beside it.
        const nested = item.children.filter(isElement).find((child) => child.tagName === "details");
        const own = nested ? nested.children.filter(isElement).find((child) => child.tagName === "summary") : item;
        const entry = own?.children.filter(isElement).find((child) => matches(".tree-entry", child));
        const name = entry?.children.filter(isElement).find((child) => !matches(".comment", child));
        if (!entry || !name) continue;
        const comment = entry.children.filter(isElement).find((child) => matches(".comment", child));
        entries.push({ name: "  ".repeat(depth) + toText(name).trim(), comment: comment ? toText(comment).trim() : "" });
        const sublist = nested?.children.filter(isElement).find((child) => child.tagName === "ul");
        if (sublist) walk(sublist, depth + 1);
      }
    };
    const root = fileTree.children.filter(isElement).find((child) => child.tagName === "ul");
    if (root) walk(root, 0);
    const width = Math.max(0, ...entries.filter((entry) => entry.comment).map((entry) => entry.name.length));
    const lines = entries.map(({ name, comment }) => (comment ? `${name.padEnd(width)}  # ${comment}` : name));
    become(fileTree, element("pre", [text(lines.join("\n"))], { dataLang: "text", dataTitle: "" }));
  }
}

/** A Starlight aside to a blockquote that opens with its title in bold: `> **Note**`. */
function quoteAsides(tree: Root) {
  for (const aside of selectAll(".starlight-aside", tree)) {
    const title = select(".starlight-aside__title", aside);
    const content = select(".starlight-aside__content", aside);
    const label = title ? toText(title).trim() : "Note";
    become(aside, element("blockquote", [element("p", [element("strong", [text(label)])]), ...(content?.children ?? [])]));
  }
}

/**
 * A figure to its content, then its caption as a paragraph that starts "Figure:". A diagram's SVG
 * becomes its Mermaid source when the page's sources are known, and is dropped otherwise.
 */
function describeFigures(tree: Root, diagrams: string[] | undefined) {
  const svgs = selectAll("svg.pele", tree);
  const sources = diagrams && diagrams.length === svgs.length ? diagrams : undefined;
  svgs.forEach((svg, index) => {
    if (sources) become(svg, element("pre", [text(sources[index] ?? "")], { dataLang: "mermaid", dataTitle: "" }));
  });
  for (const caption of selectAll("figure > figcaption", tree)) {
    become(caption, element("p", [element("em", [text("Figure: "), ...caption.children])]));
  }
  for (const figure of selectAll("figure", tree)) figure.tagName = "div";
  removeWhere(tree, (node) => node.type === "element" && node.tagName === "svg");
}

/** Makes every link and image URL absolute, so the Markdown works away from the site. */
function absoluteUrls(tree: Root, pageUrl: string) {
  const absolute = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    if (value === "" || value.startsWith("#")) return value;
    try {
      return new URL(value, pageUrl).href;
    } catch {
      return value;
    }
  };
  for (const link of selectAll("a[href]", tree)) link.properties.href = absolute(link.properties.href);
  for (const image of selectAll("img[src]", tree)) {
    image.properties.src = absolute(image.properties.src);
    delete image.properties.srcSet;
  }
}

function simplify(options: HtmlToMarkdownOptions) {
  return (tree: Root) => {
    removeWhere(tree, (node) => node.type === "comment" || (node.type === "element" && matches(FURNITURE, node)));
    simplifyCodeBlocks(tree);
    flattenTabs(tree);
    drawFileTrees(tree);
    quoteAsides(tree);
    describeFigures(tree, options.diagrams);
    // Decoration hidden from assistive technology (icons, step numerals) says nothing in text either.
    // It goes after the asides are read: Starlight hides an aside's visible title this way.
    removeWhere(tree, (node) => node.type === "element" && node.properties.ariaHidden === "true");
    absoluteUrls(tree, options.pageUrl);
  };
}

/** The Mermaid fences in a page's MDX source, in order, without their `%%` maintainer comments. */
export function mermaidSources(mdx: string): string[] {
  return [...mdx.matchAll(/^```mermaid[^\n]*\n([\s\S]*?)^```[ \t]*$/gm)].map(([, source = ""]) =>
    source
      .split("\n")
      .filter((line) => !line.trim().startsWith("%%"))
      .join("\n")
      .trimEnd(),
  );
}

/** A docs page's rendered content HTML to Markdown. */
export async function htmlToMarkdown(html: string, options: HtmlToMarkdownOptions): Promise<string> {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(() => simplify(options))
    .use(rehypeRemark, {
      handlers: {
        // A code block: `simplifyCodeBlocks` left the language and the file name on the `pre`.
        pre(_state, node: Element) {
          const code = select("code", node);
          const fromClass = [code?.properties.className ?? []].flat().find((name) => String(name).startsWith("language-"));
          const lang = String(node.properties.dataLang ?? "") || (fromClass ? String(fromClass).slice("language-".length) : "");
          const title = String(node.properties.dataTitle ?? "");
          return {
            type: "code" as const,
            lang: lang || (title ? "text" : null),
            meta: title ? `title="${title.replace(/"/g, "'")}"` : null,
            value: toText(node, { whitespace: "pre" }).replace(/\n$/, ""),
          };
        },
      },
    })
    .use(remarkGfm)
    .use(remarkStringify, { bullet: "-", emphasis: "*", fences: true, rule: "-", incrementListMarker: true })
    .process(html);
  return String(file).trim();
}

export interface PageMarkdown {
  title: string;
  description?: string;
  /** The page body as Markdown: the result of `htmlToMarkdown`. */
  body: string;
  /** The absolute URL of the HTML page. */
  pageUrl: string;
  /** The absolute URL of the site's `/llms.txt`. */
  llmsUrl: string;
}

/** A page's whole `.md` twin: title, description, body, and a footer that says where it came from. */
export function pageMarkdown({ title, description, body, pageUrl, llmsUrl }: PageMarkdown): string {
  const footer = `Source: ${pageUrl} · Index of every page: ${llmsUrl} · Every page has a Markdown version at its URL with the trailing slash replaced by \`.md\`.`;
  return [`# ${title}`, description ? `> ${description}` : "", body, "---", footer].filter(Boolean).join("\n\n") + "\n";
}
