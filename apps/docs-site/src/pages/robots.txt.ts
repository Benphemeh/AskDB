// /robots.txt: every crawler may read the whole site, and the sitemap is named. The URLs carry the
// base path the site is served under. Crawlers read robots.txt only at a host's root, so under a
// base path (a project page such as /AskDB/) the file is inert rather than wrong.
import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const url = (path: string) => new URL(`${base}${path}`, site).href;
  const lines = [
    `# Documentation index for AI agents: ${url("/llms.txt")}`,
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${url("/sitemap-index.xml")}`,
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
