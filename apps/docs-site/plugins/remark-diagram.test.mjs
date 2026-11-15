import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DiagramError, parseDiagram } from "./diagram/parse.mjs";
import { layouts, renderDiagram, textAlternative } from "./diagram/render.mjs";
import { lineWidth, plain, wrap } from "./diagram/text.mjs";
import { remarkDiagram } from "./remark-diagram.mjs";

const FLOW = `flow
title: How a question becomes checked SQL.
# a note for maintainers
lane files: Schema artifact
lane askdb: AskDB
lane app: Your application
lane db database: Your database | holds the rows
step policy @files: \`tenant-policy.md\`
+ step scope @app: authorizes the caller, passes \`tenantScope\`
step prompt @askdb: 1. prompt: filter with \`:tenant_organization_ids\`
step check @askdb: 2. check: a tenant predicate on each scoped table
step run @app: runs the SQL
+ step rows @db: row-level security returns only the caller's rows
group \`ask()\`: prompt check
policy -> prompt
scope -> prompt
prompt -> check
check -> run: checked SQL
run -> rows
`;

const SEQUENCE = `sequence
title: One request.
lane handler app: Your handler
lane askdb: AskDB
lane model: Model provider
boundary Your stack: handler askdb
handler -> askdb: \`ask(question)\`
askdb -> model: question, schema
model ..> askdb: SQL
askdb -> askdb: run the SQL checks
askdb ..> handler: \`sql\`, \`tenantParams\`
`;

/** Every text box of both layouts: no wrapped line may be wider than the room its box gives it. */
function overflowing(source) {
  const { wide, narrow } = layouts(parseDiagram(source), "t");
  return [...wide.boxes, ...narrow.boxes].flatMap(({ lines, size, room }) => lines.filter((line) => lineWidth(line, size) > room).map((line) => line.map((run) => run.text).join("")));
}

test("a flow parses into lanes, steps on rows, groups and links", () => {
  const diagram = parseDiagram(FLOW);
  assert.equal(diagram.kind, "flow");
  assert.deepEqual(diagram.lanes.map((lane) => [lane.id, lane.kind, lane.label, lane.note]), [
    ["files", "files", "Schema artifact", undefined],
    ["askdb", "askdb", "AskDB", undefined],
    ["app", "app", "Your application", undefined],
    ["db", "database", "Your database", "holds the rows"],
  ]);
  assert.deepEqual(diagram.steps.map((step) => [step.id, step.lane, step.row, step.group]), [
    ["policy", 0, 0, undefined],
    ["scope", 2, 0, undefined],
    ["prompt", 1, 1, 0],
    ["check", 1, 2, 0],
    ["run", 2, 3, undefined],
    ["rows", 3, 3, undefined],
  ]);
  assert.deepEqual(diagram.links[3], { from: "check", to: "run", label: "checked SQL", dashed: false });
});

