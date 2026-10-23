# Official capability parity

Scope: this plugin is a **patched build of the shipped browser bundle**. Everything
the official `@deepseek-ai/dsh-client-ui-workspace` browser does is inherited unless a
patch explicitly changes the derivation or render step. The table below tracks
what is inherited, what our patches add, and what has actually been verified.

> Status of this document: **2026-10-22, after the first live install** into the
> `desktop` profile. The package is installed and enabled; the sectioned sidebar
> renders in the running app (screenshot + slot inspection). Items marked
> "registration verified" were confirmed through the live Client slot inspector;
> runtime interaction (clicks, menus opening, drag) still needs a human walk-through.

## Why the plugin replaces the shipped plugin row

Owning `sidebar.workspaces` also means declaring that region's child slots
(`sidebar.workspaces.session.menu.item`, `.session.row.action`,
`.directoryFlow`, `sidebar.session.row.leading`, `sidebar.session.row.hover`).
The slot ledger allows only one registration to declare a child slot
(`SlotCore.register` throws "already declared") and the renderer only lets a
registration render the children it declared (`boundRenderSlot` throws
`SlotOwnershipError` otherwise). A second, lower-priority occupant therefore
cannot reuse the official sub-slots. The only supported shape for a full
browser fork is a replacement: `cordis.patch.yml` disables the shipped
`ui-workspace` loader row while this bundle is enabled, and this bundle runs the
official client code itself (with the section patches). Disabling/uninstalling
this bundle removes the layer and the shipped row returns unchanged.

## Inherited official capabilities

| Official capability | Expected status | How it is inherited | Verified |
|---|---|---|---|
| Section header, view-options menu, add-workspace button, search row | inherited | same official `WorkspaceBrowser` component | yes (rendered in live app screenshot) |
| Grouped-by-workspace tree and flat "one list" grouping | inherited (layout patched by 03 in sections mode; official path in native mode) | same official derivation + render loop | yes (both render paths seen in live app; native path via temporary forced-native build) |
| Workspace tree grouping (`groupBy: "workspace-tree"`) | inherited | official code path untouched | registration only |
| Search: collapsed search button, 250 ms debounced content search, result list/highlight, Mod+K focus | inherited | official search state + `session.search` command registered by this bundle (same code) | registration/code path; click test pending |
| Archive tri-state filter, archived row dimming, unarchive restores position, toast/undo | inherited | official `archivedFilter` store + `viewStore` actions | registration verified (`workspace.toast.content` factory + `workspace.toast` keys active) |
| Session row "..." menu: pin/unpin, rename, fork, archive/unarchive, copy Session ID | inherited | official `sidebar.workspaces.session.menu.item` entries registered by this bundle | **registration verified**: pin 100, rename 200, fork 300, archive 400, session-id 450 all active |
| Session row hover buttons (archive/pin) and hover card | inherited | official `sidebar.workspaces.session.row.action` + `HoverCard` | **registration verified**: archive 100 + pin 200 active |
| Workspace management: add (directory picker), rename, delete, ordering | inherited (row menu extended by 04 with pin rows) | official workspace row + dialogs + picker | registration verified: `sidebar.workspaces.directoryFlow` occupant active; workspace row menu renders rename/delete (+ pin rows in sections mode) |
| Drag & drop sessions/workspaces and insertion indicator | inherited unchanged (official style) | official drag state machine, ordering and marker CSS | code path inherited; drag interaction pending |
| Watermark (first 5 + expand), current blank session row | inherited | official render helpers | code path inherited; pending |
| Status dots (running / pending interaction / completion unread) | inherited | official row rendering | pending |
| Current session highlight | inherited | official `retainedBy.mainView` / selected row | pending |
| Keyboard shortcuts (new session, search, add workspace, rename, fork, archive) | inherited | official `installWorkspaceShortcuts` command registrations now run from this bundle with its own controls; no duplicate ids because the shipped copy is disabled | code path inherited; key test pending |
| Startup restore, default workspace initialisation, official toasts/dialogs | inherited | official `uiWorkspace` service + registrations now provided by this bundle | `uiWorkspace` service present; conversation/session features work in the live app |
| Wide sidebar + 56 px rail degradation | inherited | official component's own `wide`/`rail` rendering | pending |
| Blank-session workspace picker (`conversation.hero.workspace`) | inherited | official `WorkspacePicker` registered by this bundle | **registration verified**: occupant active, directory-flow child declared |

## Capabilities added by this plugin

