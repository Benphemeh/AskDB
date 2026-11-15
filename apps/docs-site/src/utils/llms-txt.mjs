// What `/llms.txt` says: the options astro.config.mjs passes to starlight-llms-txt. The file opens
// with what AskDB is and the facts an agent must not get wrong, then a list of common tasks that
// link to each page's Markdown twin, then the plugin's own list of documentation sets.
//
// A task's description is its page's own `description`, read from the page's front matter, so the
// two can't drift, and a task that names a page that doesn't exist fails the build.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DOCS_DIR = new URL("../content/docs/", import.meta.url);

/**
 * The tasks an agent most often arrives with, in the order a project meets them. `page` is the
 * page's id: its path under src/content/docs, without the extension.
 */
export const COMMON_TASKS = [
  { task: "Try AskDB with the CLI", page: "quickstart" },
  { task: "Choose which AskDB packages to install", page: "install" },
  { task: "Embed AskDB in a Node app", page: "guides/embed-in-node" },
  { task: "Bring your own model", page: "guides/bring-your-own-model" },
  { task: "Enrich the schema artifact", page: "guides/author-your-schema" },
  { task: "Scope queries to a tenant", page: "guides/multi-tenancy" },
  { task: "Enforce tenancy in the database", page: "guides/enforce-tenancy-in-the-database" },
  { task: "Use RAG for a large schema", page: "guides/rag-for-large-schemas" },
  { task: "Deploy AskDB as an HTTP service", page: "guides/deploy-as-http-service" },
  { task: "Expose AskDB as an agent tool", page: "guides/integrations/agents-mcp" },
  { task: "Run AskDB safely in production", page: "guides/run-safely-in-prod" },
  { task: "Fix a common error", page: "guides/troubleshooting" },
  { task: "Upgrade AskDB", page: "guides/upgrading" },
  { task: "Look up `ask()`'s options and result", page: "reference/core-api/ask" },
  { task: "Look up a CLI command or flag", page: "reference/cli" },
  { task: "Look up an `askdb.config.ts` key", page: "reference/config" },
];

/** A page's `description` from its front matter. Throws when the page or the description is missing. */
export function pageDescription(page, docsDir = DOCS_DIR) {
  const candidates = [`${page}.mdx`, `${page}.md`, `${page}/index.mdx`, `${page}/index.md`];
  for (const candidate of candidates) {
    let source;
    try {
      source = readFileSync(fileURLToPath(new URL(candidate, docsDir)), "utf8");
    } catch {
      continue;
    }
    const frontMatter = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? "";
    const match = /^description:\s*(.+)$/m.exec(frontMatter);
    if (!match) throw new Error(`llms.txt: ${candidate} has no description in its front matter`);
    const value = match[1].trim();
    // A quoted YAML string: JSON reads a double-quoted one, and a single-quoted one doubles its quotes.
    if (value.startsWith('"')) return JSON.parse(value);
    if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
    return value;
  }
  throw new Error(`llms.txt: no page at src/content/docs/${page}.mdx`);
}

/** The URL of a page's Markdown twin, under `siteUrl` (the site's origin plus its base path). */
const twin = (siteUrl, page) => `${siteUrl}/${page}.md`;