test("a diagram that can't be drawn says why, with the line", () => {
  const cases = [
    ["graph TB", /the first line names the kind/, 1],
    ["flow\ntitle: T\nlane app: A\nstep a @askdb: x", /lane "askdb", which isn't declared/, 4],
    ["flow\ntitle: T\nlane helper: A", /needs a kind, one of: app, askdb/, 3],
    ["flow\ntitle: T\nlane app: A\nstep a @app: x\na -> b", /names the step "b", which isn't declared/, 5],
    ["flow\ntitle: T\nlane app: A\nstep a @app: x\n+ step b @app: y", /shares a row and a lane/, 5],
    ["flow\nlane app: A\nstep a @app: x", /needs a "title:" line/, 3],
    ["flow\ntitle: T\nlane app: A\nlane askdb: B\nstep a @app: x", /lane "askdb" holds no step/, 5],
    ["sequence\ntitle: T\nlane app: A\nlane askdb: B\napp -> askdb", /needs a label/, 5],
    ["flow\ntitle: T\nlane app: A\nstep a @app: x\ngroup G: a z", /names the step "z"/, 5],
    ["flow\ntitle: T\nlane app: A\nlane askdb: B\nstep a @app: x\nstep b @askdb: y\ngroup G: a b", /holds steps of more than one lane/, 7],
    ["flow\ntitle: T\nlane app: A\nstep app @app: x", /"app" is already a lane/, 4],
    ["flow\ntitle: T\nlane app: A\nlane askdb: B\nlane model: C\nlane database: D\nlane files: E", /a flow has 4 lanes at most/, 7],
    ["sequence\ntitle: T\nlane app: A\nlane askdb: B\nlane model: C\nlane database: D\nlane files: E\nlane person: F", /a sequence has 5 lanes at most/, 8],
    ["flow\ntitle: T\nlane app: A\ndecide ok @app: right?\nstep b @app: y\nok -> b", /the decision "ok" needs two or more links out, each labelled/, 6],
    ["flow\ntitle: T\ntitle: U\nlane app: A\nstep a @app: x", /has two "title:" lines/, 3],
    ["flow\ntitle: T\nlane app: A | \nstep a @app: x", /lane "app" needs a label, and a note after its " \| "/, 3],
    ["flow\ntitle: T\nlane askdb: A\nstep a @askdb: x\nstep b @askdb: y\nstep c @askdb: z\ngroup Inside: a c", /group "Inside" skips the step "b"/, 7],
    ["flow\ntitle: T\nlane app: A\nlane askdb: B\nlane model: C\nstep a @app: x\n+ step b @askdb: y\n+ step c @model: z\na -> c: direct", /the link "a -> c" runs along a row through the step "b"/, 9],
  ];
  for (const [source, message, line] of cases) {
    assert.throws(() => parseDiagram(source), (error) => error instanceof DiagramError && message.test(error.message) && error.line === line, source);
  }
});

test("a label wraps to lines that fit, breaks a long identifier after a separator, and keeps code runs", () => {
  const lines = wrap("1. prompt: filter with `:tenant_organization_ids`", 106, 13);
  for (const line of lines) assert.ok(lineWidth(line, 13) <= 106, JSON.stringify(line));
  assert.equal(lines.map((line) => line.map((run) => run.text).join("")).join("|"), "1. prompt: filter|with|:tenant_|organization_|ids");
  assert.ok(lines[2][0].mono);
  assert.equal(plain("the `ask()` call"), "the ask() call");
  // One word wider than the box is split, never left to overflow.
  for (const line of wrap("Supercalifragilisticexpialidocious", 60, 13)) assert.ok(lineWidth(line, 13) <= 60);
});

test("no text in either layout is wider than its box, for a flow and a sequence", () => {
  assert.deepEqual(overflowing(FLOW), []);
  assert.deepEqual(overflowing(SEQUENCE), []);
});

test("the wide flow puts each step in its owner's lane, and the narrow one stacks every step", () => {
  const { wide, narrow } = layouts(parseDiagram(FLOW), "t");
  assert.ok(wide.width <= 700 && narrow.width <= 336);
  assert.equal((wide.body.match(/class="dg-lane /g) ?? []).length, 4);
  assert.equal((wide.body.match(/class="dg-node dg-node-askdb"/g) ?? []).length, 2);
  assert.equal((narrow.body.match(/class="dg-node /g) ?? []).length, 6);
  // Five links in each: every one has an arrow.
  assert.equal((wide.body.match(/class="dg-link/g) ?? []).length, 5);
  assert.equal((narrow.body.match(/class="dg-link/g) ?? []).length, 5);
});

test("the rendered diagram has a wide and a narrow SVG with the title as their name, unique ids, and the text alternative", () => {
  const html = renderDiagram(SEQUENCE, "diagram-3");
  assert.match(html, /^<div class="askdb-diagram" data-diagram="sequence"><svg class="dg dg-wide"[^>]* role="img" aria-label="One request\."/);
  assert.match(html, /<svg class="dg dg-narrow"/);
  assert.match(html, /id="diagram-3-w-arrow"/);
  assert.match(html, /id="diagram-3-n-arrow"/);
  assert.match(html, /<div class="dg-text-alt"><ul class="dg-text-frame">/);
});

test("the text alternative says who owns each step and where it leads, or who sends each message", () => {
  assert.equal(
    textAlternative(parseDiagram(FLOW)),
    '<div class="dg-text-alt"><ul class="dg-text-frame"><li><strong>Your database:</strong> holds the rows</li></ul><ul>' +
      "<li><strong>Schema artifact:</strong> <code>tenant-policy.md</code><ul><li>→ 1. prompt: filter with <code>:tenant_organization_ids</code></li></ul></li>" +
      "<li><strong>Your application:</strong> authorizes the caller, passes <code>tenantScope</code><ul><li>→ 1. prompt: filter with <code>:tenant_organization_ids</code></li></ul></li>" +
      "<li><strong>AskDB (<code>ask()</code>):</strong> 1. prompt: filter with <code>:tenant_organization_ids</code><ul><li>→ 2. check: a tenant predicate on each scoped table</li></ul></li>" +
      "<li><strong>AskDB (<code>ask()</code>):</strong> 2. check: a tenant predicate on each scoped table<ul><li>→ runs the SQL: checked SQL</li></ul></li>" +
      "<li><strong>Your application:</strong> runs the SQL<ul><li>→ row-level security returns only the caller's rows</li></ul></li>" +
      "<li><strong>Your database:</strong> row-level security returns only the caller's rows</li></ul></div>",
  );
  assert.equal(
    textAlternative(parseDiagram(SEQUENCE)),
    '<div class="dg-text-alt"><ul class="dg-text-frame"><li><strong>Your stack</strong> holds: Your handler, AskDB</li></ul><ol>' +
      "<li><strong>Your handler → AskDB:</strong> <code>ask(question)</code></li>" +
      "<li><strong>AskDB → Model provider:</strong> question, schema</li>" +
      "<li><strong>Model provider → AskDB (reply):</strong> SQL</li>" +
      "<li><strong>AskDB:</strong> run the SQL checks</li>" +
      "<li><strong>AskDB → Your handler (reply):</strong> <code>sql</code>, <code>tenantParams</code></li></ol></div>",
  );
});

test("each diagram fence becomes HTML with ids unique on its page, other fences stay, and a bad one names the page and line", () => {
  const fence = (lang, value, line) => ({ type: "code", lang, value, position: { start: { line } } });
  const tree = { type: "root", children: [fence("diagram", SEQUENCE, 3), fence("ts", "const a = 1;", 20), { type: "mdxJsxFlowElement", name: "figure", children: [fence("diagram", FLOW, 30)] }] };
  remarkDiagram()(tree, { path: "src/content/docs/page.mdx" });
  assert.equal(tree.children[0].type, "html");
  assert.match(tree.children[0].value, /id="diagram-0-w-arrow"/);
  assert.equal(tree.children[1].lang, "ts");
  assert.match(tree.children[2].children[0].value, /id="diagram-1-w-arrow"/);
  const bad = { type: "root", children: [fence("diagram", "flow\ntitle: T\nlane app: A\nstep a @app: x\na -> b", 10)] };
  assert.throws(
    () => remarkDiagram()(bad, { path: "src/content/docs/page.mdx" }),
    (error) => error instanceof DiagramError && error.message.startsWith('src/content/docs/page.mdx:15: the diagram can\'t be drawn: the link "a -> b" names the step "b"'),
  );
});

const LOOP = `flow
title: The enrich-and-test loop.
lane askdb: AskDB
lane you person: You | the schema author
step enrich @you: enrich in Studio
step ask @askdb: \`askdb ask\`
decide check @you: is the SQL right?
step commit @you: commit the \`schema\`,\\n\`artifact\`
enrich -> ask
ask -> check
check -> enrich: no: add the missing meaning to the table that the question names
check -> commit: yes
`;

/** The rectangles of one class in an SVG body: label patches, or steps drawn as <rect>. */
function rects(body, className) {
  return [...body.matchAll(new RegExp(`<rect class="${className}[^"]*" x="([\\d.-]+)" y="([\\d.-]+)" width="([\\d.-]+)" height="([\\d.-]+)"`, "g"))].map(([, x, y, w, h]) => ({ x0: +x, y0: +y, x1: +x + +w, y1: +y + +h }));
}
const hit = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5;

test("a decision has its own shape, reads as a question with its answers, and a label breaks where the author says", () => {
  const diagram = parseDiagram(LOOP);
  assert.equal(diagram.steps[2].decision, true);
  const { wide, narrow } = layouts(diagram, "t");
  for (const layout of [wide, narrow]) assert.equal((layout.body.match(/class="dg-node dg-node-person dg-decision"/g) ?? []).length, 1);
  assert.match(textAlternative(diagram), /<li><strong>You:<\/strong> Decision: is the SQL right\?<ul><li>no: add the missing meaning to the table that the question names → enrich in Studio<\/li><li>yes → commit the <code>schema<\/code>, <code>artifact<\/code><\/li><\/ul><\/li>/);
  assert.match(textAlternative(diagram), /<ul class="dg-text-frame"><li><strong>You:<\/strong> the schema author<\/li><\/ul>/);
  assert.deepEqual(wrap("commit the `schema`,\\n`artifact`", 400, 13).map((line) => line.map((run) => run.text).join("")), ["commit the schema,", "artifact"]);
  assert.equal(plain("the `tenant_\\nids` value"), "the tenant_ids value");
  assert.deepEqual(overflowing(LOOP), []);
});

test("every link label sits clear of the steps, of the other labels and of the canvas edge, in both layouts", () => {
  const TWO_OUT = `${FLOW}check -> policy: a long label that has to wrap to sit on its own link\nprompt -> run: a second labelled link out of the same row\n`;
  for (const source of [FLOW, LOOP, TWO_OUT]) {
    const { wide, narrow } = layouts(parseDiagram(source), "t");
    for (const layout of [wide, narrow]) {
      const labels = rects(layout.body, "dg-label-bg");
      const steps = rects(layout.body, "dg-node");
      for (const label of labels) {
        assert.ok(label.x0 >= 0 && label.x1 <= layout.width && label.y0 >= 0 && label.y1 <= layout.height, "a label is inside the canvas");
        assert.ok(!steps.some((step) => hit(label, step)), "no label covers a step");
      }
      labels.forEach((a, i) => labels.slice(i + 1).forEach((b) => assert.ok(!hit(a, b), "no two labels overlap")));
    }
  }
});

test("a sequence of five actors fits a phone's width without shrinking", () => {
  const five = `sequence\ntitle: T\nlane service: Client\nlane app: Your API gateway\nlane askdb: \`@askdb/http-api\`\nlane model: Your model provider\nlane database: Your database\nservice -> app: request\napp -> askdb: question\naskdb -> model: prompt\naskdb ..> app: checked SQL\napp -> database: runs the SQL under a read-only role\n`;
  const { narrow } = layouts(parseDiagram(five), "t");
  assert.ok(narrow.width <= 336, String(narrow.width));
  assert.deepEqual(overflowing(five), []);
});

test("a lane's note starts at the first \" | \" outside backticks, and keeps any later one", () => {
  const lanes = parseDiagram("sequence\ntitle: T\nlane db database: Your database | read-only role | Postgres 16\nlane app: The `a | b` service\napp -> db: runs it").lanes;
  assert.deepEqual(lanes.map((lane) => [lane.label, lane.note]), [
    ["Your database", "read-only role | Postgres 16"],
    ["The `a | b` service", undefined],
  ]);
});

test("a group's label and a phone card's tag keep every word, however narrow the frame", () => {
  const source = `flow
title: Indexing, then each call.
lane files: A schema artifact with a long name for its lane | kept in version control beside the application's code
lane askdb: AskDB
lane db database: Vector store
step artifact @files: schema artifact
+ step chunks @askdb: chunks
+ step store @db: vector store
group Once per schema change, and never on a call: chunks
artifact -> chunks
chunks -> store
`;
  const { wide, narrow } = layouts(parseDiagram(source), "t");
  /** The words of every <text> of one class, in order. */
  const words = (body, className) => [...body.matchAll(new RegExp(`<text class="${className}"[^>]*>(.*?)</text>`, "g"))].map((match) => match[1].replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ").trim();
  for (const layout of [wide, narrow]) assert.equal(words(layout.body, "dg-group-label"), "Once per schema change, and never on a call");
  // The wide frame is one step wide, so the label takes more than one line there, and the tab grows.
  assert.ok((wide.body.match(/<text class="dg-group-label"/g) ?? []).length > 1);
  assert.equal(words(narrow.body, "dg-chip"), "A schema artifact with a long name for its lane AskDB Vector store");
  assert.equal(words(narrow.body, "dg-note"), "kept in version control beside the application's code");
  assert.deepEqual(overflowing(source), []);
  // The grown tab stays clear of the steps.
  for (const layout of [wide, narrow]) for (const tab of rects(layout.body, "dg-group-tab")) assert.ok(!rects(layout.body, "dg-node").some((step) => hit(tab, step)));
});

test("the kit measures labels with Inter and JetBrains Mono, the first families of --sl-font and --sl-font-mono in tokens.css", () => {
  // plugins/diagram/text.mjs holds those two fonts' advance widths. Change a token's first family
  // and the widths there are wrong, with every other test still green.
  const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
  const first = (name) => new RegExp(`${name}:\\s*"([^"]+)"`).exec(css)?.[1];
  assert.equal(first("--sl-font"), "Inter Variable");
  assert.equal(first("--sl-font-mono"), "JetBrains Mono Variable");
});
