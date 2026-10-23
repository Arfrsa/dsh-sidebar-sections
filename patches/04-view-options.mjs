/**
 * Patch 04 - view-options: sections controls in the view-options menu, workspace pin
 * rows in the project row menu, and the WorkspaceBrowser/SessionTree wiring that
 * feeds both. Applied after patches 02/03 and before 06 (order per manifest).
 *
 * 1. ViewOptionsMenu: prepend a sections block (label, mode toggle, separator,
 *    active-days threshold readout, decrease/increase/reset, separator) ahead of
 *    the official group-by items. Official items, ids and selectedIds are kept.
 * 2. WorkspaceBrowser: consume the patch-06 injected useSections selector hook and
 *    sectionsActions, read the snapshot once, and forward callbacks to
 *    ViewOptionsMenu and to SessionTree (patch 03 consumes the SessionTree props
 *    sections/setSectionCollapsed/setWorkspacePin/retryHistoryInit).
 * 3. ProjectRowItem: add pin-active/pin-inactive/pin-none rows to the workspace
 *    "..." menu, checked through Menu.selectedIds from the pinnedSection prop
 *    (patch 03 passes pinnedSection and actions.pin).
 *
 * Frozen interfaces (task-3 / SPEC 2.4 + 5.3):
 *   - useSections is a selector hook: useSections((s) => s) returns the snapshot
 *     {version, mode, activeDays, pins, sectionCollapsed, historyState, historyError}.
 *   - sectionsActions: setMode, setActiveDays, resetActiveDays, setPin,
 *     setSectionCollapsed, retryHistoryInit.
 *   - group rows gained section/pinnedSection in patch 02; patch 03 owns the
 *     SessionTree signature and section rendering; patch 06 owns the slot inject.
 *
 * Locale keys consumed (defined by patches 02/03): sections.label,
 * sections.enable, sections.disable, sections.activeDays, sections.days (param n),
 * sections.decrease, sections.increase, sections.reset, sections.pin.active,
 * sections.pin.inactive, sections.pin.none.
 *
 * Pure textual transform over the LF baseline. Every anchor must match exactly
 * once; every inserted marker is re-counted and every official -item- guard is
 * re-checked after the transform. No timestamps, no environment reads.
 */

export const name = "04-view-options";
export const description = "View-options sections block (mode toggle + active-days threshold), workspace pin rows in the project menu, and WorkspaceBrowser/SessionTree prop wiring.";

/** Baseline line anchors, in application order; each must match exactly once. */
export const anchors = [
  { line: 1950, snippet: "function ProjectRowItem({ group, containsCurrentDescendant = false, onToggle, onCreate, actions, ...", purpose: "ProjectRowItem consumes pinnedSection (patch 03 passes it)" },
  { line: 1955, snippet: "const workspaceMenuItems = [{", purpose: "prepend pin-active/pin-inactive/pin-none rows to the workspace \"...\" menu" },
  { line: 2001, snippet: "items: workspaceMenuItems,", purpose: "check the current pin state through Menu.selectedIds" },
  { line: 2002, snippet: "onSelect: (id) => {", purpose: "route pin selections to actions.pin and keep rename/delete intact" },
  { line: 2877, snippet: "function ViewOptionsMenu({ groupBy, orderBy, archivedFilter, onGroupPick, onOrderPick, onArchived...", purpose: "ViewOptionsMenu consumes sections + onModePick/onActiveDaysPick/onResetActiveDays" },
  { line: 2878, snippet: "const [open, setOpen] = (0, react.useState)(false);", purpose: "derive sections mode/activeDays with safe defaults when the snapshot is absent" },
  { line: 2884, snippet: "items: [", purpose: "prepend sections label/toggle/threshold/decrease/increase/reset before official group-by items" },
  { line: 2958, snippet: "onSelect: (id) => {", purpose: "route toggle/dec/inc/reset; threshold rows stay open, toggle closes, official picks unchanged" },
  { line: 3509, snippet: "closeAddWorkspace, setDirectoryBusy, renderSlot, t }) {", purpose: "WorkspaceBrowser consumes injected useSections + sectionsActions" },
  { line: 3531, snippet: "const sessionOrderByAccount = useStore((s) => s.sessionOrderByAccount);", purpose: "read the sections snapshot and alias the injected actions near the store hooks" },
  { line: 3897, snippet: "children: [wide && (0, react_jsx_runtime.jsx)(ViewOptionsMenu, {", purpose: "forward sections + callbacks to the ViewOptionsMenu invocation" },
  { line: 4015, snippet: "onSessionRevealed: acknowledgeSessionReveal,", purpose: "forward sections + setSectionCollapsed/setWorkspacePin/retryHistoryInit to SessionTree" },
];

