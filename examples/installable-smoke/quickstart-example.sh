#!/usr/bin/env bash
# The Quickstart example (examples/quickstart-shop, #940) runs from the packed packages the
# way the Quickstart's pnpm tab does: install, make shop.db, `askdb init`, `askdb introspect`,
# then `askdb ask` piped into run-query.mjs. `--mock-sql` stands in for the model with the
# SQL the page shows in step 5, so no API key is needed, and the rows must be the ones the
# page shows in step 6. apps/cli/src/quickstart-example.test.ts checks the example's files
# against the page's code blocks.
#
# Usage: quickstart-example.sh <tarball-dir> <work-dir>
#
# pnpm overrides pin every AskDB package to its tarball, as the consumer lab does, so the
# example's own package.json installs unchanged. @askdb/prisma is left out: it's an optional
# peer of askdb, and pnpm installs an optional peer whose override is a tarball.
#
# One step differs from the page. `askdb init` installs @askdb/config at the CLI's own version
# from the registry, and before a release that version isn't there: neither a pnpm override
# nor an npm one redirects a package named on the add command. So init runs with
# --skip-install, and this script adds what init installs (@askdb/config, from its tarball,
# and better-sqlite3) with the same `pnpm add`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLE="$ROOT/examples/quickstart-shop"
PAGE="$ROOT/apps/docs-site/src/content/docs/quickstart.mdx"
TARBALLS="$(cd "$1" && pwd -P)"
mkdir -p "$2"
DIR="$(cd "$2" && pwd -P)/askdb-shop"
mkdir "$DIR"

# The example's files only, not a shop.db or askdb/ folder from a local run.
for file in package.json shop.sql make-shop.mjs run-query.mjs; do
  cp "$EXAMPLE/$file" "$DIR/$file"
done

OVERRIDES="$(node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const [dir] = process.argv.slice(1);
  const overrides = {};
  for (const { name, file } of JSON.parse(readFileSync(dir + '/manifest.json', 'utf8'))) {
    if (name !== '@askdb/prisma') overrides[name] = 'file:' + dir + '/' + file;
  }
  if (!overrides.askdb) throw new Error('quickstart-example: no askdb tarball in ' + dir);
  process.stdout.write(JSON.stringify(overrides));
" "$TARBALLS")"

# Run as a reader would: not under the `pnpm smoke:install` that started this script.
p() { (cd "$DIR" && env -u npm_config_user_agent -u npm_config_frozen_lockfile "$@"); }

echo "quickstart-example: pnpm install from the packed packages…"
# The README's pnpm commands, then the overrides that point AskDB at the tarballs.
p pnpm config set --location project minimumReleaseAgeExclude '["askdb","@askdb/*"]' --json
p pnpm config set --location project overrides "$OVERRIDES" --json
# Overrides don't reach a peer pnpm installs itself, so @askdb/client's @askdb/config peer would
# come from the registry, where a version not yet released isn't. Without auto-installed peers
# it resolves to the @askdb/config `askdb init` adds below, from its tarball.
p pnpm config set --location project autoInstallPeers false
p pnpm install --silent

echo "quickstart-example: node make-shop.mjs…"
p node make-shop.mjs 2>/dev/null | grep -qx 'Created shop.db'

echo "quickstart-example: askdb init…"
INIT_OUTPUT="$(p pnpm exec askdb init --yes --database sqlite --sqlite-file ./shop.db --skip-install 2>&1)" || {
  echo "quickstart-example: FAILED — askdb init exited non-zero:" >&2
  echo "$INIT_OUTPUT" >&2
  exit 1
}
CONFIG_TARBALL="$(node -e "const m = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); process.stdout.write(process.argv[2] + '/' + m.find((p) => p.name === '@askdb/config').file)" "$TARBALLS/manifest.json" "$TARBALLS")"
p pnpm add --silent "$CONFIG_TARBALL" better-sqlite3

# Every AskDB package in the lockfile must come from a tarball, or this tested the registry.
node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const lock = readFileSync(process.argv[1], 'utf8');
  const keys = [...lock.matchAll(/^  '?((?:@askdb\/[^@']+|askdb)@[^':]+(?::[^']*)?)'?:\$/gm)].map((m) => m[1]);
  const fromRegistry = keys.filter((key) => !key.includes('@file:'));
  if (!keys.some((key) => key.startsWith('askdb@')) || fromRegistry.length > 0) {
    console.error('quickstart-example: FAILED — AskDB packages not resolved from the tarballs:', fromRegistry.length ? fromRegistry : keys);
    process.exit(1);
  }
" "$DIR/pnpm-lock.yaml"

cp "$DIR/.env.example" "$DIR/.env"

echo "quickstart-example: askdb introspect…"
INTROSPECT_OUTPUT="$(p pnpm exec askdb introspect 2>&1)"
grep -qx 'Wrote askdb/schema.json: 3 tables (sqlite).' <<<"$INTROSPECT_OUTPUT" || {
  echo "quickstart-example: FAILED — askdb introspect didn't print the page's line:" >&2
  echo "$INTROSPECT_OUTPUT" >&2
  exit 1
}

echo "quickstart-example: askdb ask --mock-sql | node run-query.mjs…"
# Step 5's question and SQL: the first plain sql block after its heading.
read_page() {
  node --input-type=module -e "
    import { readFileSync } from 'node:fs';
    const page = readFileSync(process.argv[1], 'utf8');
    const step5 = page.slice(page.indexOf('## 5. Ask a question'));
    const what = process.argv[2];
    if (what === 'question') process.stdout.write(/askdb ask --question \"([^\"]+)\"/.exec(step5)[1]);
    else { const body = step5.slice(step5.indexOf('\`\`\`sql\n') + 7); process.stdout.write(body.slice(0, body.indexOf('\n\`\`\`'))); }
  " "$PAGE" "$1"
}
QUESTION="$(read_page question)"
SQL="$(read_page sql)"
ROWS="$(p bash -c 'set -o pipefail; pnpm exec askdb ask --question "$1" --mock-sql "$2" | node run-query.mjs 2>/dev/null' _ "$QUESTION" "$SQL")"

# The page's step 6 table, row by row: each row's values must appear in the output, in order.
node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const [pagePath, rows] = process.argv.slice(1);
  const page = readFileSync(pagePath, 'utf8');
  const step6 = page.slice(page.indexOf('## 6. Run the SQL'));
  const cells = (line) => line.split('│').slice(2, -1).map((cell) => cell.trim());
  const table = (text) => text.split('\n').filter((line) => /^│ \d/.test(line.trim())).map((line) => cells(line.trim()).join(' | '));
  const expected = table(step6.slice(step6.indexOf('┌'), step6.indexOf('┘') + 1));
  const actual = table(rows);
  if (expected.length !== 4 || JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error('quickstart-example: FAILED — run-query.mjs rows differ from the page.');
    console.error('page:   ' + JSON.stringify(expected));
    console.error('output: ' + JSON.stringify(actual));
    console.error(rows);
    process.exit(1);
  }
" "$PAGE" "$ROWS"

echo "quickstart-example: PASSED"
