---
name: askdb-enrich-schema
description: Walk a user through enriching an AskDB schema artifact after `askdb introspect`. Mark the sensitive columns, find the ambiguous ones, ask the user targeted questions, and write the answers into `tables/*.md` and `concepts.md`. Use when a user asks to enrich their AskDB schema, or when `askdb ask` writes wrong SQL because the schema lacks business meaning.
---

# Enrich an AskDB schema artifact

`askdb introspect` writes a schema directory (by default `./askdb/`): `schema.json` holds each table's columns, types, keys and foreign keys. AskDB writes better SQL when the directory also says what the data *means*. That meaning lives in the **describable layer**: one `tables/<table>.md` file per table, and an optional `concepts.md`. Your job is to fill the describable layer with the user's knowledge, which the names alone can't give you.

The user is the source of truth. You draft and ask; they decide.

## Boundaries

- **Write only the describable layer:** `tables/*.md` and `concepts.md`. `schema.json` belongs to introspection, which rewrites it on the next run, and `tenant-policy.md` belongs to the user's tenancy setup. When either looks wrong, tell the user.
- **Read names and types only.** Work from `schema.json` and from what the user tells you. Leave the database closed: no queries, no sample rows, no `SELECT DISTINCT`. When you need a value set, such as a status column's codes, ask the user for it.
- **Keep sensitive columns out of the text.** For a sensitive table or column, write `sensitive: true` and nothing else: AskDB drops its description, aliases, enum values and notes. Everywhere else, no description, alias, enum value, note, section or concept may name a sensitive column, and no concept may link a sensitive table or column. A column marked sensitive itself counts by its bare name, whole word, in any case. A column sensitive only because its table is counts as `table.column`. AskDB leaves out text that names one from retrieval, and from the prompt when sensitive columns are omitted, so the text would be lost anyway.

## Steps

### 1. Read the schema

Find the schema directory: `introspection.outputDir` in `askdb.config.ts`, else `./askdb/`. The commands below write it as `./askdb`; use the directory you found. Read `schema.json`, and every existing `tables/*.md` and `concepts.md`. Existing text is the user's work: extend it, and change it only when the user says so.

Done when you can list every table with its columns and foreign keys.

### 2. Mark the sensitive columns

Start the list from the marks already there: a re-introspection keeps each `sensitive: true` a person set in `schema.json`, and table files can mark more. A first introspection marks nothing. Then propose the columns that look like personal or secret data (emails, phone numbers, names, addresses, government IDs, dates of birth, tokens, password hashes, salaries, free-text notes), and ask the user to confirm or extend the list. Ask which whole tables are sensitive too.

Write each new one as `sensitive: true` in the table's file: in the table's front-matter for a whole table, or in its `columns[]` entry for a column. A file can only add sensitivity, never remove it.

Done when the user has confirmed the list and every table or column on it is marked. Keep the list: the next steps follow it.

### 3. Summarize and find the gaps

Show the user a short summary: the tables, what each seems to hold, and how they link through foreign keys. Offer a Mermaid `erDiagram` when there are more than a few tables.

Then list what the names leave ambiguous, outside the sensitive list. Look for:

- **Coded values:** `status`, `type`, `kind`, `state`, single-letter or integer codes, booleans whose `true` isn't obvious.
- **Date pairs and lifecycles:** `started_at` / `ended_at`, `created_at` versus `paid_at`, soft deletes (`deleted_at`, `is_active`).
- **Money and units:** currency, cents versus dollars, tax and discounts in or out, units of weight, time or distance.
- **Business terms:** words the user's team says that no table is named after, such as "active customer", "churn" or "revenue".
- **Look-alike tables:** `users` versus `accounts`, `orders` versus `order_items`, archive or staging copies.
- **Tables to leave out:** migrations, queues, audit logs and other internal tables, which `tracked: false` keeps out of prompts.

Done when every table off the sensitive list has been looked at, and the gaps are listed in the order they matter for the user's questions.

### 4. Ask, then write

Ask about the gaps a few at a time, three to five per round. Name the table and column in each question, and offer a draft answer the user can accept or correct ("Does `orders.status = 'paid'` mean the payment cleared?"). Ask what questions the user expects people to ask: those are the best guide to what needs describing.