const A_PRJ_PROPS = [
  "\t\tfunction ProjectRowItem({ group, containsCurrentDescendant = false, onToggle, onCreate, actions, drag, home, newShortcut, t }) {",
].join("\n");
const R_PRJ_PROPS = [
  "\t\tfunction ProjectRowItem({ group, containsCurrentDescendant = false, onToggle, onCreate, actions, drag, home, newShortcut, t, pinnedSection }) {",
].join("\n");

const A_PRJ_MENU_ITEMS = [
  "\t\t\tconst workspaceMenuItems = [{",
  "\t\t\t\tid: \"rename\",",
  "\t\t\t\tlabel: t(\"rename\"),",
  "\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, {})",
  "\t\t\t}, {",
  "\t\t\t\tid: \"delete\",",
  "\t\t\t\tlabel: t(\"delete.workspace\"),",
  "\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, {}),",
  "\t\t\t\tdanger: true",
  "\t\t\t}];",
].join("\n");
const R_PRJ_MENU_ITEMS = [
  "\t\t\tconst workspaceMenuItems = [",
  "\t\t\t\t...actions === void 0 || actions.pin === void 0 ? [] : [{",
  "\t\t\t\t\tid: \"pin-active\",",
  "\t\t\t\t\tlabel: t(\"sections.pin.active\"),",
  "\t\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinOutlineRegular, {})",
  "\t\t\t\t}, {",
  "\t\t\t\t\tid: \"pin-inactive\",",
  "\t\t\t\t\tlabel: t(\"sections.pin.inactive\"),",
  "\t\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinOutlineRegular, {})",
  "\t\t\t\t}, {",
  "\t\t\t\t\tid: \"pin-none\",",
  "\t\t\t\t\tlabel: t(\"sections.pin.none\"),",
  "\t\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinFillRegular, {})",
  "\t\t\t\t}, {",
  "\t\t\t\t\ttype: \"separator\",",
  "\t\t\t\t\tid: \"workspace-pin-separator\"",
  "\t\t\t\t}],",
  "\t\t\t\t{",
  "\t\t\t\t\tid: \"rename\",",
  "\t\t\t\t\tlabel: t(\"rename\"),",
  "\t\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, {})",
  "\t\t\t\t}, {",
  "\t\t\t\t\tid: \"delete\",",
  "\t\t\t\t\tlabel: t(\"delete.workspace\"),",
  "\t\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, {}),",
  "\t\t\t\t\tdanger: true",
  "\t\t\t\t}];",
].join("\n");

const A_PRJ_MENU_SELECTED = [
  "\t\t\t\t\t\t\titems: workspaceMenuItems,",
].join("\n");
const R_PRJ_MENU_SELECTED = [
  "\t\t\t\t\t\t\titems: workspaceMenuItems,",
  "\t\t\t\t\t\t\t...actions === void 0 || actions.pin === void 0 ? {} : { selectedIds: pinnedSection === \"active\" ? [\"pin-active\"] : pinnedSection === \"inactive\" ? [\"pin-inactive\"] : [\"pin-none\"] },",
].join("\n");

