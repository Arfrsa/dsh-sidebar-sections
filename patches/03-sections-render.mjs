// Patch 03 — sectioned rendering.
//
// The official grouped tree renders `rootGroups` (workspace project rows plus
// their session rows) inside one AnimatedRows list. In sections mode this patch
// inserts three fixed segment headers (Active -> History tasks -> Inactive),
// flattens the History workspace's session rows, and keeps every official row,
// menu, watermark, drag class and locale string in place. In native mode
// (`sections.mode === "native"`) the render path is the official one.
//
// Baseline anchors (research/workspace-sections-campaign/official-baseline-0.2.1-rc.2/client.js):
//   L3023  scrolling session tree comment -> insert SectionHeaderRow component
//   L3024  function SessionTree({ ... })  -> accept sections state + section actions
//
// Rendering only reuses official components, official CSS-module classes and the
// official primitives; section headers are ordinary keyed rows inside AnimatedRows.

export const name = "03-sections-render";
export const description =
  "Render the fixed Active / History tasks / Inactive segments with reusable header rows, a flattened History body and section collapse; native mode renders the official tree unchanged.";

/** Decode build-time placeholders so this file stays free of template-literal interpolation. */
function decode(text) {
  return text.split("__BT__").join(String.fromCharCode(96)).split("__DL__").join("$");
}

function replaceOnce(source, anchor, next, label) {
  const first = source.indexOf(anchor);
  if (first < 0) {
    throw new Error("[03-sections-render] anchor not found: " + label + "\n--- anchor ---\n" + anchor.slice(0, 800));
  }
  if (source.indexOf(anchor, first + anchor.length) >= 0) {
    throw new Error("[03-sections-render] anchor not unique: " + label);
  }
  return source.slice(0, first) + next + source.slice(first + anchor.length);
}
const SECTION_HEADER = String.raw`		/**
		* Segment icon: an ECG trace for Active, the official checklist for History
		* tasks, and a descending "zzz" for Inactive. Drawn at the same 16x16 /
		* 1px-stroke geometry as the shipped icons; the History one reuses the
		* official primitive.
		*/
		function SectionsSectionIcon({ section }) {
			if (section === "history") return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutlineRegular, { size: 14 });
			const paths = section === "active" ? [
				(0, react_jsx_runtime.jsx)("path", { d: "M1.75 8H4.25L5.75 4.5L8.25 11.5L10 6.5L11.25 8H14.25", stroke: "currentColor" })
			] : [
				(0, react_jsx_runtime.jsx)("path", { d: "M2.75 3.25H6.5L2.75 6.75H6.5", stroke: "currentColor" }),
				(0, react_jsx_runtime.jsx)("path", { d: "M6.75 6.75H9.5L6.75 9.5H9.5", stroke: "currentColor" }),
				(0, react_jsx_runtime.jsx)("path", { d: "M10 9.75H12.25L10 11.75H12.25", stroke: "currentColor" })
			];
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				strokeWidth: 1,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: paths
			});
		}
		/**
		* One fixed-segment header row: segment icon, collapse chevron, localized
		* name, count and the History "new session" control. Reuses the official
		* Workspace row classes and primitives so spacing, hover and typography stay
		* identical: the icon slot carries the folder class (plus folderActive while
		* the section is expanded, i.e. blue), and the chevron follows the shipped
		* hover-only reveal rule (icon hidden, chevron shown on hover/selection).
		*/
		function SectionHeaderRow({ section, count, collapsed, onToggle, onCreate, createLabel, t }) {
			const label = t(section === "active" ? "sections.active" : section === "history" ? "sections.history" : "sections.inactive");
			return (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(Rows_module_css_default.projectRow, "dsws-section-header"),
				"data-row-key": "section:" + section,
				role: "treeitem",
				"aria-expanded": !collapsed,
				"aria-label": label,
				onClick: onToggle,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: clsx(Rows_module_css_default.slot, Rows_module_css_default.folder, !collapsed && Rows_module_css_default.folderActive),
						children: (0, react_jsx_runtime.jsx)(SectionsSectionIcon, { section })
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: clsx(Rows_module_css_default.slot, Rows_module_css_default.chevron),
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTriangleRightFillRegular, { className: clsx(Rows_module_css_default.arrow, !collapsed && Rows_module_css_default.arrowOpen) })
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: Rows_module_css_default.projectText,
						children: (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.title,
							children: label
						})
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: "dsws-section-count",
						children: String(count)
					}),
					section === "history" && onCreate !== void 0 && (0, react_jsx_runtime.jsx)("span", {
						className: Rows_module_css_default.rowActions,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: createLabel,
							side: "bottom",
							align: "end",
							delayMs: 500,
							portal: true,
							children: (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Rows_module_css_default.iconButton,
								"aria-label": createLabel,
								onClick: (event) => {
									event.stopPropagation();
									onCreate();
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutlineRegular, {})
							})
						})
					})
				]
			});
		}
		`;

