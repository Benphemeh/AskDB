# ADR 0049 — The Quickstart offers a fetchable example, kept equal to the page

## Status

Accepted (2026-11-14). The coordinator chose option B on #940 as a two-way call under the 2026-11-05 arrangement, and the maintainer can reopen it. Supersedes nothing.

## Context

The Quickstart has the reader type `shop.sql`, `make-shop.mjs` and `run-query.mjs` by hand before the first answer. None of the examples in `examples/` matched the page, and the page linked none of them. Similar tools keep the hand-typed tutorial as the main path and offer a starter or a ready sample database as a shortcut.

## Options considered

- **A. Keep the tutorial only.** It teaches each step, but a reader still types every file.
- **B. An example folder in this repo, linked from the page and checked in CI (chosen).** It reuses `examples/` and the existing smoke test, and the tutorial stays the main path.
- **C. A separate template repository.** It's easy to clone, but it's a second repository to keep in step with each release.
- **D. `askdb init --sample`, which writes the shop database.** It's the fastest path, but it adds a CLI flag after the rc.1 API freeze, which is the maintainer's decision.

## Decision

1. `examples/quickstart-shop` holds the files the page has the reader type, a `package.json` with a caret range for `askdb` on the current release line, and a README. Nothing the commands generate is committed (`shop.db`, `.env`, `askdb.config.ts`, `askdb/`).
2. The page links it at the top ("Skip the typing") with `npx gitpick Ygilany/AskDB/tree/main/examples/quickstart-shop askdb-shop`.
3. The folder is outside the pnpm workspace, so it installs `askdb` the way a reader does, not as a workspace link.
4. Two checks keep it equal to the page. `apps/cli/src/quickstart-example.test.ts` compares each file with the page's code block for it, checks that the README's commands appear on the page, and checks that the `askdb` range admits the CLI's version. `examples/installable-smoke/quickstart-example.sh` runs the example from the packed tarballs with `--mock-sql`, using step 5's question and SQL, and compares the rows with the page's step 6 table.

## Consequences

- A change to one of the page's code blocks has to change the example's file too, or the unit test fails.
- When the CLI moves to a release line the example's range doesn't admit, the unit test fails until the range moves.
- In the smoke check, `askdb init` runs with `--skip-install`, and the script installs `@askdb/config` from its tarball itself. Before a release, the version init would install isn't on the registry yet.