const A_PRJ_MENU_SELECT = [
  "\t\t\t\t\t\t\tonSelect: (id) => {",
  "\t\t\t\t\t\t\t\tsetMenuOpen(false);",
  "\t\t\t\t\t\t\t\t/* v8 ignore next -- Menu can emit only the rename and delete rows supplied above. */",
  "\t\t\t\t\t\t\t\tif (id !== \"rename\" && id !== \"delete\") return;",
  "\t\t\t\t\t\t\t\tif (id === \"rename\") actions.rename();",
  "\t\t\t\t\t\t\t\telse actions.delete();",
  "\t\t\t\t\t\t\t},",
].join("\n");
const R_PRJ_MENU_SELECT = [
  "\t\t\t\t\t\t\tonSelect: (id) => {",
  "\t\t\t\t\t\t\t\tsetMenuOpen(false);",
  "\t\t\t\t\t\t\t\tif (id === \"pin-active\") actions.pin?.(\"active\");",
  "\t\t\t\t\t\t\t\telse if (id === \"pin-inactive\") actions.pin?.(\"inactive\");",
  "\t\t\t\t\t\t\t\telse if (id === \"pin-none\") actions.pin?.(null);",
  "\t\t\t\t\t\t\t\telse if (id === \"rename\") actions.rename();",
  "\t\t\t\t\t\t\t\telse if (id === \"delete\") actions.delete();",
  "\t\t\t\t\t\t\t},",
].join("\n");

const A_VIEW_PROPS = [
  "\t\tfunction ViewOptionsMenu({ groupBy, orderBy, archivedFilter, onGroupPick, onOrderPick, onArchivedFilterPick, t }) {",
].join("\n");
const R_VIEW_PROPS = [
  "\t\tfunction ViewOptionsMenu({ groupBy, orderBy, archivedFilter, onGroupPick, onOrderPick, onArchivedFilterPick, t, sections, onModePick, onActiveDaysPick, onResetActiveDays }) {",
].join("\n");

const A_VIEW_STATE = [
  "\t\t\tconst [open, setOpen] = (0, react.useState)(false);",
].join("\n");
const R_VIEW_STATE = [
  "\t\t\tconst [open, setOpen] = (0, react.useState)(false);",
  "\t\t\tconst sectionsMode = sections === void 0 ? \"sections\" : sections.mode;",
  "\t\t\tconst sectionsActiveDays = sections === void 0 ? 7 : sections.activeDays;",
].join("\n");

const A_VIEW_ITEMS = [
  "\t\t\t\titems: [",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\ttype: \"label\",",
  "\t\t\t\t\t\tid: \"group-by\",",
  "\t\t\t\t\t\ttext: t(\"groupBy.label\")",
  "\t\t\t\t\t},",
].join("\n");
const R_VIEW_ITEMS = [
  "\t\t\t\titems: [",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\ttype: \"label\",",
  "\t\t\t\t\t\tid: \"sections-label\",",
  "\t\t\t\t\t\ttext: t(\"sections.label\")",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\tid: \"sections-toggle\",",
  "\t\t\t\t\t\tlabel: sectionsMode === \"sections\" ? t(\"sections.disable\") : t(\"sections.enable\"),",
  "\t\t\t\t\t\ticon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSlidersTwoOutlineRegular, {})",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\ttype: \"separator\",",
  "\t\t\t\t\t\tid: \"sections-separator\"",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\ttype: \"label\",",
  "\t\t\t\t\t\tid: \"sections-threshold\",",
  "\t\t\t\t\t\ttext: t(\"sections.activeDays\") + \" · \" + t(\"sections.days\", { n: sectionsActiveDays })",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\tid: \"sections-days-dec\",",
  "\t\t\t\t\t\tlabel: t(\"sections.decrease\")",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\tid: \"sections-days-inc\",",
  "\t\t\t\t\t\tlabel: t(\"sections.increase\")",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\tid: \"sections-days-reset\",",
  "\t\t\t\t\t\tlabel: t(\"sections.reset\")",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\ttype: \"separator\",",
  "\t\t\t\t\t\tid: \"sections-end-separator\"",
  "\t\t\t\t\t},",
  "\t\t\t\t\t{",
  "\t\t\t\t\t\ttype: \"label\",",
  "\t\t\t\t\t\tid: \"group-by\",",
  "\t\t\t\t\t\ttext: t(\"groupBy.label\")",
  "\t\t\t\t\t},",
].join("\n");

