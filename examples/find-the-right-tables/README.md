# Find the right tables with RAG

The files for the AskDB tutorial [Find the right tables with RAG](https://askdb.tools/find-the-right-tables/): a 63-table SQLite schema of a made-up SaaS business, where retrieval leaves out the `plans` table until you describe it.

## Get it

```bash
npx gitpick Ygilany/AskDB/tree/main/examples/find-the-right-tables askdb-saas
cd askdb-saas
```

## What's here

- `saas.sql`: 63 tables. Only `customers`, `plans` and `subscriptions` have rows.
- `make-saas.mjs`: loads `saas.sql` into a new `saas.db` with Node's built-in SQLite module.
- `enrichment/subscriptions.md`: the rule for an active subscription, from [Enrich your schema](https://askdb.tools/guides/author-your-schema/). The tutorial copies it into `askdb/tables/`.
- `ask.mjs`: asks a question with retrieval, prints the tables retrieval put in the prompt, then runs the SQL on `saas.db`, read-only.
- `finished/`: the files the tutorial has you write (`plans.md`, `concepts.md`) and the edited `askdb.config.ts`. Compare yours with them if a step doesn't work.
- `recorded/`: the output of one run of every step, with OpenAI `text-embedding-3-small` and `gpt-4o-mini` on 2026-11-16.

## Run it

You need Node.js 22.23.4 or newer and an OpenAI API key. The [tutorial](https://askdb.tools/find-the-right-tables/) walks through each step and what its output means.

```bash
npm install
node make-saas.mjs
npx askdb init --yes --database sqlite --sqlite-file ./saas.db
cp .env.example .env            # then set OPENAI_API_KEY; leave OPENAI_MODEL empty to match the recorded runs
npx askdb introspect
mkdir -p askdb/tables && cp enrichment/subscriptions.md askdb/tables/
```

Set `rag.embedder` to `"ai"` and add `ai.embedding` in `askdb.config.ts`, as in `finished/askdb.config.ts`. Then:

```bash
npx askdb rag index
node --env-file=.env ask.mjs    # retrieval misses plans: the model guesses a price
cp finished/plans.md askdb/tables/ && cp finished/concepts.md askdb/
npx askdb rag index
node --env-file=.env ask.mjs    # retrieval finds plans: MRR is 38
```