/** The Markdown between the description and the documentation sets in `/llms.txt`. */
export function llmsDetails(siteUrl, describe = pageDescription) {
  const tasks = COMMON_TASKS.map(({ task, page }) => `- [${task}](${twin(siteUrl, page)}): ${describe(page)}`);
  return [
    "AskDB is a library, not a service. `ask({ question, schema, model, dialect })` from `@askdb/core` takes a schema artifact and a Vercel AI SDK `LanguageModel`, and returns SQL that has passed heuristic checks. The same pipeline powers the `askdb` CLI, the `@askdb/client` library, `@askdb/http-api`, and Studio.",
    "Get these right before you write code:",
    [
      "- **AskDB returns SQL and never executes it.** The host application runs the SQL through its own connection.",
      `- **The SQL checks are heuristics, not a security boundary.** They catch common model mistakes and can miss things. The boundary is the database role that runs the SQL: read-only, and with row-level security when the schema is multi-tenant. See [Safety boundaries](${twin(siteUrl, "concepts/safety-boundaries")}).`,
      `- **Tenant scope comes from the host application.** AskDB validates the scope's shape, binds the tenant IDs and runs heuristic checks, but it never originates a scope and isn't the enforcement boundary. Sensitive-field handling is the host application's responsibility too. See [Enforce tenancy in the database](${twin(siteUrl, "guides/enforce-tenancy-in-the-database")}) for Postgres row-level security.`,
      `- **Wiring the AI model is a choice between two first-party paths.** Either config-driven \`@askdb/client\`/\`@askdb/ai\` (built-in providers; install the matching \`@ai-sdk/*\` package), or a raw Vercel AI SDK model passed to \`ask()\`. Who owns provider config in the host app decides it. See [Bring your own model](${twin(siteUrl, "guides/bring-your-own-model")}).`,
    ].join("\n"),
    `Every page has a Markdown version at its URL with the trailing slash replaced by \`.md\`: \`${siteUrl}/guides/embed-in-node/\` is also \`${twin(siteUrl, "guides/embed-in-node")}\`. The home page's is \`${twin(siteUrl, "index")}\`. The task links below go to those versions.`,
    `For a project-onboarding map written specifically for coding agents implementing AskDB elsewhere, read [AGENTS.md](${siteUrl}/AGENTS.md) first.`,
    "The docs site is organized as Start (overview, quickstart, install, Studio tour); Guides, in five groups: Build (embed in a Node app, enrich your schema, introspect without a connection, bring your own model, switch engines, connect to SQL Server, RAG for large schemas, rerun a query with new values, plan a chart for a query result (experimental), bundle an app), Run in production (run safely, cap the rows a query returns, keep sensitive columns out of prompts, match your server's string settings, deploy as an HTTP service, enable Studio execute), Tenancy (scope queries to a tenant, tenant hierarchies, enforce tenancy in the database), Maintain (upgrade AskDB, fix common errors) and Integrations (Prisma, expose AskDB as an agent tool); Concepts (how AskDB works, the schema artifact, safety boundaries, modes and dialects, privacy model, tenant isolation); and Reference (CLI, HTTP API, configuration, Studio, the schema artifact and tenant policy formats, the SQL checks, packages, the upgrade notes by release, and the core, client, client/charts (experimental), config, ai, rag and introspection APIs). The documentation sets below hold every page, whole and by section.",
    "## Common tasks",
    tasks.join("\n"),
  ].join("\n\n");
}

/** The starlight-llms-txt options. `siteUrl` is the site's origin plus its base path, without a trailing slash. */
export function llmsTxtOptions(siteUrl) {
  return {
    details: llmsDetails(siteUrl),
    // One file per sidebar section, for an agent that needs one kind of page and not the whole site.
    customSets: [
      { label: "Start", paths: ["index", "quickstart", "install", "studio"], description: "the overview, the Quickstart tutorial, the install options and the Studio tour" },
      { label: "Guides", paths: ["guides/**"], description: "the how-to guides: build, run in production, tenancy, maintain and integrations" },
      { label: "Concepts", paths: ["concepts/**"], description: "the explanation pages: how AskDB works, the schema artifact, safety boundaries, modes and dialects, the privacy model and tenant isolation" },
      { label: "Reference", paths: ["reference/**"], description: "the CLI, the HTTP API, configuration, the formats, the SQL checks, the packages and every API" },
    ],
    optionalLinks: [
      { label: "Schema enrichment skill", url: `${siteUrl}/skills/askdb-enrich-schema/SKILL.md`, description: "a skill for an agent that enriches a freshly introspected schema with the user" },
      { label: "Upgrade notes by release", url: twin(siteUrl, "reference/upgrade-notes"), description: "what to change in an app for each AskDB release; needed only when upgrading" },
      { label: "Source code", url: "https://github.com/Ygilany/AskDB", description: "the AskDB repository, with runnable examples under `examples/`" },
    ],
    // In `/llms-full.txt` and `/llms-small.txt`, pages come in reading order: the overview and the
    // tutorial, then concepts, guides and reference. The upgrade notes are long and matter only
    // during an upgrade, so they go last, and the abridged file leaves them out.
    promote: ["index*", "quickstart", "install", "studio", "concepts/**", "guides/**"],
    demote: ["reference/upgrade-notes"],
    exclude: ["reference/upgrade-notes"],
    // Heading anchor links ("Section titled …") and copy buttons are site furniture, not content.
    customSelectors: { all: [".sl-anchor-link", "button"] },
  };
}