const A_VIEW_SELECT = [
  "\t\t\t\tonSelect: (id) => {",
  "\t\t\t\t\tif (id === \"workspace\" || id === \"workspace-tree\" || id === \"flat\") onGroupPick(id);",
].join("\n");
const R_VIEW_SELECT = [
  "\t\t\t\tonSelect: (id) => {",
  "\t\t\t\t\tif (id === \"sections-toggle\") {",
  "\t\t\t\t\t\tonModePick(sectionsMode === \"sections\" ? \"native\" : \"sections\");",
  "\t\t\t\t\t} else if (id === \"sections-days-dec\") {",
  "\t\t\t\t\t\tonActiveDaysPick(sectionsActiveDays - 1);",
  "\t\t\t\t\t\treturn;",
  "\t\t\t\t\t} else if (id === \"sections-days-inc\") {",
  "\t\t\t\t\t\tonActiveDaysPick(sectionsActiveDays + 1);",
  "\t\t\t\t\t\treturn;",
  "\t\t\t\t\t} else if (id === \"sections-days-reset\") {",
  "\t\t\t\t\t\tonResetActiveDays();",
  "\t\t\t\t\t\treturn;",
  "\t\t\t\t\t}",
  "\t\t\t\t\tif (id === \"workspace\" || id === \"workspace-tree\" || id === \"flat\") onGroupPick(id);",
].join("\n");

const A_BROWSER_PROPS = [
  "closeAddWorkspace, setDirectoryBusy, renderSlot, t }) {",
].join("\n");
const R_BROWSER_PROPS = [
  "closeAddWorkspace, setDirectoryBusy, renderSlot, t, useSections, sectionsActions }) {",
].join("\n");

const A_BROWSER_HOOK = [
  "\t\t\tconst sessionOrderByAccount = useStore((s) => s.sessionOrderByAccount);",
].join("\n");
const R_BROWSER_HOOK = [
  "\t\t\tconst sessionOrderByAccount = useStore((s) => s.sessionOrderByAccount);",
  "\t\t\tconst sections = useSections((s) => s);",
  "\t\t\tconst sectionsActionsB = sectionsActions;",
].join("\n");

const A_VIEW_CALL = [
  "\t\t\t\t\t\t\t\tchildren: [wide && (0, react_jsx_runtime.jsx)(ViewOptionsMenu, {",
  "\t\t\t\t\t\t\t\t\tgroupBy,",
  "\t\t\t\t\t\t\t\t\torderBy,",
  "\t\t\t\t\t\t\t\t\tarchivedFilter,",
  "\t\t\t\t\t\t\t\t\tonGroupPick: actions.setGroupBy,",
  "\t\t\t\t\t\t\t\t\tonOrderPick: (mode) => {",
  "\t\t\t\t\t\t\t\t\t\tactions.setOrderBy(mode, activeSessionOrders);",
  "\t\t\t\t\t\t\t\t\t},",
  "\t\t\t\t\t\t\t\t\tonArchivedFilterPick: actions.setArchivedFilter,",
  "\t\t\t\t\t\t\t\t\tt",
].join("\n");
const R_VIEW_CALL = [
  "\t\t\t\t\t\t\t\tchildren: [wide && (0, react_jsx_runtime.jsx)(ViewOptionsMenu, {",
  "\t\t\t\t\t\t\t\t\tgroupBy,",
  "\t\t\t\t\t\t\t\t\torderBy,",
  "\t\t\t\t\t\t\t\t\tarchivedFilter,",
  "\t\t\t\t\t\t\t\t\tonGroupPick: actions.setGroupBy,",
  "\t\t\t\t\t\t\t\t\tonOrderPick: (mode) => {",
  "\t\t\t\t\t\t\t\t\t\tactions.setOrderBy(mode, activeSessionOrders);",
  "\t\t\t\t\t\t\t\t\t},",
  "\t\t\t\t\t\t\t\t\tonArchivedFilterPick: actions.setArchivedFilter,",
  "\t\t\t\t\t\t\t\t\tsections,",
  "\t\t\t\t\t\t\t\t\tonModePick: sectionsActionsB.setMode,",
  "\t\t\t\t\t\t\t\t\tonActiveDaysPick: sectionsActionsB.setActiveDays,",
  "\t\t\t\t\t\t\t\t\tonResetActiveDays: sectionsActionsB.resetActiveDays,",
  "\t\t\t\t\t\t\t\t\tt",
].join("\n");

