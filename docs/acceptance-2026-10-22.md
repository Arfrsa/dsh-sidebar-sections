# Acceptance record - 2026-10-22

> Authoring-session record. The screenshot paths below refer to artifacts on the
> authoring machine and are not shipped with the package; the public storefront
> screenshot is `assets/screenshots/sections-overview.png`.

Environment: DSH Desktop **0.2.1-rc.2** (Windows), profile `desktop`, GUI served at
`http://127.0.0.1:<port>`, official client baseline
`@deepseek-ai/dsh-client-ui-workspace@0.2.1-rc.2` (232747 bytes, sha256
`4dd7f3c580f2316af8172ee4dc542b10e19b030e81f9242f4696e8139260dc17`).

Plugin state at the end of this session: **installed + enabled** in the `desktop`
profile (local `link:` bundle, `dsh.profile.bundles` ends with
`dsh-workspace-sections-official`); the sectioned sidebar is visible in the
running app. Package version **0.2.6** includes the user-feedback passes:
official drag-indicator style (patch 05 retired), project/session rows inset
21px so the folder icon axis aligns with the section label's first glyph (row
background pill moves with them), per-section icons (ECG / task checklist / zzz)
that turn blue while expanded with the official hover-only collapse chevron, and
the renamed **`会话任务`** section (was `历史任务`) including a one-time
workspace-title migration through the official API.

## Why the implementation deviates from SPEC section 5.3 (shadow registration)

SPEC assumed a `priority: -100` shadow occupant could reuse the official child
slots. That is not supported by the slot framework:

1. `SlotCore.register` throws `slot "..." is already declared (by ...)` when a
   second registration declares a child slot - child-slot declarations are
   exclusive.
2. The renderer's `boundRenderSlot` authorises `renderSlot` only for child keys
   in the registering entry's own `children` table (`SlotOwnershipError`
   otherwise).

The delivered plugin therefore **replaces** the shipped `ui-workspace` row while
it is enabled (`cordis.patch.yml` -> `- id: ui-workspace; disabled: true`), and
runs the official client code itself. The official `app.asar` is untouched, and
disabling/uninstalling the bundle removes the patch layer, re-enabling the
shipped row unchanged. "Switch back to the official list" is implemented as a
rendering mode (`mode: "native"`) of the same patched component tree.

## Automated checks (all pass)

| Check | Command | Result |
|---|---|---|
| Baseline hash + ordered patch application + `node --check` | `node scripts/build-client.mjs` | all 5 current patches applied (05 retired); 232747 -> 257954 bytes; sha256 `8c54aef27186d741886e8b9194eba598b30e774a932ba8cb07fe7ddfb1d7cdf3`; `node --check OK` |
| `--check-only` leaves the artifact untouched | `node scripts/build-client.mjs --check-only` | OK |
| Frozen platform module table / bundle shape | `node scripts/smoke-load.mjs` | OK: id `dsh-workspace-sections-official`, exports `apply, inject`, only the five seed modules required, 4 official CSS tags |
| Section-derivation rules (SPEC 2.1) | `node scripts/derive-selftest.mjs` | OK: 22 assertions (threshold, running/pending/current, pins beating threshold and running, history identity + flat expansion, ungrouped, native passthrough, archived-only History retention, archived sessions not counting as activity) |

## Live verification (running app)

| What | How | Result |
|---|---|---|
| Install | `plugin_manager install_bundle` | `application: applied`; `dsh.profile.bundles` appended; client half loaded without page refresh |
| Shipped row disabled | live Client slot inspector `sidebar.workspaces` | exactly one occupant (this bundle); the shipped `ui-workspace` row is not loaded |
| Sectioned sidebar renders | screenshot `research/_shot_sections_top.png`, `research/_shot_final_sections.png` | `活跃` section header with a workspace count above the official project rows |
| Project rows nested one level | screenshot `research/_shot_indent_v021.png` | project rows (folder icon, name, sessions) shifted one 12px level right under their section header; section headers stay at the left edge |
| Row hover/selected background inset | screenshot `research/_shot_row_inset.png` | the selected session row's gray pill starts 12px in from the list edge (aligned with the indented content); section header rows stay full-width |
| Folder-icon axis aligned with the section label's first glyph (0.2.5) | screenshot `research/_shot_align21.png`; pixel analysis of the live capture | the project folder icon ink and the header `活` glyph ink occupy the same columns (device px 72-95 at 150% scaling) with the 21px row inset; the selected-session background pill starts at the same inset (device px ~55) |
| Section header icons | screenshot `research/_shot_icons_collapsed.png` (temporary all-collapsed verification build, reverted) | all three headers show their icon: ECG trace (Active), task checklist (Session tasks), descending zzz (Inactive); collapsed sections keep the tertiary colour |
| Expanded section icon colour | screenshot `research/_shot_icon_blue_expanded.png` (temporary active-expanded build, reverted) | the expanded Active section's ECG icon is the official business-primary blue; no chevron is shown without hover |
| Collapse chevron reveal rule | screenshot `research/_shot_icon_blue.png` (hovered Active header) | without forcing rules the chevron replaces the icon on hover, exactly like the shipped project rows |
| Drag indicator uses the official style | patch 05 retired, no plugin CSS on drag markers | official marker CSS/behaviour is used as shipped |
| Official child slots intact | inspector `Slots.listSubTree` on the five child slots | `session.menu.item`: pin/rename/fork/archive/session-id active; `session.row.action`: archive/pin active; `sidebar.workspaces.directoryFlow` occupant active; `conversation.hero.workspace` occupant active; factory `workspace.toast.content` present |
| Footer return button registered | inspector `sidebar.footer.action` | `workspace-sections-return`, order 400, active |
| Fixed-section workspace bootstrap | native-mode live screenshot `research/_shot_native_test.png` (0.2.0, title migrated later) | official list shows the fixed workspace (= `D:\files\history-tasks` was registered + renamed by the plugin); directory exists |
| Segment renamed to `会话任务` (0.2.6) | screenshot `research/_shot_session_tasks_collapsed.png`; workspace registry read | the middle section header renders `会话任务`; `%USERPROFILE%\.dsh\storages\workspace.json` shows the workspace at `D:\files\history-tasks` with `title = 会话任务` and `updatedAt` = rename time (one-time legacy migration via `workspaces.rename`) |
| Native mode renders the official list | temporary forced-native build (reverted; same screenshots) | official list rendered in the live app, no section headers |
| Disable restores the official browser | `plugin_manager set_bundle enabled:false` + screenshot `research/_shot_disabled_official.png` | official sidebar returned live (no page refresh); re-enabling restored the sections view |
| Client half live reload | bundle disable -> enable after a rebuild | new `lib/client.js` bytes picked up live (graph rev changed) |

