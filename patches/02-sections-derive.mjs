// Patch 02 — section derivation.
//
// The official browser derives workspace groups in `groupByWorkspace` and then
// projects them into rows in `deriveGroups`. This layer only ADDS fields to the
// official group objects — `section`, `pinnedSection`, `latestActivity`,
// `activityDays` — and a fixed "history tasks" workspace identity. Official
// ordering, filtering and session-node derivation are untouched, and in native
// mode (`sections.mode === "native"`) the derivation output is byte-for-byte
// the official one.
//
// Baseline anchors (research/workspace-sections-campaign/official-baseline-0.2.1-rc.3/client.js):
//   L1027  function groupByWorkspace(...)   -> extra `sectionsMode` parameter
//   L1040  archived-only empty-group drop   -> never drop the fixed History workspace in sections mode
//   L1091  function deriveGroups(...)       -> add section / pinnedSection / latestActivity

export const name = "02-sections-derive";
export const description =
  "Add section/pinnedSection/latestActivity fields to deriveGroups and keep the fixed History workspace when the archived-only filter would drop it; native mode returns the official derivation unchanged.";

function replaceOnce(source, anchor, next, label) {
  const first = source.indexOf(anchor);
  if (first < 0) {
    throw new Error("[02-sections-derive] anchor not found: " + label + "\n--- anchor ---\n" + anchor.slice(0, 600));
  }
  if (source.indexOf(anchor, first + anchor.length) >= 0) {
    throw new Error("[02-sections-derive] anchor not unique: " + label);
  }
  return source.slice(0, first) + next + source.slice(first + anchor.length);
}

const HELPERS = String.raw`//#region dsh-sidebar-sections/sections-derive
		/** Canonical path of the fixed middle-segment Workspace ("session tasks"). */
		const SECTIONS_HISTORY_PATH = "D:\\files\\history-tasks";
		/** Display title forced onto the fixed middle-segment Workspace. */
		const SECTIONS_HISTORY_TITLE = "会话任务";
		/** Earlier titles of that same fixed Workspace, migrated once on plugin load. */
		const SECTIONS_HISTORY_LEGACY_TITLES = ["历史任务"];
		/** Default plugin-owned state (persisted under dsh.workspace.sections.v2). */
		const SECTIONS_DEFAULT_STATE = {
			version: 2,
			mode: "sections",
			activeDays: 7,
			pins: {},
			sectionCollapsed: {
				active: false,
				history: false,
				inactive: true
			},
			historyState: "idle",
			historyError: null
		};
		/** Case-insensitive, separator-insensitive form used only for identity checks. */
		function sectionsCanonicalPath(path) {
			if (typeof path !== "string") return "";
			let value = path.trim().replace(/\//g, "\\");
			while (value.length > 3 && value.endsWith("\\")) value = value.slice(0, -1);
			return value.toLowerCase();
		}
		function sectionsIsHistoryPath(path) {
			return sectionsCanonicalPath(path) === sectionsCanonicalPath(SECTIONS_HISTORY_PATH);
		}
		/** Whole days between a group's latest activity and now (collapsed-section summary). */
		function sectionsSurfaceDays(latest, now) {
			if (latest === void 0 || !Number.isFinite(latest)) return void 0;
			return Math.max(0, Math.floor((now - latest) / 864e5));
		}
		//#endregion
		`;

const GROUP_BY_OLD = "		function groupByWorkspace(list, workspaces, archived, archivedFilter, ungroupedOrder) {";
const GROUP_BY_NEW = "		function groupByWorkspace(list, workspaces, archived, archivedFilter, ungroupedOrder, sectionsMode) {";

const ARCHIVED_ONLY_OLD = '\t\t\t\tif (archivedFilter === "only" && members.length === 0) continue;';
const ARCHIVED_ONLY_NEW = '\t\t\t\tif (archivedFilter === "only" && members.length === 0 && !(sectionsMode === "sections" && sectionsIsHistoryPath(workspace.path))) continue;';

const DERIVE_OLD = `		function deriveGroups(list, workspaces, rowState, statuses, view) {
			const archived = new Set(rowState.archivedSessionIds);
			const pinned = new Set(rowState.pinnedSessionIds);
			const expandedGroups = new Set(view.expandedGroups);
			const current = mainSessionId(list);
			const currentGroup = current === void 0 ? void 0 : owningGroupKey(workspaces, current);
			const groups = [];
			for (const g of groupByWorkspace(list, workspaces, archived, rowState.archivedFilter, view.ungroupedOrder)) {
				const expanded = expandedGroups.has(g.key);
				groups.push({
					key: g.key,
					workspaceId: g.workspaceId,
					cwd: g.cwd,
					createdAt: g.createdAt,
					label: g.label,
					sessionCount: g.sessions.length,
					expanded,
					containsCurrent: g.key === currentGroup,
					sessions: expanded ? sectionMembers(g.sessions, pinned, archived).map((session) => sessionNode(session, list, statuses, pinned, archived)) : []
				});
			}
			return groups;
		}`;

