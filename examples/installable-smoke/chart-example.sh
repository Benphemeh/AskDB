#!/usr/bin/env bash
# The chart example (examples/chart-a-result) runs from the packed packages: install, then its
# own keyless tests (`node --test`), which draw the recorded chart plan with ECharts, render the
# shadcn/ui version (shadcn/components/spec-chart.tsx) with React into happy-dom, check the
# packed @askdb/client/charts against the recorded run, and run the tutorial's script
# (first-chart.mjs) against a local stand-in for the model provider. No test calls a model, so
# no API key is needed. apps/docs-site/scripts/check-chart-example.test.mjs checks the example's
# files against the code blocks of the tutorial and the guide.
#
# Usage: chart-example.sh <tarball-dir> <work-dir>
#
# pnpm overrides pin every AskDB package to its tarball, as quickstart-example.sh does, so the
# example's own package.json installs unchanged. @askdb/prisma is left out: nothing here
# depends on it, and pnpm installs an optional peer whose override is a tarball.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLE="$ROOT/examples/chart-a-result"
TARBALLS="$(cd "$1" && pwd -P)"
mkdir -p "$2"
DIR="$(cd "$2" && pwd -P)/askdb-chart"
mkdir "$DIR"

# The example's tracked files only, not node_modules or an SVG from a local run.
for file in package.json shop.sql to-echarts.mjs chart.mjs first-chart.mjs draw-recorded.mjs chart.test.mjs; do
  cp "$EXAMPLE/$file" "$DIR/$file"
done
cp -R "$EXAMPLE/askdb" "$EXAMPLE/recorded" "$EXAMPLE/shadcn" "$DIR/"

OVERRIDES="$(node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const [dir] = process.argv.slice(1);
  const overrides = {};
  for (const { name, file } of JSON.parse(readFileSync(dir + '/manifest.json', 'utf8'))) {
    if (name !== '@askdb/prisma') overrides[name] = 'file:' + dir + '/' + file;
  }
  if (!overrides['@askdb/client']) throw new Error('chart-example: no @askdb/client tarball in ' + dir);
  process.stdout.write(JSON.stringify(overrides));
" "$TARBALLS")"

# Runs a command in the example folder as a reader would: not under the `pnpm smoke:install`
# that started this script.
in_example() { (cd "$DIR" && env -u npm_config_user_agent -u npm_config_frozen_lockfile "$@"); }

echo "chart-example: pnpm install from the packed packages…"
in_example pnpm config set --location project minimumReleaseAgeExclude '["askdb","@askdb/*"]' --json
in_example pnpm config set --location project overrides "$OVERRIDES" --json
# esbuild, which the shadcn test compiles the TSX with, has a postinstall that pnpm blocks unless allowed.
in_example pnpm config set --location project allowBuilds '{"esbuild":true}' --json
in_example pnpm install --silent

# Every AskDB package in the lockfile must come from a tarball, or this tested the registry.
node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const lock = readFileSync(process.argv[1], 'utf8');
  const keys = [...lock.matchAll(/^  '?((?:@askdb\/[^@']+|askdb)@[^':]+(?::[^']*)?)'?:\$/gm)].map((m) => m[1]);
  const fromRegistry = keys.filter((key) => !key.includes('@file:'));
  if (!keys.some((key) => key.startsWith('@askdb/client@')) || fromRegistry.length > 0) {
    console.error('chart-example: FAILED — AskDB packages not resolved from the tarballs:', fromRegistry.length ? fromRegistry : keys);
    process.exit(1);
  }
" "$DIR/pnpm-lock.yaml"

echo "chart-example: node --test (no model call)…"
TEST_OUTPUT="$(in_example node --test 2>&1)" || {
  echo "chart-example: FAILED — the example's tests failed:" >&2
  echo "$TEST_OUTPUT" >&2
  exit 1
}

echo "chart-example: node draw-recorded.mjs…"
in_example node draw-recorded.mjs | grep -qx 'Wrote chart-light.svg and chart-dark.svg'
for svg in chart-light.svg chart-dark.svg; do
  grep -q '<svg ' "$DIR/$svg" || {
    echo "chart-example: FAILED — $svg isn't an SVG." >&2
    exit 1
  }
done

echo "chart-example: PASSED"