Evidence images (workspace `research/`):

- `_shot_sections_top.png` - sectioned sidebar after first install
- `_shot_final_sections.png` - final state (plugin enabled)
- `_shot_indent_v021.png` - 0.2.1: project rows indented one level, official drag style restored
- `_shot_row_inset.png` - 0.2.2: selected row background inset by the same 12px
- `_shot_icons_collapsed.png` - 0.2.3: all three section headers with ECG / checklist / zzz icons (temporary all-collapsed build, reverted)
- `_shot_section_icons_final.png` - 0.2.3 final state: Active header with ECG icon + chevron
- `_shot_icon_blue_expanded.png` - 0.2.4: expanded Active section, ECG icon in official blue
- `_shot_icon_blue.png` - 0.2.4: hovered Active header, chevron revealed like the official rows
- `_shot_align21.png` - 0.2.5: folder icon axis under the section label's first glyph, 21px inset (background pill follows)
- `_shot_native_test.png` - forced-native build: official list + fixed workspace (title migrated to `会话任务` in 0.2.6)
- `_shot_session_tasks_collapsed.png` - 0.2.6: all three section headers, middle one renamed to `会话任务`
- `_shot_disabled_official.png` - bundle disabled: shipped browser returned

## Not verified by the authoring agent (needs the user's pointer)

Pointer input injection is blocked in this environment (`SetCursorPos`,
`mouse_event`, `SendKeys` and clicks have no effect on the Desktop window; screen
capture works), so the following interactions were code-reviewed but not clicked:

1. View options menu: open it, check the "分段" block, threshold `-` / `+` /
   reset, and "切回官方列表" / "启用分段视图"; then the footer return button.
2. Workspace row "..." menu: pin to active / pin to inactive / unpin, and the
   checkbox state; verify a pinned inactive workspace moves segments.
3. Session row "..." menu and row hover buttons, hover card.
4. Search (button and Mod+K), archive tri-state filter + undo toast.
5. Section collapse/expand persistence, History section `+`, History empty/error
   state and retry.
6. Drag insertion line (official style) and drop semantics.
7. Wide/rail sidebar, dark theme, English locale for the new section strings.

## Known risks / limitations

1. **Single-owner replacement**: while enabled, the shipped browser is not
   loaded. If this bundle's client half ever fails to apply, the workspace region
   is empty instead of falling back to the shipped browser. Mitigation: patches
   02/03 keep a per-group derivation fallback, and disabling the plugin (Settings
   -> Plugins, or `plugin_manager set_bundle enabled:false`) restores the shipped
   sidebar; uninstall likewise. The host half only does `mkdir -p` and never
   fails the boot.
2. **Upgrade coupling**: a new DSH Desktop version needs the baseline re-extracted
   and the five patch anchor sets re-checked (`docs/upgrade-checklist.md`); a
   contract change fails the build loudly rather than corrupting the bundle.
3. **Sections-mode row inset** uses the 21px value published as
   `--dsh-sections-row-inset` plus CSS class names derived from the baseline CSS
   module maps (`projectRow`, `sessionRow`, `sessionOverflowButton`); patch 06
   fails the build if a map key disappears, and the step lives in patches 03/06.
   The official drag indicator is no longer overridden, so it only changes when
   the shipped bundle changes.
4. **Locale coverage**: section strings exist in zh + en; other locales fall back
   to zh/en per the official locale service.
5. **History bootstrap** auto-creates/renames once. If the user deletes the
   `会话任务` workspace in the shipped list, the plugin recreates it on the next
   workspaces snapshot change (by design, SPEC 2.2); if that is undesired, delete
   the plugin's `dsh.workspace.sections.v2` key and disable the plugin.

## Rollback

- In-app: view options -> "切回官方列表" (rendering mode), or Settings -> Plugins
  -> disable `dsh-workspace-sections-official` (shipped browser returns).
- Remove: `dsh plugin --profile desktop remove dsh-workspace-sections-official`
  (Desktop closed) or `plugin_manager remove_bundle`.
- Plugin-owned state: delete localStorage key `dsh.workspace.sections.v2` to
  reset threshold/pins/collapse; no other plugin-owned files exist.