const DERIVE_NEW = `		function deriveGroups(list, workspaces, rowState, statuses, view) {
			const archived = new Set(rowState.archivedSessionIds);
			const pinned = new Set(rowState.pinnedSessionIds);
			const expandedGroups = new Set(view.expandedGroups);
			const current = mainSessionId(list);
			const currentGroup = current === void 0 ? void 0 : owningGroupKey(workspaces, current);
			const sections = view.sections ?? SECTIONS_DEFAULT_STATE;
			const sectionsActive = sections.mode !== "native";
			const sectionNow = Date.now();
			const sectionDays = Number.isFinite(sections.activeDays) ? sections.activeDays : SECTIONS_DEFAULT_STATE.activeDays;
			const sectionThreshold = sectionNow - sectionDays * 864e5;
			const sectionPins = sections.pins ?? {};
			const groups = [];
			const groupBySections = sectionsActive ? "sections" : "native";
			for (const g of groupByWorkspace(list, workspaces, archived, rowState.archivedFilter, view.ungroupedOrder, groupBySections)) {
				const expanded = expandedGroups.has(g.key);
				const pushOfficial = () => groups.push({
					key: g.key,
					workspaceId: g.workspaceId,
					cwd: g.cwd,
					createdAt: g.createdAt,
					label: g.label,
					sessionCount: g.sessions.length,
					expanded,
					containsCurrent: g.key === currentGroup,
					sessions: expanded ? sectionMembers(g.sessions, pinned, archived).map((session) => sessionNode(session, list, statuses, pinned, archived)) : []
				});
				if (!sectionsActive) {
					pushOfficial();
					continue;
				}
				try {
					const pinnedSection = g.workspaceId === void 0 ? void 0 : sectionPins[g.workspaceId];
					const latestActivity = sectionsLatestActivity(g, statuses);
					let section;
					if (g.workspaceId !== void 0 && sectionsIsHistoryPath(g.cwd)) section = "history";
					else if (g.workspaceId === void 0) section = "active";
					else if (pinnedSection === "active") section = "active";
					else if (pinnedSection === "inactive") section = "inactive";
					else if (latestActivity.attention || g.key === currentGroup) section = "active";
					else section = latestActivity.latest !== void 0 && latestActivity.latest >= sectionThreshold ? "active" : "inactive";
					const flatHistory = section === "history";
					groups.push({
						key: g.key,
						workspaceId: g.workspaceId,
						cwd: g.cwd,
						createdAt: g.createdAt,
						label: g.label,
						sessionCount: g.sessions.length,
						expanded: flatHistory ? true : expanded,
						containsCurrent: g.key === currentGroup,
						section,
						pinnedSection,
						latestActivity: latestActivity.latest,
						activityDays: sectionsSurfaceDays(latestActivity.latest, sectionNow),
						sessions: flatHistory || expanded ? sectionMembers(g.sessions, pinned, archived).map((session) => sessionNode(session, list, statuses, pinned, archived)) : []
					});
				} catch (error) {
					console.warn("[workspace-sections] section derivation failed for group " + JSON.stringify(g.key) + "; keeping the official row", error);
					pushOfficial();
				}
			}
			return groups;
		}
		/**
		* Latest member activity and the running / pending-attention flag for one
		* group. Reads only the group's filtered members (the official archive
		* filter decides which sessions count) plus the live status map.
		*/
		function sectionsLatestActivity(group, statuses) {
			let latest = Number.isFinite(group.createdAt) ? group.createdAt : void 0;
			let attention = false;
			for (const session of group.sessions) {
				const status = statuses.get(session.id);
				if (latest === void 0 || session.updatedAt > latest) latest = session.updatedAt;
				const running = status === void 0 ? session.running : status.running;
				if (running === true || visiblePendingKind(status?.pendingInteraction?.kind) !== void 0) attention = true;
			}
			return {
				latest,
				attention
			};
		}`;

export function apply(source) {
  let next = source;
  next = replaceOnce(
    next,
    GROUP_BY_OLD,
    HELPERS + GROUP_BY_OLD,
    "prepend section helpers before groupByWorkspace",
  );
  next = replaceOnce(next, GROUP_BY_OLD, GROUP_BY_NEW, "groupByWorkspace signature");
  next = replaceOnce(next, ARCHIVED_ONLY_OLD, ARCHIVED_ONLY_NEW, "archived-only empty-group rule keeps the History workspace in sections mode");
  next = replaceOnce(next, DERIVE_OLD, DERIVE_NEW, "deriveGroups section fields");
  return next;
}

export const anchors = [
  { line: 1027, snippet: "function groupByWorkspace(list, workspaces, archived, archivedFilter, ungroupedOrder) {", purpose: "prepend helpers, add the sectionsMode parameter" },
  { line: 1040, snippet: 'if (archivedFilter === "only" && members.length === 0) continue;', purpose: "keep the fixed History workspace under archived-only in sections mode" },
  { line: 1091, snippet: "function deriveGroups(list, workspaces, rowState, statuses, view) {", purpose: "derive section / pinnedSection / latestActivity, gated by the sections mode" },
];
