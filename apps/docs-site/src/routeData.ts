import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { sidebarTrail } from "./utils/breadcrumbs";
import { breadcrumbList, jsonForScript, markdownPathFor, techArticle } from "./utils/markdown-twin";

/**
 * Runs for every docs page before it renders. Adds the page's machine-readable head entries: a
 * link to its Markdown twin (pages/[...slug].md.ts), and its schema.org `TechArticle` and
 * `BreadcrumbList` as JSON-LD.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  // The 404 page has no twin and isn't an article.
  if (route.entry.id === "404" || !context.site) return;

  const base = import.meta.env.BASE_URL;
  const url = new URL(context.url.pathname, context.site).href;
  const metadata = {
    title: route.entry.data.title,
    description: route.entry.data.description,
    url,
    siteUrl: new URL(base, context.site).href,
    siteName: route.siteTitle,
    trail: sidebarTrail(route.sidebar),
    lastUpdated: route.lastUpdated,
  };

  route.head.push({
    tag: "link",
    attrs: { rel: "alternate", type: "text/markdown", href: new URL(markdownPathFor(context.url.pathname, base), context.site).href },
  });
  for (const data of [techArticle(metadata), breadcrumbList(metadata)]) {
    route.head.push({ tag: "script", attrs: { type: "application/ld+json" }, content: jsonForScript(data) });
  }
});
