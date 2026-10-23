# Official baseline provenance

This package is generated from a byte-identical copy of the shipped
`@deepseek-ai/dsh-client-ui-workspace` browser bundle. The official package is
never modified on disk; the vendored copy is the input to the patch pipeline.

| Item | Value |
|---|---|
| Package | `@deepseek-ai/dsh-client-ui-workspace` |
| Version | `0.2.1-rc.2` |
| Source | DSH Desktop 0.2.1-rc.2 `resources/app.asar` -> `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/` |
| Vendored file | [`vendor/dsh-client-ui-workspace-0.2.1-rc.2.js`](../vendor/dsh-client-ui-workspace-0.2.1-rc.2.js) |
| Size | 232747 bytes |
| SHA256 | `4dd7f3c580f2316af8172ee4dc542b10e19b030e81f9242f4696e8139260dc17` (prefix `4DD7F3C580F2316A`) |
| Lines | 5352 |
| License | MIT, Copyright (c) 2026 DeepSeek - [`vendor/LICENSE.dsh-client-ui-workspace`](../vendor/LICENSE.dsh-client-ui-workspace) |
| Upstream | <https://github.com/deepseek-ai/deepseek-harness> (`packages/client/ui-workspace`) |

The generated browser artifact is `lib/client.js`
(257910 bytes, SHA256 `e6eafffa9c24277955d44811dd58510d81b9600532feb0643cea960b447e8133`);
`node scripts/build-client.mjs` recomputes and verifies both hashes.

## Re-extracting the baseline (upgrade)

Run in an empty directory. `@electron/asar`'s CLI needs the archive-relative
backslash path and writes the same basename into the current directory.

~~~powershell
$archive = '<DSH install dir>\resources\app.asar'
$base = 'dsh\node_modules\@deepseek-ai\dsh-client-ui-workspace\'
foreach ($f in @('lib\client.js','lib\index.js','package.json','README.md','README.zh.md','LICENSE')) {
  npx --yes @electron/asar@3.2.10 extract-file $archive ($base + $f)
}
~~~

Then:

1. verify size and SHA256 (`Get-FileHash -Algorithm SHA256 .\client.js`);
2. put the new `client.js` into `vendor/dsh-client-ui-workspace-<version>.js`;
3. update `patches/manifest.json` (`baseline.version`, `file`, `sha256`,
   `sha256Prefix16`, `bytes`, `targetDshVersion`);
4. diff old/new baselines and re-anchor the patches
   ([docs/upgrade-checklist.md](upgrade-checklist.md));
5. rebuild (`node scripts/build-client.mjs`) and run the tests.

## Runtime module table

The bundle requires only the web shell's frozen platform seed modules:
`react`, `react/jsx-runtime`, `@deepseek-ai/cordis`,
`@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-primitives`. They
are provided by the DSH web shell; `dsh.client.external` is not needed and
`scripts/smoke-load.mjs` fails if a future patch introduces any other require.
See [docs/upgrade-checklist.md](upgrade-checklist.md) section 2 for the exact
evidence trail and re-verification command.