const A_TREE_CALL = [
  "\t\t\t\t\t\t\tonSessionRevealed: acknowledgeSessionReveal,",
  "\t\t\t\t\t\t\thome,",
  "\t\t\t\t\t\t\tt,",
  "\t\t\t\t\t\t\tonRenameRequest: (workspaceId, displayTitle) => {",
].join("\n");
const R_TREE_CALL = [
  "\t\t\t\t\t\t\tonSessionRevealed: acknowledgeSessionReveal,",
  "\t\t\t\t\t\t\thome,",
  "\t\t\t\t\t\t\tt,",
  "\t\t\t\t\t\t\tsections,",
  "\t\t\t\t\t\t\tsetSectionCollapsed: sectionsActionsB.setSectionCollapsed,",
  "\t\t\t\t\t\t\tsetWorkspacePin: sectionsActionsB.setPin,",
  "\t\t\t\t\t\t\tsetSectionsMode: sectionsActionsB.setMode,",
  "\t\t\t\t\t\t\tretryHistoryInit: sectionsActionsB.retryHistoryInit,",
  "\t\t\t\t\t\t\tonRenameRequest: (workspaceId, displayTitle) => {",
].join("\n");

/** Inserted-marker -> expected occurrence delta (post-apply minus input; robust to earlier patches). */
const MARKERS = [
  ["sections-label", 1],
  ["sections-toggle", 2],
  ["sections-separator", 1],
  ["sections-threshold", 1],
  ["sections-days-dec", 2],
  ["sections-days-inc", 2],
  ["sections-days-reset", 2],
  ["sections-end-separator", 1],
  ["workspace-pin-separator", 1],
  ["pin-active", 3],
  ["pin-inactive", 3],
  ["pin-none", 3],
  ["const sections = useSections((s) => s);", 1],
  ["const sectionsActionsB = sectionsActions;", 1],
  ["pinnedSection", 3],
  ["sectionsMode", 3],
  ["sectionsActiveDays", 4],
  ["setSectionCollapsed: sectionsActionsB.setSectionCollapsed,", 1],
  ["setWorkspacePin: sectionsActionsB.setPin,", 1],
  ["setSectionsMode: sectionsActionsB.setMode,", 1],
  ["retryHistoryInit: sectionsActionsB.retryHistoryInit,", 1],
  ["onModePick: sectionsActionsB.setMode,", 1],
  ["onActiveDaysPick: sectionsActionsB.setActiveDays,", 1],
  ["onResetActiveDays: sectionsActionsB.resetActiveDays,", 1],
  ["closeAddWorkspace, setDirectoryBusy, renderSlot, t, useSections, sectionsActions }) {", 1],
  ["t(\"sections.", 11],
];

