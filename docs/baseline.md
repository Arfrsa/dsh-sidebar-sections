# Official baseline provenance

This package is generated from a byte-identical copy of the shipped
`@deepseek-ai/dsh-client-ui-workspace` browser bundle. The official package is
never modified on disk; the vendored copy is the input to the patch pipeline.

| Item | Value |
|---|---|
| Package | `@deepseek-ai/dsh-client-ui-workspace` |
| Version | `0.2.1-rc.3` |
| Source | DSH Desktop 0.2.1-rc.3 `resources/app.asar` -> `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/` |
| Vendored file | [`vendor/dsh-client-ui-workspace-0.2.1-rc.3.js`](../vendor/dsh-client-ui-workspace-0.2.1-rc.3.js) |
| Size | 232860 bytes |
| SHA256 | `bafd2d6eea2f82674cc0606bec13fc891e44b42fb2ac973f01cb32c735d4062f` (prefix `BAFD2D6EEA2F8267`) |
| Lines | 5352 |
| License | MIT, Copyright (c) 2026 DeepSeek - [`vendor/LICENSE.dsh-client-ui-workspace`](../vendor/LICENSE.dsh-client-ui-workspace) |
| Upstream | <https://github.com/deepseek-ai/deepseek-harness> (`packages/client/ui-workspace`) |

The generated browser artifact is `lib/client.js`
(257958 bytes, SHA256 `8cc6ce00ce4ac0e08957a9e38b01d30039f38fd9a503bd802f1a9aac480c29c0`);
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
