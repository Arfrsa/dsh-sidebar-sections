# CHANGELOG

Changes are organised per version and per patch. The patch list itself is
authoritative in [patches/manifest.json](patches/manifest.json); this file records
what changed and what is still open.

## 0.2.6 - 2026-10-22 (section renamed to 会话任务; installed in `desktop`)

### Changed

- **The fixed middle section is now called `会话任务`** (was `历史任务`). The
  English label is `Session tasks` (was `History tasks`). The workspace path is
  unchanged (`D:\files\history-tasks`) and so are the internal `history` section
  ids / helper names.
- **One-time workspace-title migration:** when the fixed workspace already exists
  under a legacy title (`历史任务`), the browser half now renames it once to
  `会话任务` through the official `workspaces.rename` API; user-chosen titles are
  left untouched. Verified in the host workspace registry (the workspace at
  `D:\files\history-tasks` now has `title = 会话任务`, with `updatedAt` at the
  rename time).
- Section/error/creating/missing strings for that segment were updated in zh + en.
- Patch/byte bookkeeping: patch 02 +4487, patch 06 +7957, output 257954 bytes,
  sha256 `8c54aef2…7cdf3`.

### Packaging (community release prep)

- Removed `private`, added `repository` / `homepage` / `bugs`, `keywords`,
  `publishConfig.access = public`, and a `prepack` build step.
- Added `LICENSE` (MIT for this package), `THIRD-PARTY-NOTICES.md`, and
  `vendor/LICENSE.dsh-client-ui-workspace` (upstream DeepSeek MIT text).
- Added a storefront screenshot (`assets/screenshots/sections-overview.png`) and
  `screenshots.json` (relative-path convention read by dsh-market storefronts).
- Added [docs/baseline.md](docs/baseline.md) and
  [docs/publish.md](docs/publish.md) (community submission runbook) plus the
  ready-to-copy `docs/community/awesome-dsh-plugin-entry.yml`.
- Sanitized machine-specific paths from the public docs; `npm pack`/`npm publish
  --dry-run` verified (31 files, 181.8 kB tarball).

## 0.2.5 - 2026-10-22 (section-label axis alignment; installed in `desktop`)

### Changed

- **Project and session rows moved further right so the project folder icon's
  centre axis sits exactly under the first glyph of the section label.** The
  sections-mode row inset (`--dsh-sections-row-inset`) is now **21px** (was 12px):
  the section label starts at row padding 8 + icon slot 16 + gap 6 = 30px, so
  its first 14px glyph centre is at 37px; the folder slot centre is padding 8 +
  half slot 8 = 16px, hence the 21px inset. Verified from a live screenshot: the
  header `活` glyph ink and the project folder icon ink occupy the same pixel
  columns (72-95 device px at 150% scaling).
- The row hover/selected background is driven by the same inset, so the grey
  background pill moves with the rows (selected session row's pill now starts at
  the same 21px inset; verified pixel-wise).
- Patch/byte bookkeeping: output stays 257544 bytes, sha256
  `de73cb39…d03d6313`.

## 0.2.4 - 2026-10-22 (section icon state colours; installed in `desktop`)

### Changed

- **Section icons now show the expand state with the official colour:** an
  expanded section's icon carries the shipped `folderActive` class (business
  primary / blue), a collapsed section keeps the slot's current colour
  (`label-tertiary`). No new colour tokens are introduced.
- **The collapse chevron behaves exactly like the shipped project rows again:**
  the two plugin CSS rules that forced the icon+chevron permanently visible were
  removed, so the icon shows normally and the chevron appears on hover/selection
  (official `.projectRow` rules), rotating with the expanded state.
- Patch/byte bookkeeping: patch 03 +9777, patch 06 +7703, output 257544 bytes,
  sha256 `0006faca…f043ef82a`.

## 0.2.3 - 2026-10-22 (section icons; installed in `desktop`)

### Changed

- **Each fixed section header now carries its own icon** before the collapse
  chevron: Active = a custom 16x16/1px ECG (heartbeat trace), History tasks =
  the shipped `IconChecklistOutlineRegular` (task checklist), Inactive = a custom
  16x16/1px descending "zzz". Custom icons use the official icon geometry
  (`viewBox 0 0 16 16`, `currentColor`, 1px round stroke) so they sit in the same
  icon slots as the workspace folder icons.
- Patch 06's stylesheet now also derives the `folder` and `chevron` class names
  and keeps both visible on section headers (the shipped CSS would hide one of
  them outside hover), so the segment icon and the collapse chevron are always
  shown.
- Patch/byte bookkeeping: patch 03 +9508, patch 06 +7842, output 257414 bytes,
  sha256 `d5cde02f…c4ca4a4a`.

## 0.2.2 - 2026-10-22 (row background inset; installed in `desktop`)

### Changed

- **Project/session row hover and selected backgrounds are inset by the same
  12px as the project-name indent.** Patch 03 now publishes the sections-mode
  indent step as `--dsh-sections-row-inset` (12px in sections mode, 0px in native
  mode), and patch 06's stylesheet applies
  `margin-inline-start: var(--dsh-sections-row-inset)` to the official
  project/session row classes (derived from the baseline class map, plus a
  matching width adjustment for the "show more" overflow button). The section
  header rows are excluded (`:not(.dsws-section-header)`), so their background
  stays at the left edge. Native mode is unchanged (0px inset).
