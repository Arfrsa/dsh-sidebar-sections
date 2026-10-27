# Acceptance record - 2026-10-27 (DSH 0.2.1-rc.3 update regression)

> Authoring-session record. Screenshot paths refer to artifacts on the authoring
> machine, not shipped files.

Environment: DSH Desktop **0.2.1-rc.3** (Windows; desktop app package
`@deepseek-ai/dsh-desktop@0.2.1-rc.3`, bundled runtime node 24.21.0),
profile `desktop`, plugin `dsh-sidebar-sections@0.2.8` (local link).
Shipped baseline extracted from `resources/app.asar`:
`@deepseek-ai/dsh-client-ui-workspace@0.2.1-rc.3` (232860 bytes, sha256
`bafd2d6eea2f82674cc0606bec13fc891e44b42fb2ac973f01cb32c735d4062f`).

## Reported symptom

After updating the DSH desktop client from 0.2.1-rc.2 to 0.2.1-rc.3, turning the
plugin off in Settings left the official sidebar in a broken state: rows wrapped
to two lines, session hover actions (star/archive) were always visible, times were
misplaced, and spacing/wrapping looked unstyled.

## Root cause

The shipped `ui-workspace` browser bundle dedupes its CSS-module `<style>` tags by
a stable id (`data-plugin-css="@deepseek-ai/dsh-client-ui-workspace/<Module>.module.css"`).
The plugin is a patched build of that bundle, so it injects the same tag ids.

1. While the plugin is enabled, its style tags are in the document.
2. Disabling the bundle live removes the loader patch and loads the shipped
   rc.3 bundle in the same page; the old style tags are not removed.
3. rc.3 re-hashed every CSS-module class (`hIlkoa_*` -> `wnFoaW_*` / `GAkraW_*`).
4. The shipped bundle checks `document.querySelector("style[data-plugin-css=...]")`;
   the old tag with the same id still exists, so it skips injecting the new CSS.
5. Result: rc.3 DOM class names with rc.2 stylesheet — the unstyled/wrapped rows.

A full app reload would have hidden the bug (fresh document, correct tags), which
is why it only appeared when toggling the plugin off inside the running app.

## Fix

- Re-vendored the rc.3 official bundle (232860 bytes) and bumped the plugin to
  0.2.8 with `dsh.engines.dsh = ">=0.2.1-rc.3 <0.3.0"`.
- **Patch 01 now namespaces the four CSS-module tag ids** to
  `"dsh-sidebar-sections/<Module>.module.css"`, so a stale plugin copy can never
  claim the shipped bundle's style-tag ids again (protects future host updates
  too). Assertions: exactly 4 occurrences before/after (Rows, AnimatedRows,
  WorkspacePicker, WorkspaceBrowser).
- Re-anchored every patch against rc.3 and rebuilt: 232860 -> 257958 bytes,
  sha256 `8cc6ce00ce4ac0e08957a9e38b01d30039f38fd9a503bd802f1a9aac480c29c0`,
  `node --check` OK, `smoke-load` OK, `derive-selftest` OK. Derived CSS now uses
  the rc.3 hashes (`wnFoaW_projectRow`, `wnFoaW_sessionRow`,
  `GAkraW_sessionOverflowButton`).

## Live verification (DSH Desktop 0.2.1-rc.3)

| Step | Evidence | Result |
|---|---|---|
| Plugin enabled, sectioned view | `research/_dsh_check_front.png`, `research/_enabled_rc3_final.png` | 活跃 / 会话任务 / 不活跃 headers, counts (6 / 2 / 7), project rows and sessions render with correct rc.3 spacing |
| Plugin disabled live (no reload) | `research/_disabled_official_rc3.png` | Official sidebar renders correctly styled: workspace rows 34px, session rows one line, time aligned right, hover actions hidden |
| Plugin re-enabled live | `research/_enabled_rc3_final.png` | Sectioned view restored |
| CSS namespacing in artifact | generated `lib/client.js` inspection | 4 `dsh-sidebar-sections/*.module.css` tag ids, 0 `@deepseek-ai/…/*.module.css` ids, rc.3 class hashes present |

## Remaining human checks

- Actual pointer interaction (open menus, drag, threshold buttons, pin menu) on
  rc.3 was not re-walked in this session; the rc.3 change set does not touch the
  patched render/derive regions, but a quick manual pass is worthwhile.
- The plugin now requires DSH >= 0.2.1-rc.3; users still on rc.2 should stay on
  plugin 0.2.7.