/** Official snippets that this patch must leave untouched: zero occurrence delta. */
const GUARDS = [
  "id: \"group-by\"",
  "id: \"workspace-tree\"",
  "id: \"manual\"",
  "id: \"updated\"",
  "id: \"hide-archived\"",
  "id: \"show-archived\"",
  "id: \"only-archived\"",
  "id: \"rename\"",
  "id: \"delete\"",
  "items: workspaceMenuItems,",
  "t(\"groupBy.label\")",
  "t(\"orderBy.label\")",
  "t(\"filterBy.label\")",
  "function ProjectRowItem({",
  "function ViewOptionsMenu({",
  "function WorkspaceBrowser({",
  "function SessionTree({",
];

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

function replaceOnce(source, anchor, replacement, purpose) {
  const first = source.indexOf(anchor);
  if (first === -1) throw new Error("[04-view-options] anchor not found (" + purpose + "): " + JSON.stringify(anchor.slice(0, 160)));
  const second = source.indexOf(anchor, first + anchor.length);
  if (second !== -1) throw new Error("[04-view-options] anchor is not unique (" + purpose + "): " + JSON.stringify(anchor.slice(0, 160)));
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

/**
 * Apply patch 04 to the vendored official client bundle source.
 * @param source - the byte text of the baseline bundle (LF endings).
 * @returns the patched bundle text.
 */
export function apply(source) {
  const before = new Map();
  for (const [marker] of MARKERS) before.set(marker, countOccurrences(source, marker));
  for (const snippet of GUARDS) before.set(snippet, countOccurrences(source, snippet));
  let out = source;
  out = replaceOnce(out, A_PRJ_PROPS, R_PRJ_PROPS, "ProjectRowItem consumes pinnedSection (patch 03 passes it)");
  out = replaceOnce(out, A_PRJ_MENU_ITEMS, R_PRJ_MENU_ITEMS, "prepend pin-active/pin-inactive/pin-none rows to the workspace \"...\" menu");
  out = replaceOnce(out, A_PRJ_MENU_SELECTED, R_PRJ_MENU_SELECTED, "check the current pin state through Menu.selectedIds");
  out = replaceOnce(out, A_PRJ_MENU_SELECT, R_PRJ_MENU_SELECT, "route pin selections to actions.pin and keep rename/delete intact");
  out = replaceOnce(out, A_VIEW_PROPS, R_VIEW_PROPS, "ViewOptionsMenu consumes sections + onModePick/onActiveDaysPick/onResetActiveDays");
  out = replaceOnce(out, A_VIEW_STATE, R_VIEW_STATE, "derive sections mode/activeDays with safe defaults when the snapshot is absent");
  out = replaceOnce(out, A_VIEW_ITEMS, R_VIEW_ITEMS, "prepend sections label/toggle/threshold/decrease/increase/reset before official group-by items");
  out = replaceOnce(out, A_VIEW_SELECT, R_VIEW_SELECT, "route toggle/dec/inc/reset; threshold rows stay open, toggle closes, official picks unchanged");
  out = replaceOnce(out, A_BROWSER_PROPS, R_BROWSER_PROPS, "WorkspaceBrowser consumes injected useSections + sectionsActions");
  out = replaceOnce(out, A_BROWSER_HOOK, R_BROWSER_HOOK, "read the sections snapshot and alias the injected actions near the store hooks");
  out = replaceOnce(out, A_VIEW_CALL, R_VIEW_CALL, "forward sections + callbacks to the ViewOptionsMenu invocation");
  out = replaceOnce(out, A_TREE_CALL, R_TREE_CALL, "forward sections + setSectionCollapsed/setWorkspacePin/retryHistoryInit to SessionTree");
  for (const [marker, expectedDelta] of MARKERS) {
    const delta = countOccurrences(out, marker) - before.get(marker);
    if (delta !== expectedDelta) throw new Error("[04-view-options] inserted marker drift: " + JSON.stringify(marker) + " expected +" + expectedDelta + " got +" + delta);
  }
  for (const snippet of GUARDS) {
    const delta = countOccurrences(out, snippet) - before.get(snippet);
    if (delta !== 0) throw new Error("[04-view-options] official snippet changed: " + JSON.stringify(snippet) + " delta " + delta);
  }
  return out;
}

export default { name, description, anchors, apply };
