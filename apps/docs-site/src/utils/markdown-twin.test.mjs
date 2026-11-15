import assert from "node:assert/strict";
import { test } from "node:test";
import { assistantLinks, breadcrumbList, jsonForScript, markdownPathFor, markdownSlugFor, techArticle } from "./markdown-twin.ts";

test("a page's Markdown twin is its path with the trailing slash replaced by .md", () => {
  assert.equal(markdownPathFor("/guides/multi-tenancy/"), "/guides/multi-tenancy.md");
  assert.equal(markdownPathFor("/reference/core-api/"), "/reference/core-api.md");
  assert.equal(markdownPathFor("/quickstart"), "/quickstart.md");
  assert.equal(markdownPathFor("/guides/multi-tenancy/index.html"), "/guides/multi-tenancy.md");
});

test("the home page's twin is index.md, under the base path the site is served at", () => {
  assert.equal(markdownPathFor("/"), "/index.md");
  assert.equal(markdownPathFor("/AskDB/", "/AskDB/"), "/AskDB/index.md");
  assert.equal(markdownPathFor("/AskDB", "/AskDB"), "/AskDB/index.md");
  assert.equal(markdownPathFor("/AskDB/guides/multi-tenancy/", "/AskDB/"), "/AskDB/guides/multi-tenancy.md");
});

test("a docs entry's id maps to the slug its twin is served at", () => {
  assert.equal(markdownSlugFor("index"), "index");
  assert.equal(markdownSlugFor("quickstart"), "quickstart");
  assert.equal(markdownSlugFor("guides/integrations/prisma"), "guides/integrations/prisma");
  assert.equal(markdownSlugFor("reference/core-api/index"), "reference/core-api");
});

test("each assistant link opens the assistant with a prompt to read the page's Markdown", () => {
  const prompt = "Read%20https%3A%2F%2Faskdb.tools%2Fquickstart.md%2C%20I%20want%20to%20ask%20questions%20about%20it.";
  assert.deepEqual(assistantLinks("https://askdb.tools/quickstart.md"), [
    { id: "claude", label: "Open in Claude", href: `https://claude.ai/new?q=${prompt}` },
    { id: "chatgpt", label: "Open in ChatGPT", href: `https://chatgpt.com/?hints=search&q=${prompt}` },
    { id: "perplexity", label: "Open in Perplexity", href: `https://www.perplexity.ai/?q=${prompt}` },
    { id: "cursor", label: "Open in Cursor", href: `https://cursor.com/link/prompt?text=${prompt}` },
  ]);
});

const page = {
  title: "Scope queries to a tenant",
  description: "Declare your schema's tenancy.",
  url: "https://askdb.tools/guides/multi-tenancy/",
  siteUrl: "https://askdb.tools/",
  siteName: "AskDB",
  trail: ["Guides", "Tenancy"],
};

test("the TechArticle names the page and its site, and dates it only when the date is known", () => {
  assert.deepEqual(techArticle(page), {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Scope queries to a tenant",
    description: "Declare your schema's tenancy.",
    url: "https://askdb.tools/guides/multi-tenancy/",
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: "AskDB", url: "https://askdb.tools/" },
  });
  assert.equal(techArticle({ ...page, lastUpdated: new Date("2026-11-14T00:00:00Z") }).dateModified, "2026-11-14T00:00:00.000Z");
  assert.equal("description" in techArticle({ ...page, description: undefined }), false);
});

test("the BreadcrumbList runs from the site through the sidebar groups to the page", () => {
  assert.deepEqual(breadcrumbList(page).itemListElement, [
    { "@type": "ListItem", position: 1, name: "AskDB", item: "https://askdb.tools/" },
    { "@type": "ListItem", position: 2, name: "Guides" },
    { "@type": "ListItem", position: 3, name: "Tenancy" },
    { "@type": "ListItem", position: 4, name: "Scope queries to a tenant", item: "https://askdb.tools/guides/multi-tenancy/" },
  ]);
  assert.equal(breadcrumbList({ ...page, trail: [] }).itemListElement.length, 2);
});

test("JSON for a script element can't close the element, and still parses to the same value", () => {
  const value = { headline: "</script><script>alert(1)</script>", note: "line break" };
  const json = jsonForScript(value);
  assert.equal(json.includes("<"), false);
  assert.equal(json.includes(" "), false);
  assert.deepEqual(JSON.parse(json), value);
});
