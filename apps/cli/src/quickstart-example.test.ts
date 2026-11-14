/**
 * `examples/quickstart-shop` (#940) holds the files the Quickstart has the reader type, so
 * the page can offer it as "Skip the typing". This keeps the two in step: each file must be
 * the page's code block for it, the README's commands must be the page's, and the example's
 * `askdb` range must admit this CLI's release line. installable-smoke runs the example
 * against the packed packages, with `--mock-sql`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import semver from "semver";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../../..");
const exampleDir = join(repoRoot, "examples/quickstart-shop");
const page = readFileSync(join(repoRoot, "apps/docs-site/src/content/docs/quickstart.mdx"), "utf8");
const readme = readFileSync(join(exampleDir, "README.md"), "utf8");

/** The body of the first fenced block on the page that opens with `opening`, with a final newline. */
function fence(opening: string): string {
  const start = page.indexOf(`${opening}\n`);
  if (start === -1) throw new Error(`quickstart.mdx has no block opening with ${opening}`);
  const body = page.slice(start + opening.length + 1);
  return `${body.slice(0, body.indexOf("\n```"))}\n`;
}

/** Every line of the page with its indentation removed, so lines inside tabs and lists match too. */
const pageLines = new Set(page.split("\n").map((line) => line.trim()));

describe("examples/quickstart-shop", () => {
  it.each([
    ["shop.sql", "sql"],
    ["make-shop.mjs", "js"],
    ["run-query.mjs", "js"],
  ])("%s is the page's code block for it", (file, lang) => {
    expect(readFileSync(join(exampleDir, file), "utf8")).toBe(fence(`\`\`\`${lang} title="${file}"`));
  });

  it("README commands are the page's", () => {
    const commands = readme
      .split("\n")
      .filter((line) => /^(npx askdb |npx gitpick |pnpm config )/.test(line));
    expect(commands.length).toBeGreaterThanOrEqual(5);
    for (const command of commands) {
      expect(
        pageLines.has(command) || page.includes(`\`${command}\``),
        `README command not on the Quickstart page: ${command}`,
      ).toBe(true);
    }
  });

  it("pins askdb to this CLI's release line", () => {
    const cliVersion = (JSON.parse(readFileSync(join(repoRoot, "apps/cli/package.json"), "utf8")) as { version: string })
      .version;
    const example = JSON.parse(readFileSync(join(exampleDir, "package.json"), "utf8")) as {
      devDependencies?: Record<string, string>;
    };
    const range = example.devDependencies?.askdb;
    // A caret range, such as `^1.0.0-rc.1`, so a reader gets the latest release on the line.
    expect(range).toMatch(/^\^\d+\.\d+\.\d+(-[\w.]+)?$/);
    expect(semver.satisfies(cliVersion, range!), `${range} doesn't admit askdb ${cliVersion}`).toBe(true);
  });
});