const TREE_COMMENT = "\t\t/** The scrolling session tree; unmounting drops the sessions subscription and the session watermarks. */";
const SIGNATURE_OLD = "\t\tfunction SessionTree({ list, useSessionStatus, startSession, open, workspaces, ungroupedSessionIds, rowState, onLeaveArchivedOnly, workspaceReady, animationResetKey, usePanelInfo, onRenameRequest, onDeleteRequest, onSessionRenameRequest, renderSlot, insertWorkspaceBefore, nestWorkspaces, groupExpansion, setGroupExpanded, setSessionOrder, home, t, revealSessionId, onSessionRevealed, shortcuts }) {";
const SIGNATURE_NEW = "\t\tfunction SessionTree({ list, useSessionStatus, startSession, open, workspaces, ungroupedSessionIds, rowState, onLeaveArchivedOnly, workspaceReady, animationResetKey, usePanelInfo, onRenameRequest, onDeleteRequest, onSessionRenameRequest, renderSlot, insertWorkspaceBefore, nestWorkspaces, groupExpansion, setGroupExpanded, setSessionOrder, sections, setSectionCollapsed, setWorkspacePin, setSectionsMode, home, t, revealSessionId, onSessionRevealed, shortcuts }) {";

const GROUPS_OLD = String.raw`			const groups = (0, react.useMemo)(() => deriveGroups(list, workspaces, rowState, statuses, {
				expandedGroups,
				ungroupedOrder: ungroupedSessionIds
			}), [
				list,
				workspaces,
				rowState,
				statuses,
				expandedGroups,
				ungroupedSessionIds
			]);`;
const GROUPS_NEW = String.raw`			const sectionsState = sections ?? SECTIONS_DEFAULT_STATE;
			const sectionsActive = sectionsState.mode !== "native";
			const groups = (0, react.useMemo)(() => deriveGroups(list, workspaces, rowState, statuses, {
				expandedGroups,
				ungroupedOrder: ungroupedSessionIds,
				sections: sectionsState
			}), [
				list,
				workspaces,
				rowState,
				statuses,
				expandedGroups,
				ungroupedSessionIds,
				sectionsState
			]);`;

const REVEAL_OLD = String.raw`			(0, react.useEffect)(() => {
				for (let key = revealGroup; key !== void 0; key = parents.get(key)) if (groupExpansion[key] === false || key === revealGroup && groupExpansion[key] !== true) setGroupExpanded(key, true);
			}, [
				groupExpansion,
				parents,
				revealGroup,
				setGroupExpanded
			]);`;
const REVEAL_NEW = String.raw`			(0, react.useEffect)(() => {
				for (let key = revealGroup; key !== void 0; key = parents.get(key)) if (groupExpansion[key] === false || key === revealGroup && groupExpansion[key] !== true) setGroupExpanded(key, true);
				if (!sectionsActive || revealGroup === void 0) return;
				const revealedGroup = groups.find((group) => group.key === revealGroup);
				if (revealedGroup === void 0 || revealedGroup.section === void 0) return;
				if (sectionsState.sectionCollapsed?.[revealedGroup.section] === true) setSectionCollapsed(revealedGroup.section, false);
			}, [
				groupExpansion,
				groups,
				parents,
				revealGroup,
				sectionsActive,
				sectionsState.sectionCollapsed,
				setGroupExpanded,
				setSectionCollapsed
			]);`;

