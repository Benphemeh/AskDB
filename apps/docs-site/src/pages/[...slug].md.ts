// Every docs page's Markdown twin, at the page's URL with the trailing slash replaced by `.md`:
// `/guides/multi-tenancy/` → `/guides/multi-tenancy.md`, and the home page at `/index.md`. The page
// header links to it (components/PageActions.astro), the page's `<head>` names it as an alternate
// (routeData.ts), and `/llms.txt` lists the common ones.
import mdxServer from "@astrojs/mdx/server.js";
import type { APIRoute, GetStaticPaths } from "astro";
import { experimental_AstroContainer } from "astro/container";
import { getCollection, render, type CollectionEntry } from "astro:content";
import { htmlToMarkdown, mermaidSources, pageMarkdown } from "../utils/html-to-markdown";
import { markdownSlugFor } from "../utils/markdown-twin";

export const prerender = true;

type Entry = CollectionEntry<"docs">;

export const getStaticPaths = (async () => {
  const entries: Entry[] = await getCollection("docs", (entry: Entry) => !entry.data.draft && entry.id !== "404");
  return entries.map((entry) => ({ params: { slug: markdownSlugFor(entry.id) }, props: { entry } }));
}) satisfies GetStaticPaths;

// Renders an MDX entry to HTML outside a page, the way starlight-llms-txt does for `/llms-full.txt`.
const container = await experimental_AstroContainer.create({ renderers: [{ name: "astro:jsx", ssr: mdxServer }] });

export const GET: APIRoute<{ entry: Entry }> = async (context) => {
  const { entry } = context.props;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const slug = markdownSlugFor(entry.id);
  const pageUrl = new URL(`${base}/${slug === "index" ? "" : `${slug}/`}`, context.site).href;
  const llmsUrl = new URL(`${base}/llms.txt`, context.site).href;

  const { Content } = await render(entry);
  const html = await container.renderToString(Content, context);
  const body = await htmlToMarkdown(html, { pageUrl, diagrams: mermaidSources(entry.body ?? "") });
  const markdown = pageMarkdown({ title: entry.data.title, description: entry.data.description, body, pageUrl, llmsUrl });
  return new Response(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
