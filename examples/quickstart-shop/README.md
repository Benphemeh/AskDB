# Quickstart shop

The files the [AskDB Quickstart](https://askdb.tools/quickstart/) has you type: a small SQLite shop database and a script that runs the SQL AskDB returns. Fetch them to skip the typing, then run the AskDB steps yourself.

## Get it

```bash
npx gitpick Ygilany/AskDB/tree/main/examples/quickstart-shop askdb-shop
cd askdb-shop
```

## What's here

- `shop.sql`: three tables (`customers`, `products`, `orders`) and their rows. Quickstart step 1.
- `make-shop.mjs`: loads `shop.sql` into a new `shop.db` file with Node's built-in SQLite module. Quickstart step 1.
- `run-query.mjs`: reads SQL from stdin, opens `shop.db` read-only and runs the SQL. Quickstart step 6.
- `package.json`: installs the AskDB CLI (`askdb`) as a dev dependency, on the 1.0 release line.

The commands below make the rest: `shop.db`, `askdb.config.ts`, `.env.example`, `.env` and the `askdb/` folder. None of them is in this folder until you run the commands.

## Run it

You need Node.js 22.23.4 or newer and an OpenAI API key. The Quickstart's [Before you start](https://askdb.tools/quickstart/#before-you-start) lists the systems the SQLite driver supports.

```bash
npm install
node make-shop.mjs
npx askdb init --yes --database sqlite --sqlite-file ./shop.db
cp .env.example .env
```

Open `.env` and put your key after `OPENAI_API_KEY=`. Then read the schema and ask a question, piping the SQL into `run-query.mjs`:

```bash
npx askdb introspect
npx askdb ask --question "How much has each customer spent in total, highest first?" | node run-query.mjs
```

The Quickstart explains each command and the output to expect. For Anthropic or Google, add `--ai-provider anthropic` or `--ai-provider google` to `askdb init`, and fill in that provider's key in `.env`.

With pnpm 11.28 or newer, run these two commands instead of `npm install`, and `pnpm exec askdb` instead of `npx askdb`. The first lets a just-published AskDB release install, in this folder only. Older pnpm 11 releases stop at `askdb init`, because they won't install the SQLite driver until you approve its build script:

```bash
pnpm config set --location project minimumReleaseAgeExclude '["askdb","@askdb/*"]' --json
pnpm install
```

With Yarn, follow the yarn tabs in the Quickstart.

To start over, delete `shop.db` before you run `node make-shop.mjs` again.