const CHILDREN_OLD = String.raw`			const childrenByParent = (0, react.useMemo)(() => {
				const rendered = new Set(groups.map((group) => group.key));
				const children = /* @__PURE__ */ new Map();
				for (const group of groups) {
					let parent = parents.get(group.key);
					while (parent !== void 0 && !rendered.has(parent)) parent = parents.get(parent);
					const siblings = children.get(parent);
					if (siblings === void 0) children.set(parent, [group]);
					else siblings.push(group);
				}
				return children;
			}, [groups, parents]);`;
const CHILDREN_NEW = String.raw`			const childrenByParent = (0, react.useMemo)(() => {
				const rendered = new Set(groups.filter((group) => !(sectionsActive && group.section === "history")).map((group) => group.key));
				const children = /* @__PURE__ */ new Map();
				for (const group of groups) {
					if (sectionsActive && group.section === "history") {
						const rootSiblings = children.get(void 0);
						if (rootSiblings === void 0) children.set(void 0, [group]);
						else rootSiblings.push(group);
						continue;
					}
					let parent = parents.get(group.key);
					while (parent !== void 0 && !rendered.has(parent)) parent = parents.get(parent);
					const siblings = children.get(parent);
					if (siblings === void 0) children.set(parent, [group]);
					else siblings.push(group);
				}
				return children;
			}, [groups, parents, sectionsActive]);`;

const RENDER_TOP_OLD = decode(String.raw`				const workspaceId = group.workspaceId;
				const children = childrenByParent.get(group.key) ?? [];
				const compatibleDrag = workspaceDrag !== null && parents.get(workspaceDrag.workspaceId) === parents.get(group.key);
				const watermark = sessionWatermarks[group.key] ?? SESSION_WATERMARK_BASE;
				const collapsed = watermarkRows(group.sessions, baselines.get(group.key) ?? SESSION_WATERMARK_BASE);
				const visible = watermarkRows(group.sessions, watermark);
				const sessionsExpanded = visible.hiddenCount === 0;
				rowKeys.push(__BT__workspace:__DL__{group.key}__BT__);
				const childRows = group.expanded ? children.map((child) => renderGroup(child, depth + 1)) : [];`);
const RENDER_TOP_NEW = decode(String.raw`				const flatHistory = sectionsActive && group.section === "history";
				const workspaceId = group.workspaceId;
				const children = flatHistory ? [] : childrenByParent.get(group.key) ?? [];
				const compatibleDrag = !flatHistory && workspaceDrag !== null && parents.get(workspaceDrag.workspaceId) === parents.get(group.key);
				const watermark = sessionWatermarks[group.key] ?? SESSION_WATERMARK_BASE;
				const collapsed = watermarkRows(group.sessions, baselines.get(group.key) ?? SESSION_WATERMARK_BASE);
				const visible = watermarkRows(group.sessions, watermark);
				const sessionsExpanded = visible.hiddenCount === 0;
				if (!flatHistory) rowKeys.push(__BT__workspace:__DL__{group.key}__BT__);
				const childRows = group.expanded && !flatHistory ? children.map((child) => renderGroup(child, depth + 1)) : [];`);

