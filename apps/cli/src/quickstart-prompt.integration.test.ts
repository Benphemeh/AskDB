/**
 * The Quickstart's "What the model receives" excerpt (#938) against the request `askdb ask`
 * really sends: the page's own shop.sql, introspected through the SQLite adapter, then the
 * page's question asked of a fake OpenAI endpoint that records the request. The excerpt's
 * lines must appear in the prompt in order; a line starting with `…` stands for text the
 * page leaves out. Skipped when `better-sqlite3` can't load, failed under
 * ASKDB_REQUIRE_INTEGRATION=1.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetAskDbRuntimeForTests, setAskDbRuntimeForTests } from "@askdb/config";
import { integrationSuite } from "../../../scripts/test-utils/integration.mjs";
import { runAskCli } from "./ask.js";
import { runIntrospectCli } from "./introspect.js";

// The runtime config is installed in-process; the config-file check is covered by the spawned CLI tests.
vi.mock("./project-config.js", () => ({ requireAskDbConfig: vi.fn() }));

type Bs3 = typeof import("better-sqlite3");

// `better-sqlite3` is @askdb/sqlite's optional peer, resolved from there as the CLI does.
function loadDriver(): { Database?: Bs3; unavailable?: string } {
  try {
    const fromSqlite = createRequire(import.meta.resolve("@askdb/sqlite"));
    const Database = fromSqlite("better-sqlite3") as Bs3;
    new Database(":memory:").close();
    return { Database };
  } catch (err) {
    return { unavailable: `better-sqlite3 could not be loaded (${err instanceof Error ? err.message : String(err)})` };
  }
}

const { Database, unavailable } = loadDriver();
const suite = integrationSuite({ unavailable });

const page = readFileSync(join(import.meta.dirname, "../../docs-site/src/content/docs/quickstart.mdx"), "utf8");

/** The body of the first fenced block on the page that opens with `opening`. */
function fence(opening: string): string {
  const start = page.indexOf(`${opening}\n`);
  if (start === -1) throw new Error(`quickstart.mdx has no block opening with ${opening}`);
  const body = page.slice(start + opening.length + 1);
  return body.slice(0, body.indexOf("\n```"));
}

/** A fake OpenAI Responses endpoint that answers one SELECT and records each request body. */
async function startFakeModel() {
  const bodies: string[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    bodies.push(Buffer.concat(chunks).toString("utf8"));
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
            content: [{ type: "output_text", text: "```sql\nSELECT id FROM customers\n```", annotations: [] }],
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
    bodies,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}

suite("the Quickstart's prompt excerpt", () => {
  let dir: string;
  let model: Awaited<ReturnType<typeof startFakeModel>>;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "askdb-quickstart-prompt-"));
    model = await startFakeModel();
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    setAskDbRuntimeForTests({
      ai: {
        provider: "openai",
        providerConfig: { openai: { apiKey: "sk-test", baseUrl: model.baseUrl } },
        language: { model: "gpt-4o-mini" },
      },
      introspection: { provider: "sqlite", providerConfig: { sqlite: {} }, outputDir: "./askdb/" },
    });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    resetAskDbRuntimeForTests();
    rmSync(dir, { recursive: true, force: true });
    await model.close();
  });

  it("matches what askdb ask sends the model for the shop question", async () => {
    const file = join(dir, "shop.db");
    const db = new Database!(file);
    db.exec(fence('```sql title="shop.sql"'));
    db.close();
    const out = join(dir, "askdb");
    expect(await runIntrospectCli(["--engine", "sqlite", "--url", file, "--out", out])).toBe(0);

    const question = /askdb ask --question "([^"]+)"/.exec(page.slice(page.indexOf("## 5. Ask a question")))![1]!;
    expect(await runAskCli(["--schema", out, "--question", question])).toBe(0);

    expect(model.bodies).toHaveLength(1);
    const request = JSON.parse(model.bodies[0]!) as { input: { role: string; content: { text: string }[] | string }[] };
    const prompt = request.input
      .map((message) => (typeof message.content === "string" ? message.content : message.content.map((part) => part.text).join("")))
      .join("\n");
    const segments = fence('```text title="What the model receives"')
      .split(/^….*$/m)
      .map((segment) => segment.trim())
      .filter(Boolean);
    let from = 0;
    for (const segment of segments) {
      const at = prompt.indexOf(segment, from);
      expect(at, `excerpt segment not found in order:\n${segment}\n\nprompt:\n${prompt}`).toBeGreaterThanOrEqual(0);
      from = at + segment.length;
    }
  });
});