| Added capability | Implemented by | Status |
|---|---|---|
| Three fixed sections: Active -> Session tasks -> Inactive | 02 (derive) + 03 (render) | implemented; visible in live app; rule unit-tested |
| Active/inactive heuristic: running / pending-interaction forces active; otherwise max member `updatedAt` (fallback workspace `createdAt`) vs threshold | 02 | implemented; unit-tested (`scripts/derive-selftest.mjs`, 22 assertions) |
| Manual pins (active / inactive / unpin), pins override the heuristic and the running rule | 04 (menu) + 02 (consumption) | implemented; unit-tested; menu registration code path |
| Active-days threshold 1-90, default 7, +/- and reset in the view-options menu | 04 | implemented; unit-tested for the derivation side |
| Fixed-section workspace `D:\files\history-tasks` (`会话任务`): host-side mkdir, browser-side official create+rename, flat sessions, header "+" | host half + 02/03/06 | **verified**: the official list (native mode) shows that workspace; the bootstrap registered it and the legacy title `历史任务` was migrated once to `会话任务` through `workspaces.rename` (title visible in `~/.dsh/storages/workspace.json`); flat rendering + "+" pending human click |
| Project/session rows inset 21px so the project folder icon axis aligns with the section label's first glyph (hover/selected background moves with the rows) in sections mode | 03 + 06 | implemented; verified pixel-wise in a live screenshot (header `活` ink columns = folder icon ink columns); native mode keeps official layout |
| Section collapse state persisted in the plugin-owned key `dsh.workspace.sections.v2` | 03 + 06 | implemented; persistence code path; pending human click |
| Switch back to the official list from the view-options menu | 04 + 06 (mode) | implemented; the native render path was exercised in the live app with a temporary forced-native build (official list rendered, footer return entry registered) |
| Footer return icon while native mode is active | 06 | **registration verified**: `sidebar.footer.action` entry `workspace-sections-return` order 400 active; component renders only in native mode |
| Sectioned history with error + retry empty state | 03 + 06 | implemented; error path pending |

## Data boundary

- `~/.dsh/storages/workspace.json` is only touched through the official
  `workspaces.create` / `workspaces.rename` calls for the fixed-section workspace
  (registration, rename to `会话任务`, and the one-time legacy-title migration).
- The official view key `dsh.workspace.view.v5` keeps its official schema and is
  read/written only by the official code path.
- Plugin-owned state: `dsh.workspace.sections.v2`
  (`mode`, `activeDays`, `pins`, `sectionCollapsed`). Removing it resets the
  plugin to its defaults.

## SPEC section 5.2 item 1 - proof: the fork can require the official modules

Resolved for 0.2.1-rc.2; no shims and no `dsh.client.external` declaration are
needed.

1. The vendored bundle requires exactly five modules (vendor file lines 7-11):
   `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-primitives`,
   `@deepseek-ai/cordis`, `react/jsx-runtime`, `react`.
2. The web shell freezes a platform module table (function `SZ()`, byte offset
   **916075** in `<extracted app.asar>/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-*.js`): `react`,
   `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`,
   `zod`, `@tanstack/react-virtual`, `@deepseek-ai/dsh-client-store`,
   `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives`,
   `@deepseek-ai/dsh-client-ui-dockkit`.
3. The client module loader resolves a bundle's `require(spec)` against that
   frozen table first (`dsh-client-modules/lib/client.js` line 835
   `if (this.seed.has(spec)) return this.seed.get(spec);`); it only throws
   "missed the module table" for specs that are neither seeds, materialized
   modules, nor registered package factories.
4. `dsh.client.external` is only for non-seed module *packages*; none of our
   requires is in that category.
5. Runtime confirmation: `scripts/smoke-load.mjs` materialises the generated
   bundle with only those five modules stubbed and fails with "unexpected
   require" if a patch ever introduces a spec outside the table.

## Verification checklist (fill during acceptance)

- [x] Install into `desktop` profile; `dsh.profile.bundles` contains the package.
- [x] Inspector: `sidebar.workspaces` has exactly one occupant (this bundle);
      the shipped `ui-workspace` row is disabled by the bundle patch.
- [x] Inspector: all official child-slot registrations are live (session menu
      rows, row hover actions, directory flow, hero picker, toast factory).
- [x] Live app screenshot: sectioned sidebar renders `活跃` with count and
      official project rows.
- [x] Native mode renders the official list (live app, temporary forced-native
      build) and the fixed-section workspace exists there as `会话任务` (legacy
      `历史任务` title migrated once).
- [x] `scripts/derive-selftest.mjs` covers the SPEC 2.1 rules (22 assertions).
- [ ] Human click-through: open view-options (threshold +/-, reset, switch to
      official list), pin menu, session "..." menu, search, archive filter,
      collapse sections, header "+", drag insertion line.
- [ ] Data boundary: `~/.dsh/storages/workspace.json` unchanged except the
      official history-workspace registration.
- [ ] Fallback: view options -> official list; footer return icon; refresh keeps
      the selected mode; disable plugin restores the original browser.