const GROUPROWS_OLD = "			const groupRows = rootGroups.map((group) => renderGroup(group, 0));";
const GROUPROWS_NEW = String.raw`			const groupRows = !sectionsActive ? rootGroups.map((group) => renderGroup(group, 0)) : groups.length === 0 ? [] : (() => {
				const historyGroup = groups.find((group) => group.section === "history");
				const buckets = {
					active: [],
					history: [],
					inactive: []
				};
				for (const rootGroup of rootGroups) {
					const sectionKey = rootGroup.section ?? "active";
					if (sectionKey === "history") continue;
					buckets[sectionKey].push(rootGroup);
				}
				if (historyGroup !== void 0) buckets.history.push(historyGroup);
				const collapsedSections = sectionsState.sectionCollapsed ?? SECTIONS_DEFAULT_STATE.sectionCollapsed;
				const rendered = [];
				for (const sectionKey of [
					"active",
					"history",
					"inactive"
				]) {
					const bucket = buckets[sectionKey];
					const sectionCollapsed = collapsedSections[sectionKey] === true;
					const sectionCount = sectionKey === "history" ? bucket.reduce((count, group) => count + group.sessionCount, 0) : bucket.length;
					rowKeys.push("section:" + sectionKey);
					rendered.push((0, react_jsx_runtime.jsx)(SectionHeaderRow, {
						section: sectionKey,
						count: sectionCount,
						collapsed: sectionCollapsed,
						onToggle: () => {
							setSectionCollapsed(sectionKey, !sectionCollapsed);
						},
						onCreate: sectionKey === "history" && historyGroup !== void 0 && historyGroup.workspaceId !== void 0 ? () => {
							startSession(historyGroup.workspaceId);
						} : void 0,
						createLabel: t("sections.history.create"),
						t
					}, "section:" + sectionKey));
					if (sectionCollapsed) continue;
					if (sectionKey === "history" && bucket.length === 0) {
						rendered.push((0, react_jsx_runtime.jsxs)("div", {
							className: WorkspaceBrowser_module_css_default.empty,
							"data-row-key": "section:history-status",
							children: [sectionsState.historyState === "error" ? t("sections.history.error", { message: sectionsState.historyError ?? "" }) : sectionsState.historyState === "creating" ? t("sections.history.creating") : t("sections.history.missing"), sectionsState.historyState === "error" && (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: WorkspaceBrowser_module_css_default.emptyAction,
								onClick: () => {
									retryHistoryInit();
								},
								children: t("sections.history.retry")
							})]
						}, "section:history-status"));
						continue;
					}
					for (const group of bucket) rendered.push(renderGroup(group, 0));
				}
				return rendered;
			})();`;

const PROJECT_ROW_OLD = "\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(ProjectRowItem, {";
const PROJECT_ROW_NEW = "\t\t\t\t\t\t!flatHistory && (0, react_jsx_runtime.jsx)(ProjectRowItem, {";

const PROJECT_PROPS_OLD = String.raw`							group,
							containsCurrentDescendant: currentAncestors.has(group.key),`;
const PROJECT_PROPS_NEW = String.raw`							group,
							pinnedSection: group.pinnedSection,
							containsCurrentDescendant: currentAncestors.has(group.key),`;

const PROJECT_ACTIONS_OLD = String.raw`								delete: () => {
									/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
									if (group.workspaceId !== void 0) onDeleteRequest(group.workspaceId, group.label);
								}
							}`;
const PROJECT_ACTIONS_NEW = String.raw`								delete: () => {
									/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
									if (group.workspaceId !== void 0) onDeleteRequest(group.workspaceId, group.label);
								},
								...sectionsActive ? { pin: (value) => {
									if (group.workspaceId !== void 0) setWorkspacePin(group.workspaceId, value);
								} } : {}
							}`;

const ZH_OLD = String.raw`			"time.ago": "{t}前"
		};`;
const ZH_ADD = String.raw`			"time.ago": "{t}前",
			"sections.label": "分段",
			"sections.enable": "启用分段视图",
			"sections.disable": "切回官方列表",
			"sections.active": "活跃",
			"sections.history": "会话任务",
			"sections.inactive": "不活跃",
			"sections.activeDays": "活跃阈值",
			"sections.days": "{n} 天",
			"sections.reset": "恢复默认",
			"sections.increase": "增加阈值",
			"sections.decrease": "降低阈值",
			"sections.pin.active": "钉到活跃",
			"sections.pin.inactive": "钉到不活跃",
			"sections.pin.none": "取消钉住",
			"sections.pinned": "已钉住",
			"sections.history.create": "新建会话",
			"sections.history.error": "会话任务初始化失败：{message}",
			"sections.history.retry": "重试",
			"sections.history.creating": "正在初始化会话任务工作区…",
			"sections.history.missing": "会话任务工作区不可用",
			"sections.return": "返回分段视图"
		};`;