- Patch/byte bookkeeping updated: patch 03 +7988, patch 06 +7703, output 255755
  bytes, sha256 `6d9473cc…3b2567`.

## 0.2.1 - 2026-10-22 (user feedback pass; installed in `desktop`)

### Changed

- **Drag insertion indicator: official style restored.** Patch 05
  (`05-drag-indicator.mjs`, blue-line-only CSS override) is retired and removed
  from the manifest; drag markers, hit-testing and ordering are now exactly the
  shipped implementation, with no plugin CSS on top.
- **Project rows indent one level in sections mode.** Every workspace group
  (project row, its sessions, its overflow row and nested children) is indented
  one extra 12px level under its fixed section header, using the official
  `--dsh-workspace-indent` custom property (patch 03). The section headers stay
  at the left edge; native mode keeps the official indentation.
- Patch manifest is now 5 patches (01/02/03/04/06); `docs/patches.md`,
  `docs/official-parity.md` and the acceptance record were updated accordingly.

## 0.2.0 - 2026-10-22 (replacement architecture; installed in `desktop`)

The first architecture (shadow registration at `priority: -100` next to the still
loaded official plugin) turned out to be structurally impossible:

- `SlotCore.register` rejects a second registration that declares an
  already-declared child slot;
- the renderer's `boundRenderSlot` only authorises `renderSlot` for the child
  keys in the registering entry's own `children` table.

So a shadow occupant cannot use the official search row, session "..." menus, row
hover actions or directory-flow pickers. The bundle now **replaces** the shipped
`ui-workspace` row: `cordis.patch.yml` disables that row while the bundle is
enabled, and the bundle runs the official client code itself with the section
patches. Disabling/uninstalling removes the layer and the official row returns.

### Changed

- **Architecture** - replacement instead of shadow registration; no
  `priority: -100`, no removed/duplicated official registrations. Native mode is
  a rendering mode of the same component tree (`mode === "native"` -> official
  derivation and render path), so the official list is one click away and
  survives refresh.
- **Patch 01** - now only rewrites the bundle loader id (the priority insertion
  is gone).
- **Patch 02** - derivation is gated by the sections mode; native mode returns the
  official derivation unchanged. Activity is computed from the group's
  archive-filtered members. The section computation is wrapped in a per-group
  try/catch that keeps the official row on failure.
- **Patch 03** - every section-render addition is gated by `sectionsActive`;
  native mode renders `rootGroups.map(renderGroup)` exactly as shipped. The pin
  action is wired only in sections mode.
- **Patch 04** - pin rows only appear when the pin action is wired, and menu
  checkbox state is passed conditionally; `setSectionsMode` is wired to
  `SessionTree`.
- **Patch 06** - rewritten: it no longer disposes/re-registers anything. It adds
  the plugin-owned section state, the History bootstrap, the `useSections` /
  `sectionsActions` injection and the `sidebar.footer.action` return button plus
  its stylesheet.
- **`cordis.patch.yml`** - disables the shipped `ui-workspace` row and inserts
  this bundle's row.
- **Docs/locale** - README, patches reference, parity and upgrade checklist
  rewritten for the replacement architecture; plugin description updated.

### Added

- `scripts/derive-selftest.mjs` - 22 assertions for the SPEC 2.1 derivation
  rules (threshold, running/pending/current, pins beating threshold and running,
  history identity + flat expansion, ungrouped, native passthrough,
  archived-only History retention, archived sessions not counting as activity).
- Verification log in `docs/patches.md` (build, smoke-load, live install, live
  slot inspection, screenshots, native-path exercise).

### Verified live (2026-10-22)

- Install into the `desktop` profile via `plugin_manager install_bundle` ->
  `application: applied`; client half loaded without a page refresh.
- Sectioned sidebar renders with the `活跃` header + count above the official
  project rows.
- Live client slots: one `sidebar.workspaces` occupant (ours; shipped row
  disabled) with all official child slots live - session menu rows pin/rename/
  fork/archive/session-id, row actions archive/pin, directory flow, hero picker,
  toast factory; footer return entry registered.
- Native render path exercised with a temporary forced-native build (reverted):
  the official list rendered and showed the `历史任务` workspace created by the
  History bootstrap.
- Bundle disable -> enable live-reloads the client bundle (iteration loop).

### Still open

- Human click-through of the view-options menu (threshold +/-/reset, switch to
  official list), pin rows, session "..." menus, search, archive filter, section
  collapse, History header "+", drag insertion line - pointer input is not
  available to the authoring agent on this machine.
- Crash fallback: per-group derivation fallback is implemented; a render-time
  crash still empties the region (the slot semantics for a single-occupant
  replacement). Disabling the plugin restores the official sidebar.

## 0.1.0 - 2026-10-22 (scaffold; never installed)

Package skeleton plus an executable build pipeline (baseline hash check, ordered
patch application, `node --check`, `--check-only`, `BUILD_ALLOW_MISSING=1`),
vendored official baseline, first versions of patches 01-06 (shadow-registration
architecture), README/CHANGELOG/parity/upgrade docs and the install runbook.
Never installed; superseded by 0.2.0.