After each round, write the answers into the files (see [File format](#file-format)). Ask before overwriting anything the user wrote.

Done when the user says the important gaps are covered, or has deferred the rest.

### 5. Check the text against the sensitive list

Search everything you wrote for each name on the step 2 list, as the sensitive boundary above defines a match, and check each concept's `links`. Reword any hit to describe the meaning without the name.

If the project can import `@askdb/core` (it's in `package.json`, or npm installed it with `askdb`), you can also save this script in the project root as `check-mentions.mjs`, run `node check-mentions.mjs ./askdb`, then delete it. It applies AskDB's own rule to the loaded schema. It can't see text on a sensitive table or column, which the loader drops, or `## Example questions`, so search those by hand:

```js
// Prints each describable text that names a sensitive column, and each concept that links one.
import { createMentionMatcher, loadSchema, sensitiveMentionNames } from "@askdb/core";

const schema = loadSchema(process.argv[2] ?? "./askdb");
const matcher = createMentionMatcher(sensitiveMentionNames(schema));
const sensitiveIds = new Set(schema.tables.flatMap((t) => [...(t.sensitive ? [t.id] : []), ...t.columns.filter((c) => c.sensitive).map((c) => c.id)]));
const texts = [];
for (const t of schema.tables) {
  texts.push([t.id, [t.description, t.primaryEntity, t.commonQueryLanguage, t.businessContext, ...(t.aliases ?? [])]]);
  for (const c of t.columns) texts.push([c.id, [c.description, c.note, ...(c.aliases ?? []), ...(c.enum ?? [])]]);
}
for (const k of schema.concepts ?? []) texts.push([k.id, [k.label, k.description, ...(k.synonyms ?? [])]]);
let found = 0;
for (const [id, parts] of texts) {
  const names = matcher.find(parts.filter(Boolean).join("\n"));
  if (names.length) { found++; console.log(`${id}: names ${names.map((n) => typeof n === "string" ? n : `${n.table}.${n.column}`).join(", ")}`); }
}
for (const k of schema.concepts ?? []) {
  const links = (k.links ?? []).filter((link) => sensitiveIds.has(link));
  if (links.length) { found++; console.log(`${k.id}: links ${links.join(", ")}`); }
}
console.log(found ? `${found} problem(s) found` : "No describable text names a sensitive column, and no concept links one.");
```

Done when no text you wrote names a sensitive column, and no concept links one.

### 6. Check that the directory loads

Run `askdb bundle`, which loads the directory with the same loader `ask()` uses and needs no AI key, then delete its output:

```bash
npx askdb bundle ./askdb --out ./askdb-check.bundle.json
rm ./askdb-check.bundle.json
```

It exits `1` with the loader's error when a file doesn't load: a front-matter key AskDB doesn't know, YAML that doesn't parse, or two files for one table. It prints a `Warning:` line on stderr for each problem that doesn't stop the load. Fix each error, and each warning that names a file in `tables/`, such as a column ID that `schema.json` doesn't have, then run it again. A warning about `schema.json` or `tenant-policy.md` is outside the describable layer: tell the user about it.

Done when it exits `0` and no `Warning:` line names a file in `tables/`.

### 7. Try the user's questions

Ask the user for three to five real questions, the kind their team asks. For each, run:

```bash
npx askdb ask --schema ./askdb --question "<the question>"
```

It needs `askdb.config.ts` with a model key, which `askdb init` sets up. Show the user each question with its SQL, and ask whether the SQL answers it. When it doesn't, find what the schema text left out or got wrong, fix it, and run the question again. `askdb ask` can't serve a schema with a `tenant-policy.md`, so for one, have the user try the questions in their app or in Studio's Playground (`npx askdb studio`).

Done when the user accepts the SQL for each question, or has decided what to do about the ones that still miss.

## File format

Full rules: https://askdb.tools/reference/schema-artifact-format/

A table file links to its table by the front-matter `id`, never by its file name. Keep an existing file's name. Name a new one `<table>.md`, or `<schema>.<table>.md` when two schemas have a table of that name.

```markdown
---
id: table:public.orders            # the table's id in schema.json
name: orders
schemaId: shop                     # schema.json's schemaId
aliases: [purchases, sales]
columns:
  - id: table:public.orders#status
    description: Where the order is in its lifecycle.
    enum: [pending, paid, shipped, cancelled]
  - id: table:public.orders#total_cents
    aliases: [order total]
    description: The order total in US cents, after discounts, before tax.
---

# Table: orders

One row per order a customer submitted.

## Common query language

- "sales" means orders with `status = 'paid'`.
- "revenue" means `sum(total_cents) / 100.0` over paid orders.

## Business context

An order moves from `pending` to `paid` to `shipped`, or ends `cancelled`. Refunds live in `refunds`.

## Column notes

- `shipped_at`: null until the warehouse ships the order.

## Example questions

- How much revenue did we make last month?
```

- **Front-matter is YAML, and only these keys load.** Table: `id`, `name`, `schemaId` (all three required), `aliases`, `primaryEntity`, `tags`, `sensitive`, `tracked`, `columns`. Column entry: `id` (required), `description`, `aliases`, `enum`, `sensitive`. Any other key fails the load.
- **The table's description is the body's first paragraph,** after the `# Table:` heading. Front-matter has no `description` key for a table.
- **`## Common query language`** is what the model reads first: how the user's words map to columns and filters.
- **`## Business context`** holds longer background. **`## Column notes`** adds a line to a column, matched by its name, not its ID.
- **`## Example questions`** only feeds retrieval for large schemas. It never reaches a full-schema prompt.
- **`tracked: false`** keeps a table out of prompts and the index, without deleting it.
- **One entry per column.** List each column once in `columns[]`, in its own table's file.

`concepts.md` holds terms that span tables:

```markdown
---
concepts:
  - id: concept:revenue
    label: Revenue
    synonyms: [sales, gross sales]
    links: [table:public.orders#total_cents]
    description: The sum of paid orders' totals, in US cents.
---
```

Each concept needs `id` and `label`. `links` takes table and column IDs from `schema.json`.