const EN_OLD = String.raw`			"time.ago": "{t} ago"
		};`;
const EN_ADD = String.raw`			"time.ago": "{t} ago",
			"sections.label": "Sections",
			"sections.enable": "Enable sectioned view",
			"sections.disable": "Switch to official list",
			"sections.active": "Active",
			"sections.history": "Session tasks",
			"sections.inactive": "Inactive",
			"sections.activeDays": "Active threshold",
			"sections.days": "{n} days",
			"sections.reset": "Reset to default",
			"sections.increase": "Increase threshold",
			"sections.decrease": "Decrease threshold",
			"sections.pin.active": "Pin to Active",
			"sections.pin.inactive": "Pin to Inactive",
			"sections.pin.none": "Unpin",
			"sections.pinned": "Pinned",
			"sections.history.create": "New session",
			"sections.history.error": "Session tasks setup failed: {message}",
			"sections.history.retry": "Retry",
			"sections.history.creating": "Preparing the Session tasks workspace…",
			"sections.history.missing": "Session tasks workspace is unavailable",
			"sections.return": "Back to sectioned view"
		};`;

const DRAG_MARKER_OLD = "\t\t\t\tconst workspaceMarker = workspaceId !== void 0 && workspaceDrag?.over?.id === workspaceId ? workspaceDrag.over.half : null;";
const DRAG_MARKER_NEW = "\t\t\t\tconst workspaceMarker = !flatHistory && workspaceId !== void 0 && workspaceDrag?.over?.id === workspaceId ? workspaceDrag.over.half : null;";
const DRAG_PROPS_OLD = "\t\t\t\tconst workspaceDragProps = workspaceId === void 0 ? void 0 : {";
const DRAG_PROPS_NEW = "\t\t\t\tconst workspaceDragProps = workspaceId === void 0 || flatHistory ? void 0 : {";
const DRAG_HOVER_OLD = "\t\t\t\tconst hoverWorkspace = workspaceId === void 0 || !compatibleDrag ? void 0 : (half) => {";
const DRAG_HOVER_NEW = "\t\t\t\tconst hoverWorkspace = workspaceId === void 0 || flatHistory || !compatibleDrag ? void 0 : (half) => {";
const DRAG_DROP_OLD = "\t\t\t\tconst dropWorkspace = workspaceId === void 0 || !compatibleDrag ? void 0 : (half) => {";
const DRAG_DROP_NEW = "\t\t\t\tconst dropWorkspace = workspaceId === void 0 || flatHistory || !compatibleDrag ? void 0 : (half) => {";

// Sections mode nests every project row one extra level under its fixed section
// header. The indent itself stays official (`--dsh-workspace-indent`); we only
// publish the extra inset as `--dsh-sections-row-inset` so patch 06's CSS can
// shift the row box (content AND hover/selected background) by the same pixels.
// Geometry: the section label starts at row padding 8 + icon slot 16 + gap 6 =
// 30px, so the centre of its first 14px glyph ("活") is at 37px. The project
// folder slot centre is row padding 8 + half slot 8 = 16px, so the row inset
// must be 37 - 16 = 21px to put the folder-icon axis under the label-glyph axis.
// Native mode sets the inset variable to 0px, keeping the official layout.
const ROW_INSET_OLD = decode("\t\t\t\t\tstyle: { \"--dsh-workspace-indent\": __BT__${depth * 12}px__BT__ },");
const ROW_INSET_NEW = decode("\t\t\t\t\tstyle: { \"--dsh-workspace-indent\": __BT__${depth * 12}px__BT__, \"--dsh-sections-row-inset\": sectionsActive ? \"21px\" : \"0px\" },");

