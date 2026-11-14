---
"askdb": patch
---

`askdb introspect` now prints one line on stderr when `--out` succeeds, such as `Wrote askdb/schema.json: 3 tables (sqlite).`, instead of nothing (#946). `askdb ask` shows `Generating SQL…` on stderr while it waits for the model, only when stderr is a terminal, and clears it before anything else prints; stdout is unchanged (#947). `askdb init`'s next steps run the CLI through the package manager it detected: the project's copy when its `package.json` lists `askdb` (`npx askdb`, `pnpm exec askdb`, `yarn askdb`, `bunx askdb`), else a one-off copy (`pnpm dlx askdb`, `yarn dlx askdb`). They give the copy to `.env` as a command, and say to add the variables instead when a `.env` already exists (#937). `askdb init --help` names `--database`'s value `<engine>` and says where the location comes from (#945). No flag, exit code or JSON output changed.
