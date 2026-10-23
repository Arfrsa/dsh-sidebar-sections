# Upgrade checklist

Use this after a DSH Desktop upgrade, or when re-validating the fork on the same
release. Goal: keep the official installation untouched, re-extract the official
browser baseline, re-run the patch pipeline, and only then reinstall/enable the
plugin.

## 1. Target environment and baseline

| Item | Value |
|---|---|
| Target DSH Desktop | `0.2.1-rc.2` (Windows), supported range `>=0.2.1-rc.2 <0.3.0` |
| Installation | `<DSH install dir>\` |
| Official package in archive | `dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/` |
| Baseline snapshot | `vendor/dsh-client-ui-workspace-0.2.1-rc.2.js` (this package) and `vendor/` |
| Baseline bytes / SHA256 prefix | `232747` / `4DD7F3C580F2316A` |
| Full baseline SHA256 | `4dd7f3c580f2316af8172ee4dc542b10e19b030e81f9242f4696e8139260dc17` |
| Profile | `%USERPROFILE%\.dsh\profiles\desktop` |
| DSH CLI | `dsh` |
| Node | `C:\Program Files\nodejs\node.exe` (24.x) |
| Fixed-section workspace | `D:\files\history-tasks` (title `会话任务`; the legacy title `历史任务` is migrated once through `workspaces.rename`) |

## 2. Frozen platform module table (SPEC section 5.2 item 1) - VERIFIED

**Result: no `dsh.client.external` declaration is needed and no shims are
needed.** The official bundle only requires platform seed modules.

Evidence, 0.2.1-rc.2:

- The vendored bundle requires exactly five modules (vendor lines 7-11):
  `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-primitives`,
  `@deepseek-ai/cordis`, `react/jsx-runtime`, `react`.
- The web shell freezes exactly this platform module table (function `SZ()`,
  byte offset **916075** in `<extracted app.asar>/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-*.js`):
  `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`,
  `@deepseek-ai/cordis`, `zod`, `@tanstack/react-virtual`,
  `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`,
  `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-dockkit`.
- The client module loader resolves a require against that seed table first:
  `<extracted app.asar>/dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/client.js`
  line 835 `if (this.seed.has(spec)) return this.seed.get(spec);`; line 840
  throws `missed the module table` only for specs that are not seeds, not
  materialized modules and not registered package factories.
- `dsh.client.external` (parsed line 67, consumed line 783 of the same file) is
  only for non-seed module *packages*; none of our requires falls in that
  category.

Re-verify after an upgrade (from the repository root; re-extract the
`research/_asar` working copies from `resources/app.asar` if they are missing):

```powershell
node -e "const s=require('fs').readFileSync('<extracted app.asar>/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-*.js','utf8');const i=s.indexOf('@deepseek-ai/dsh-client-ui-dockkit');const start=s.lastIndexOf('function SZ(){',i);console.log(s.slice(start,i+40))"
Select-String -Path '<extracted app.asar>/dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/client.js' -Pattern 'this.seed.has\(spec\)','missed the module table','dsh.client.external'
```

If a future bundle requires a module outside the frozen table, that is the only
case where `dsh.client.external` may become necessary; document the exact spec
and add it to `package.json` `dsh.client` only after confirming the module is
delivered by another client bundle.

## 3. Baseline extraction (SPEC section 6.1)

Run in an empty/!existing target directory (the `@electron/asar` CLI writes the
same basename; `npx` may need `$env:npm_config_cache` pointed into the
workspace if the sandbox blocks the default cache):

```powershell
$archive = '<DSH install dir>\resources\app.asar'
$base = 'dsh\node_modules\@deepseek-ai\dsh-client-ui-workspace\'
foreach ($f in @('lib\client.js','lib\index.js','package.json','README.md','README.zh.md')) {
  npx --yes @electron/asar@3.2.10 extract-file $archive ($base + $f)
}
```

Alternative without npx (the asar helper in this repository):

```powershell
npx --yes @electron/asar@3.2.10 extract-file '<DSH install dir>\resources\app.asar' 'dsh\node_modules\@deepseek-ai\dsh-client-ui-workspace\lib\client.js'
```

Then:

1. Verify size and hash:
   ```powershell
   Get-FileHash -Algorithm SHA256 '<target>\client.js'
   (Get-Item '<target>\client.js').Length
   ```
2. If the version changed, create a new `official-baseline-<version>/` snapshot
   directory (keep the old one for cross-version diffs) and copy the fresh
   `client.js` to `vendor/dsh-client-ui-workspace-<version>.js`.
3. Update `patches/manifest.json`: `baseline.version`, `baseline.file`,
   `baseline.sha256`, `baseline.sha256Prefix16`, `baseline.bytes` and
   `targetDshVersion`.
4. Diff the old and new baseline to find what moved:
   ```powershell
   git diff --no-index --stat '<old>\client.js' '<new>\client.js'
   ```

## 4. Contract checks after an upgrade

Check every row; a break shows up as a build failure (anchor mismatch) or as a
runtime failure. Do not weaken an assertion to make a stale anchor pass.

| Contract | Current evidence | Breakage symptom | Action |
|---|---|---|---|
| Bundle loader shape `window.__ModuleLoader__.load({ id, factory })` | baseline lines 1-3, patch 01 anchor | patch 01: anchor not found | update patch 01 anchor to the new loader prologue |
| Shipped `ui-workspace` loader row id and `disabled: true` override in `cordis.patch.yml` | `dsh-web-app/cordis.patch.yml` row `- id: ui-workspace`; live profile state | shipped row still loads next to this bundle -> duplicate `uiWorkspace` service / duplicate slot registration errors | fix the row id in `cordis.patch.yml`; the plugin manager layer order puts this bundle's patch last |
| `sidebar.workspaces` registration (its own `children` table, `store` / `inject` / `locale`) | baseline lines 5220-5251; live client slot inspector | patch 01/06 anchor fails, or child slots/menus disappear | re-anchor the registration block; keep the children table (this bundle is the sole owner) |
| Slot contract: `sidebar.workspaces` is `single`/`root`; this replacement entry declares the official child slots | SPEC section 5.2 item 3; inspector `Slots.listSubTree` | registration throws / official sub-slots disappear | verify in inspector before touching code |
| Derivation functions `deriveGroups` / `groupByWorkspace` | patch 02 anchors | patch 02 build failure | re-anchor and re-diff derivation logic; re-run `derive-selftest.mjs` |
| Grouped render loop that renders headers + sessions; `--dsh-workspace-indent` style line | patch 03 anchors | patch 03 build failure / visual layout break | re-anchor render loop; sections mode publishes `--dsh-sections-row-inset` there |
| CSS-module class-map keys `projectRow`, `sessionRow`, `sessionOverflowButton` | patch 06 derives the hashed names from the baseline class maps | patch 06 throws "expected exactly one CSS-module class-map entry" | a renamed map key breaks the row-inset CSS; update patch 06 |
| Section-header `folder` / `folderActive` / `chevron` classes | baseline Rows class map, used directly by patch 03 | no anchor failure (referenced through the official class map); the icon loses its state colour / hover reveal if upstream renames them | inspect `Rows_module_css_default` on an upgrade; keep using the map |
| `ViewOptionsMenu` render site and menu item shape | patch 04 anchors | patch 04 build failure / menu entries misplaced | re-anchor the menu |
| Workspace row "..." menu: `Menu.items` / `Menu.selectedIds` / `onSelect` | baseline lines ~1950-2006, patch 04 anchors | patch 04 build failure / pin rows missing or unchecked | re-anchor; pin rows only appear when the pin action is wired (sections mode) |
| End of `apply()` (after the `conversation.hero.workspace` registration) and `exports.apply = apply;` epilogue | baseline lines ~5336 and 5349, patch 06 anchors | patch 06 anchor failure | re-anchor the final statement of apply() |
| Drag insertion indicator classes (`sessionRow` / `dropBefore` / `dropAfter` / `workspaceDrop*` / `listTopDropIndicator`) | no plugin patch since 0.2.1 - official behaviour used as shipped | none (nothing to re-anchor) | none |
| Footer action slot (`sidebar.footer.action`) for the native-mode return button | live client slot inspector: `workspace-sections-return`, order 400, active | patch 06 cannot register the button | re-anchor; verify the slot is declared by `ui-sidebar` |
| Locale registration `ctx.locale.register(NS, { zh, en })` | baseline `apply()`; patch 03 adds `sections.*` keys to both dictionaries | section strings missing | keep using the official NS and keys |
| `workspaces.create` requires an existing directory | SPEC section 5.5; host half `mkdirSync` | history section shows error + retry | host half already creates `D:\files\history-tasks`; keep it |
| Fixed-section workspace title `会话任务` / legacy titles | patch 02 `SECTIONS_HISTORY_TITLE` / `SECTIONS_HISTORY_LEGACY_TITLES`, patch 06 bootstrap | section header or workspace title shows a stale name / migration not applied | update the constants; the bootstrap renames a legacy-titled workspace once |
| Old shadow plugin state | profile manifest (see section 8) | none in the replacement architecture (no priority -100 registration) | the old plugin is dormant; remove it when convenient |

## 5. Patch replay procedure

1. Update `vendor/` + `patches/manifest.json` (section 3).
2. Run the build: `node dsh-workspace-sections-official/scripts/build-client.mjs`
   - hash mismatch -> re-extract; do not edit the manifest hash to match a
     hand-edited file;
   - anchor failure -> fix the named patch first, one patch at a time;
   - missing patch files -> wait for the owning patch or use
     `BUILD_ALLOW_MISSING=1` for a smoke test only (never install that artifact).
3. Confirm the summary: per-patch byte deltas, `node --check OK`, output SHA256.
4. `node --check dsh-workspace-sections-official/lib/client.js` (redundant but
   explicit for reviewers).
5. If the patch set is unchanged and only the baseline moved, refresh the expected
   deltas in `docs/patches.md` and add a CHANGELOG entry.
6. Client-half changes: toggle this bundle off and on with
   `plugin_manager set_bundle` (or Settings -> Plugins); the profile bundle-list
   change makes the client graph republish and the browser bundle reloads live.
   A page reload also works. Host-half changes (`lib/index.js`): restart Desktop.
7. Update `docs/official-parity.md` and this checklist with what was re-verified.

## 6. Verification in the running app

1. **Build**: full build exits 0; `lib/client.js` regenerated (or the two test
   scripts pass for an unchanged build).
2. **Install**: `plugin_manager` `install_bundle` with the absolute package path
   (live profile) or the CLI form from section 8. `dsh.profile.bundles` must
   contain `dsh-workspace-sections-official`; the shipped `ui-workspace` row is
   disabled by the bundle patch while this bundle is selected.
3. **Slot inspection**: `cordis_inspect_query` -> client
   `Slots.listSubTree(root="sidebar.workspaces")`:
   exactly one occupant (this bundle), the official child slots still declared;
   `sidebar.workspaces.session.menu.item` has pin/rename/fork/archive/session-id,
   `session.row.action` has archive/pin, `sidebar.workspaces.directoryFlow` and
   `conversation.hero.workspace` have occupants, `sidebar.footer.action` has
   `workspace-sections-return`.
4. **Functional checklist**: run SPEC section 7.1 (sections order/counts, active
   heuristic, threshold, pins, history section create/session/+ /empty/error/retry,
   official search/archive/row-menu/workspace-management/drag/watermark/status
   dots/shortcuts, visual parity, native switch, data boundary). The derivation
   rules are covered by `scripts/derive-selftest.mjs`; the rest needs the human
   walk-through.
5. **Engineering checklist**: SPEC section 7.2 (reproducible build, hash check,
   `node --check`, slot inspector, docs, crash fallback).
6. **Fallbacks**: view options -> official list; the footer return button while
   native; Settings -> Plugins -> disable (shipped sidebar returns);
   uninstall with
   `dsh plugin --profile desktop remove dsh-workspace-sections-official`.
   Uninstalling never affects user data.

## 7. Data boundary and rollback

- No data migration. `~/.dsh/storages/workspace.json` is not edited; the only
  official state change is registering the fixed-section workspace and renaming it
  (including the one-time legacy-title migration) through the official
  `workspaces.create` + `rename` APIs.
- The plugin-owned browser key is `dsh.workspace.sections.v2` (`mode`,
  `activeDays`, `pins`, `sectionCollapsed`). Removing it resets
  threshold/pins/collapse to defaults.
- The official view key `dsh.workspace.view.v5` keeps its official schema; this
  bundle reads/writes it through the official code, exactly as before.
- Rollback = disable/uninstall the bundle; its patch layer disappears and the
  shipped `ui-workspace` row loads again unchanged. Native mode inside the
  plugin only changes the render path, not the loader composition.

## 8. Profile state - VERIFIED 2026-10-22 (do not edit the profile here)

`%USERPROFILE%\.dsh\profiles\desktop\package.json` currently:

- `dependencies` contains
  `"dsh-workspace-sections-official": "link:<path-to-this-repo>"`
  (installed live on 2026-10-22 through `plugin_manager install_bundle`);
- `dsh.profile.bundles` ends with `dsh-workspace-sections-official`;
- `dependencies` still contains the old
  `"dsh-workspace-sections": "link:...default-workspace/dsh-workspace-sections"`,
  but that package is **not** in `dsh.profile.bundles` (dormant).

The replacement architecture means the old plugin no longer conflicts at the slot
level (it registers a priority -100 occupant only when it loads, and it is not
selected). Remove it from the profile when convenient.

## 9. Current status (2026-10-22, 0.2.0)

- Pipeline: full build passes (five current patches; patch 05 retired),
  baseline sha256 checked, `node --check OK`, output SHA256
  `8c54aef27186d741886e8b9194eba598b30e774a932ba8cb07fe7ddfb1d7cdf3`
  (257954 bytes).
- Sections-mode layout: project rows and their hover/selected row backgrounds are
  inset by the same 21px step under the section headers; every section header
  shows its icon (ECG / task checklist / zzz, blue while expanded, tertiary while
  collapsed) and reveals the collapse chevron on hover/selection like the shipped
  project rows; native mode keeps the shipped layout exactly.
- `scripts/smoke-load.mjs` passes (five frozen seed modules, expected exports).
- `scripts/derive-selftest.mjs` passes (22 derivation assertions).
- Installed and enabled in the `desktop` profile; the sectioned sidebar renders
  live; official child slots/menus/pickers/toasts registrations verified in the
  live client slot inspector; native render path exercised in the running app.
- Remaining: human pointer walk-through (menus, pins, search, archive, collapse,
  drag with the official indicator, threshold buttons) - the authoring agent
  cannot inject pointer input into the Desktop window on this machine.