export function apply(source) {
  let next = source;
  next = replaceOnce(next, TREE_COMMENT, SECTION_HEADER + TREE_COMMENT, "insert SectionHeaderRow");
  next = replaceOnce(next, SIGNATURE_OLD, SIGNATURE_NEW, "SessionTree signature");
  next = replaceOnce(next, GROUPS_OLD, GROUPS_NEW, "deriveGroups call + sections state/active flag");
  next = replaceOnce(next, REVEAL_OLD, REVEAL_NEW, "reveal effect expands its collapsed section");
  next = replaceOnce(next, CHILDREN_OLD, CHILDREN_NEW, "History group is a fixed middle root in sections mode");
  next = replaceOnce(next, RENDER_TOP_OLD, RENDER_TOP_NEW, "flat History body");
  next = replaceOnce(next, DRAG_MARKER_OLD, DRAG_MARKER_NEW, "History group has no drop marker");
  next = replaceOnce(next, DRAG_PROPS_OLD, DRAG_PROPS_NEW, "History group is not draggable");
  next = replaceOnce(next, DRAG_HOVER_OLD, DRAG_HOVER_NEW, "History group is not a drop target");
  next = replaceOnce(next, DRAG_DROP_OLD, DRAG_DROP_NEW, "History group rejects drops");
  next = replaceOnce(next, ROW_INSET_OLD, ROW_INSET_NEW, "publish the sections-mode row inset for the row-background CSS");
  next = replaceOnce(next, PROJECT_ROW_OLD, PROJECT_ROW_NEW, "History body omits the workspace row");
  next = replaceOnce(next, PROJECT_PROPS_OLD, PROJECT_PROPS_NEW, "ProjectRowItem pinnedSection prop");
  next = replaceOnce(next, PROJECT_ACTIONS_OLD, PROJECT_ACTIONS_NEW, "ProjectRowItem pin action");
  next = replaceOnce(next, GROUPROWS_OLD, GROUPROWS_NEW, "sectioned group rows with a native-mode passthrough");
  next = replaceOnce(next, ZH_OLD, ZH_ADD, "zh section dictionary");
  next = replaceOnce(next, EN_OLD, EN_ADD, "en section dictionary");
  return next;
}

export const anchors = [
  { line: 3023, snippet: "The scrolling session tree; unmounting drops the sessions subscription", purpose: "insert SectionHeaderRow component" },
  { line: 3024, snippet: "function SessionTree({ ... })", purpose: "accept sections state, setSectionCollapsed, setWorkspacePin, setSectionsMode, retryHistoryInit" },
  { line: 3069, snippet: "const groups = useMemo(() => deriveGroups(...))", purpose: "pass the plugin state and compute the sections-active flag" },
  { line: 3080, snippet: "revealGroup effect", purpose: "auto-expand the section that owns a revealed session" },
  { line: 3137, snippet: "childrenByParent useMemo", purpose: "render the History group at the root as the fixed middle segment" },
  { line: 3153, snippet: "const workspaceId = group.workspaceId; (renderGroup)", purpose: "flat History body; skip hover-row and workspace drag" },
  { line: 3165, snippet: "const workspaceMarker = ...", purpose: "no workspace drop marker/adjacent drops on History" },
  { line: 3223, snippet: "(0, react_jsx_runtime.jsx)(ProjectRowItem, {", purpose: "omit the workspace header row for History" },
  { line: 3250, snippet: "actions: group.workspaceId === void 0 ? void 0 : {", purpose: "add the pin action to the workspace row menu wiring (sections mode only)" },
  { line: 3330, snippet: "const groupRows = rootGroups.map((group) => renderGroup(group, 0));", purpose: "render Active / History / Inactive headers and bodies, or the official tree in native mode" },
  { line: 3196, snippet: 'style: { "--dsh-workspace-indent": `${depth * 12}px` },', purpose: "add one indent level to every project block in sections mode" },
  { line: 4868, snippet: '"time.ago": "{t}前"', purpose: "zh section strings" },
  { line: 4990, snippet: '"time.ago": "{t} ago"', purpose: "en section strings" },
];
