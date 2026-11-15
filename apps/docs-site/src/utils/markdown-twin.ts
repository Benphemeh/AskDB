// Where a docs page's Markdown twin lives, the "open in an assistant" links that point at it, and
// the page's JSON-LD. Pure functions: the page actions, the `.md` route and the route middleware
// all use them, and `node --test` runs them without Astro.

/**
 * The path of a page's Markdown twin, from the page's own path: the trailing slash becomes `.md`.
 * `/guides/multi-tenancy/` → `/guides/multi-tenancy.md`. The home page (`/`, or the base path the
 * site is served under) has no last segment to rename, so its twin is `index.md` inside it.
 */
export function markdownPathFor(pagePath: string, base = "/"): string {
  const basePath = base.replace(/\/$/, "");
  const path = pagePath.replace(/index\.html$/, "").replace(/\/$/, "");
  return path === basePath ? `${basePath}/index.md` : `${path}.md`;
}

/** The `[...slug]` of a docs entry's Markdown twin: `guides/multi-tenancy`, and `index` for the home page. */
export function markdownSlugFor(entryId: string): string {
  const slug = entryId.replace(/(^|\/)index$/, "");
  return slug === "" ? "index" : slug;
}

/** What the "open in" links ask an assistant to do with a page. */
export function assistantPrompt(markdownUrl: string): string {
  return `Read ${markdownUrl}, I want to ask questions about it.`;
}

export interface AssistantLink {
  id: "claude" | "chatgpt" | "perplexity" | "cursor";
  label: string;
  href: string;
}

/** A link per assistant that opens it with a prompt to read the page's Markdown twin. */
export function assistantLinks(markdownUrl: string): AssistantLink[] {
  const prompt = encodeURIComponent(assistantPrompt(markdownUrl));
  return [
    { id: "claude", label: "Open in Claude", href: `https://claude.ai/new?q=${prompt}` },
    { id: "chatgpt", label: "Open in ChatGPT", href: `https://chatgpt.com/?hints=search&q=${prompt}` },
    { id: "perplexity", label: "Open in Perplexity", href: `https://www.perplexity.ai/?q=${prompt}` },
    { id: "cursor", label: "Open in Cursor", href: `https://cursor.com/link/prompt?text=${prompt}` },
  ];
}

export interface PageMetadata {
  title: string;
  description?: string;
  /** The absolute URL of the page. */
  url: string;
  /** The absolute URL of the site's home page. */
  siteUrl: string;
  siteName: string;
  /** The sidebar groups that hold the page, outermost first. */
  trail: string[];
  lastUpdated?: Date;
}

/** The page's schema.org `TechArticle`. */
export function techArticle({ title, description, url, siteUrl, siteName, lastUpdated }: PageMetadata) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    ...(description ? { description } : {}),
    url,
    ...(lastUpdated ? { dateModified: lastUpdated.toISOString() } : {}),
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: siteName, url: siteUrl },
  };
}

/**
 * The page's schema.org `BreadcrumbList`: the site, the sidebar groups that hold the page, then the
 * page. A sidebar group is a label, not a page, so it carries a name and no URL.
 */
export function breadcrumbList({ title, url, siteUrl, siteName, trail }: PageMetadata) {
  const items = [{ name: siteName, item: siteUrl }, ...trail.map((name) => ({ name })), { name: title, item: url }];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => ({ "@type": "ListItem", position: index + 1, ...entry })),
  };
}

/**
 * JSON for the inside of a `<script type="application/ld+json">`. `<` is written as a `\u` escape, so a
 * title or description that holds `</script>` can't end the element.
 */
export function jsonForScript(value: unknown): string {
  // U+2028 and U+2029 end a line in JavaScript source but not in JSON, so they are escaped too.
  return JSON.stringify(value).replace(/[<\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
