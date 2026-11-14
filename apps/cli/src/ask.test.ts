import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAskDbRuntimeForTests } from "@askdb/config";
import { runAskCli } from "./ask.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "../../../fixtures/schemas/orders-users.schema");

let stdout = "";
let stderr = "";
let project: string;
let cwd: string;

/** A project directory with an askdb.config that points `--schema`'s default at the fixture. */
function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "askdb-ask-"));
  const config = {
    ai: { provider: "openai", providerConfig: { openai: {} } },
    introspection: { provider: "postgres", providerConfig: { postgres: {} }, outputDir: FIXTURE_DIR },
  };
  writeFileSync(join(dir, "askdb.config.mjs"), `export default ${JSON.stringify(config)};\n`);
  return dir;
}

beforeEach(() => {
  stdout = "";
  stderr = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdout += String(chunk);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderr += String(chunk);
    return true;
  });
  cwd = process.cwd();
  project = makeProject();
  process.chdir(project);
});

afterEach(() => {
  vi.restoreAllMocks();
  process.chdir(cwd);
  rmSync(project, { recursive: true, force: true });
  resetAskDbRuntimeForTests();
});

describe("askdb ask", () => {
  it("prints the checked SQL on stdout after -- sql --", async () => {
    expect(await runAskCli(["-q", "Which users?", "--mock-sql", "SELECT id FROM users"])).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toBe("-- sql --\nSELECT id FROM users\n");
  });

  it("follows the SQL with the guardrail JSON under --explain", async () => {
    expect(await runAskCli(["--question=Which users?", "--mock-sql=SELECT id FROM users", "--explain"])).toBe(0);
    const [sql, explain] = stdout.split("-- explain --\n");
    expect(sql).toBe("-- sql --\nSELECT id FROM users\n");
    expect(JSON.parse(explain!)).toMatchObject({
      statementKind: "select",
      checksVerified: expect.arrayContaining(["single_statement", "leading_select_or_with"]),
    });
  });

  it("refuses SQL that writes, naming the rule on stderr, and exits 1", async () => {
    expect(await runAskCli(["-q", "Drop them", "--mock-sql", "DELETE FROM users"])).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toMatch(/^SqlValidationError \[[\w-]+\]: /);
  });

  it("rejects an unknown --mode and exits 1", async () => {
    expect(await runAskCli(["-q", "x", "--mock-sql", "SELECT 1", "--mode", "loose"])).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toBe('AskDbError: Invalid mode: "loose". Expected one of: schema_only, bounded_results.\n');
  });

  it("leaves a missing askdb.config to the top-level handler", async () => {
    const empty = mkdtempSync(join(tmpdir(), "askdb-ask-empty-"));
    process.chdir(empty);
    try {
      await expect(runAskCli(["-q", "x", "--mock-sql", "SELECT 1"])).rejects.toThrow(
        "No askdb.config.* or .config/askdb.* found in",
      );
      expect(stdout).toBe("");
    } finally {
      process.chdir(project);
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("askdb ask prints the loader's warnings on stderr", () => {
  it("prints each warning as one line, and still answers", async () => {
    const dir = join(project, "orders-users.schema");
    cpSync(FIXTURE_DIR, dir, { recursive: true });
    const orders = join(dir, "tables/orders.md");
    writeFileSync(
      orders,
      readFileSync(orders, "utf8").replace(
        "  - id: table:public.orders#id\n    aliases: [order_id]\n",
        "  - id: table:public.orders#id\n    aliases: [order_id]\n  - id: table:public.orders#id\n    aliases: [again]\n",
      ),
    );

    expect(await runAskCli(["-q", "Which users?", "--mock-sql", "SELECT id FROM users", "--schema", dir])).toBe(0);
    expect(stderr).toBe(
      "Warning: tables/orders.md lists column table:public.orders#id more than once; only the first entry's description, aliases and enum apply\n",
    );
    expect(stdout).toContain("SELECT id FROM users");
  });

  it("prints a tenant policy's warning before it stops at the missing tenant scope", async () => {
    const dir = join(project, "agency-multi-tenant.schema");
    cpSync(resolve(FIXTURE_DIR, "../agency-multi-tenant.schema"), dir, { recursive: true });
    const policy = join(dir, "tenant-policy.md");
    writeFileSync(policy, readFileSync(policy, "utf8").replace("  - table:public.service_types\n", "  - table:public.service_types\n  - table:public.gone\n"));

    expect(await runAskCli(["-q", "Which agencies?", "--mock-sql", "SELECT id FROM agencies", "--schema", dir])).toBe(1);
    expect(stderr.startsWith("Warning: tenant-policy.md: global table table:public.gone is not in schema.json\n")).toBe(true);
    expect(stderr).toContain("TenantScopeError");
  });
});

/** A fake OpenAI Responses endpoint that answers every request with `sql`. Returns its base URL. */
async function startFakeModel(sql: string): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    for await (const _ of req);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "resp_test",
        object: "response",
        created_at: 0,
        model: "gpt-4o-mini",
        status: "completed",
        incomplete_details: null,
        output: [
          {
            type: "message",
            id: "msg_test",
            status: "completed",
            role: "assistant",
            content: [{ type: "output_text", text: `\`\`\`sql\n${sql}\n\`\`\``, annotations: [] }],
          },
        ],
        usage: {
          input_tokens: 1,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 1,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 2,
        },
      }),
    );
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected inet address");
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}

// A model call can take seconds. A person watching a terminal sees one line on stderr
// while it runs, cleared before anything else prints; pipes and logs see nothing (#947).
describe("askdb ask shows progress while the model runs", () => {
  const PROGRESS = "Generating SQL…";
  const CLEAR = "\r\x1b[K";
  let model: Awaited<ReturnType<typeof startFakeModel>>;
  const stderrTTY = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");

  /** Point the project's config at a fake model that answers `sql`, and set whether stderr is a terminal. */
  async function useModel(sql: string, { tty }: { tty: boolean }): Promise<void> {
    model = await startFakeModel(sql);
    const config = {
      ai: {
        provider: "openai",
        providerConfig: { openai: { apiKey: "sk-test", baseUrl: model.baseUrl } },
        language: { model: "gpt-4o-mini" },
      },
      introspection: { provider: "postgres", providerConfig: { postgres: {} }, outputDir: FIXTURE_DIR },
    };
    writeFileSync(join(project, "askdb.config.mjs"), `export default ${JSON.stringify(config)};\n`);
    Object.defineProperty(process.stderr, "isTTY", { value: tty, configurable: true });
  }

  afterEach(async () => {
    if (stderrTTY) Object.defineProperty(process.stderr, "isTTY", stderrTTY);
    else delete (process.stderr as { isTTY?: boolean }).isTTY;
    await model.close();
  });

  it("on a terminal, shows a progress line on stderr and clears it before the SQL; stdout holds only the SQL", async () => {
    await useModel("SELECT id FROM users", { tty: true });

    expect(await runAskCli(["-q", "Which users?"])).toBe(0);

    expect(stderr).toBe(`${PROGRESS}${CLEAR}`);
    expect(stdout).toBe("-- sql --\nSELECT id FROM users\n");
  });

  it("on a terminal, clears the progress line before an error", async () => {
    await useModel("DELETE FROM users", { tty: true });

    expect(await runAskCli(["-q", "Drop them"])).toBe(1);

    expect(stderr.startsWith(`${PROGRESS}${CLEAR}SqlValidationError [`)).toBe(true);
    expect(stdout).toBe("");
  });

  it("on a terminal, prints a loader warning above the progress line and draws it again", async () => {
    await useModel("SELECT id FROM users", { tty: true });
    const dir = join(project, "orders-users.schema");
    cpSync(FIXTURE_DIR, dir, { recursive: true });
    const orders = join(dir, "tables/orders.md");
    writeFileSync(
      orders,
      readFileSync(orders, "utf8").replace(
        "  - id: table:public.orders#id\n    aliases: [order_id]\n",
        "  - id: table:public.orders#id\n    aliases: [order_id]\n  - id: table:public.orders#id\n    aliases: [again]\n",
      ),
    );

    expect(await runAskCli(["-q", "Which users?", "--schema", dir])).toBe(0);

    expect(stderr).toBe(
      `${PROGRESS}${CLEAR}Warning: tables/orders.md lists column table:public.orders#id more than once; only the first entry's description, aliases and enum apply\n${PROGRESS}${CLEAR}`,
    );
  });

  // Structured logs share stderr, and mock SQL has no model call to wait for.
  it.each([
    ["stderr is not a terminal", false, []],
    ["--mock-sql is passed", true, ["--mock-sql", "SELECT id FROM users"]],
    ["structured logs are on", true, ["--log-level", "warn"]],
  ])("shows nothing when %s", async (_, tty, flags) => {
    await useModel("SELECT id FROM users", { tty });

    expect(await runAskCli(["-q", "Which users?", ...flags])).toBe(0);

    expect(stderr).toBe("");
    expect(stdout).toBe("-- sql --\nSELECT id FROM users\n");
  });
});
