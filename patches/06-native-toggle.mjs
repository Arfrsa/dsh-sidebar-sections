// Patch 06 — plugin-owned state, History bootstrap, native mode and footer toggle.
//
// This bundle REPLACES the shipped `ui-workspace` row (see cordis.patch.yml):
// the official client code keeps every registration (sidebar browser + child
// slots, session menu items, row actions, dialogs, toasts, shortcut commands,
// workspace picker, uiWorkspace service). This patch is purely additive on top
// of that code:
//
//   1. plugin-owned section state + actions + persistence
//      (`dsh.workspace.sections.v2`; the official view key is untouched),
//   2. the History workspace bootstrap (create + rename once, error + retry),
//   3. `useSections` / `sectionsActions` injected into the browser registration,
//   4. a `sidebar.footer.action` return button that is only visible in native
//      mode (the "switch back to the sectioned view" affordance), plus its
//      stylesheet.
//
// Native mode itself is not a second registration: the patched derivation and
// render path fall back to the official code when `mode === "native"` (patches
// 02/03), so the official list renders from the same component tree and the
// official state stays continuous.
//
// Baseline anchors (official client.js line numbers before patches; this patch
// is applied after 01-05 and anchors on that composed text):
//   L5026 viewStore                 -> insert plugin-owned state + History bootstrap
//   L5181 browserInjected           -> expose useSections + sectionsActions
//   end of apply()                  -> register the footer return button + install plugin CSS
//   before `function apply(ctx)`    -> insert the footer component and CSS installer

export const name = "06-native-toggle";
export const description =
  "Add plugin-owned section state (mode/threshold/pins/collapse), the History workspace bootstrap, the browser injection wiring and the sidebar footer return button; no official registration is removed because this bundle replaces the shipped ui-workspace row.";

function replaceOnce(source, anchor, next, label) {
  const first = source.indexOf(anchor);
  if (first < 0) {
    throw new Error("[06-native-toggle] anchor not found: " + label + "\n--- anchor ---\n" + anchor.slice(0, 900));
  }
  if (source.indexOf(anchor, first + anchor.length) >= 0) {
    throw new Error("[06-native-toggle] anchor not unique: " + label);
  }
  return source.slice(0, first) + next + source.slice(first + anchor.length);
}

const VIEW_STORE_ANCHOR = String.raw`			const viewStore = {
				...viewHandle,
				create: () => viewInstance
			};`;

const STATE_BLOCK = String.raw`			const viewStore = {
				...viewHandle,
				create: () => viewInstance
			};
			const SECTIONS_STORAGE_KEY = "dsh.workspace.sections.v2";
			const sectionsClampDays = (value) => {
				const days = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : SECTIONS_DEFAULT_STATE.activeDays;
				return Math.min(90, Math.max(1, days));
			};
			const sectionsSanitize = (raw) => {
				const value = raw !== null && typeof raw === "object" ? raw : {};
				const pins = {};
				if (value.pins !== null && typeof value.pins === "object") for (const [workspaceId, pin] of Object.entries(value.pins)) if (workspaceId !== "" && (pin === "active" || pin === "inactive")) pins[workspaceId] = pin;
				const collapsed = value.sectionCollapsed !== null && typeof value.sectionCollapsed === "object" ? value.sectionCollapsed : {};
				return {
					version: 2,
					mode: value.mode === "native" ? "native" : "sections",
					activeDays: sectionsClampDays(value.activeDays),
					pins,
					sectionCollapsed: {
						active: collapsed.active === true,
						history: collapsed.history === true,
						inactive: collapsed.inactive === void 0 ? true : collapsed.inactive === true
					},
					historyState: value.historyState === "ready" ? "ready" : "idle",
					historyError: null
				};
			};
			const sectionsLoadInitial = () => {
				try {
					if (typeof localStorage === "undefined") return sectionsSanitize(void 0);
					const stored = localStorage.getItem(SECTIONS_STORAGE_KEY);
					return stored === null ? sectionsSanitize(void 0) : sectionsSanitize(JSON.parse(stored));
				} catch (error) {
					console.warn("[workspace-sections] reading section settings failed:", error);
					return sectionsSanitize(void 0);
				}
			};
			const sectionsStore = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(sectionsLoadInitial());
			const sectionsPersist = (next) => {
				sectionsStore.set(next);
				try {
					if (typeof localStorage !== "undefined") localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(next));
				} catch (error) {
					console.warn("[workspace-sections] persisting section settings failed:", error);
				}
			};
			const sectionsPatch = (patch) => sectionsPersist({
				...sectionsStore.getSnapshot(),
				...patch
			});
			let sectionsRetryHistory = () => {};
			const sectionsActions = {
				setMode: (mode) => sectionsPatch({ mode: mode === "native" ? "native" : "sections" }),
				setActiveDays: (days) => sectionsPatch({ activeDays: sectionsClampDays(days) }),
				resetActiveDays: () => sectionsPatch({ activeDays: SECTIONS_DEFAULT_STATE.activeDays }),
				setPin: (workspaceId, pin) => {
					const pins = { ...sectionsStore.getSnapshot().pins };
					if (pin === "active" || pin === "inactive") pins[workspaceId] = pin;
					else delete pins[workspaceId];
					sectionsPatch({ pins });
				},
				setSectionCollapsed: (section, collapsed) => {
					sectionsPatch({ sectionCollapsed: {
						...sectionsStore.getSnapshot().sectionCollapsed,
						[section]: collapsed === true
					} });
				},
				retryHistoryInit: () => {
					sectionsPatch({ historyState: "idle", historyError: null });
					sectionsRetryHistory();
				}
			};
			let historyEnsureBusy = false;
			const ensureHistoryWorkspace = () => {
				const snapshot = workspaces.list.getSnapshot();
				if (snapshot.phase !== "ready") return;
				const items = Array.isArray(snapshot.items) ? snapshot.items : [];
				const existing = items.find((workspace) => sectionsIsHistoryPath(workspace.path));
				if (existing !== void 0) {
					if (sectionsStore.getSnapshot().historyState !== "ready") sectionsPatch({ historyState: "ready", historyError: null });
					if (SECTIONS_HISTORY_LEGACY_TITLES.includes(existing.title)) workspaces.rename(existing.workspaceId, SECTIONS_HISTORY_TITLE).catch((error) => {
						console.warn("[workspace-sections] renaming the fixed section workspace failed:", error);
					});
					return;
				}
				if (historyEnsureBusy) return;
				historyEnsureBusy = true;
				sectionsPatch({ historyState: "creating", historyError: null });
				workspaces.create({ path: SECTIONS_HISTORY_PATH }).then((created) => {
					const workspaceId = created !== null && typeof created === "object" ? created.workspaceId : void 0;
					if (workspaceId === void 0) throw new Error("workspaces.create did not return a workspace id");
					return workspaces.rename(workspaceId, SECTIONS_HISTORY_TITLE);
				}).then(() => {
					historyEnsureBusy = false;
					sectionsPatch({ historyState: "ready", historyError: null });
				}).catch((error) => {
					historyEnsureBusy = false;
					sectionsPatch({ historyState: "error", historyError: error instanceof Error ? error.message : String(error) });
				});
			};
			sectionsRetryHistory = ensureHistoryWorkspace;
			ctx.effect(() => {
				const unsubscribe = workspaces.list.subscribe(ensureHistoryWorkspace);
				ensureHistoryWorkspace();
				return unsubscribe;
			}, "workspace-sections: history workspace bootstrap");`;

const BROWSER_INJECT_OLD = String.raw`				setDirectoryBusy: shortcutControls.directoryBusy,
				hooks: {
					directoryFlow: browserFlowSource,
					hostInfo,
					workspaceShortcuts: shortcutControls.state,
					shortcuts: ctx.shortcuts.catalog
				}
			});`;
const BROWSER_INJECT_NEW = String.raw`				setDirectoryBusy: shortcutControls.directoryBusy,
				sectionsActions,
				hooks: {
					directoryFlow: browserFlowSource,
					hostInfo,
					workspaceShortcuts: shortcutControls.state,
					sections: sectionsStore,
					shortcuts: ctx.shortcuts.catalog
				}
			});`;

const APPLY_TAIL_OLD = String.raw`			}, WorkspacePicker));
		}`;
const APPLY_TAIL_NEW = String.raw`			}, WorkspacePicker));
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "workspace-sections-return",
				order: 400,
				locale: NS,
				inject: () => ({
					hooks: { sections: sectionsStore },
					showSections: () => {
						sectionsActions.setMode("sections");
					}
				})
			}, SectionsReturnButton));
			installSectionsUiCss();
		}`;

const APPLY_ANCHOR = "\t\tfunction apply(ctx) {";

/** Derive one hashed CSS-module class name from a baseline class-map entry (must be unique). */
function cssClass(source, key) {
  const pattern = new RegExp(JSON.stringify(key) + ":\\s*\"([^\"]+)\"", "g");
  const matches = Array.from(source.matchAll(pattern));
  if (matches.length !== 1) {
    throw new Error("[06-native-toggle] expected exactly one CSS-module class-map entry for " + JSON.stringify(key) + ", found " + matches.length);
  }
  return matches[0][1];
}

/**
 * Plugin stylesheet: section count, footer return button, and the sections-mode
 * row inset. The inset shifts the project/session row box (and therefore its
 * content and hover/selected background) right by the same value patch 03
 * publishes as `--dsh-sections-row-inset` (21px), aligning the project folder
 * icon axis with the first glyph axis of the section label; the section header
 * is excluded so it stays at the left edge. In native mode the variable is 0px,
 * so these rules are no-ops.
 * Section-header icons/chevrons deliberately keep the shipped row behaviour: the
 * chevron appears on hover and the icon takes the active (blue) colour while the
 * section is expanded, via the official folder/folderActive classes.
 */
function buildSectionsUiCss(source) {
  const projectRow = cssClass(source, "projectRow");
  const sessionRow = cssClass(source, "sessionRow");
  const overflowButton = cssClass(source, "sessionOverflowButton");
  return [
    ".dsws-section-count{flex:none;margin-left:auto;padding-left:8px;color:var(--dsw-alias-label-caption);font-size:12px;line-height:20px;font-variant-numeric:tabular-nums}",
    ".dsws-return-button{box-sizing:border-box;width:calc(100% + 4px);height:42px;margin:0 -2px;padding:0 10px 0 8px;display:inline-flex;align-items:center;gap:8px;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:12px;font-family:inherit;font-size:14px;cursor:pointer;overflow:hidden}",
    ".dsws-return-button:hover{background:var(--dsw-alias-interactive-bg-hover)}",
    ".dsws-return-label{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}",
    ".dsws-return-rail{width:36px;height:36px;border-radius:50%;justify-content:center;gap:0;padding:0}",
    "." + projectRow + ":not(.dsws-section-header),." + sessionRow + "{margin-inline-start:var(--dsh-sections-row-inset,0px)}",
    "." + overflowButton + "{margin-inline-start:var(--dsh-sections-row-inset,0px);width:calc(100% - var(--dsh-sections-row-inset,0px))}",
  ].join("\n");
}

/** Section components + the CSS installer carrying the derived stylesheet. */
function buildSectionsComponents(cssText) {
  return (
    String.raw`		/** Footer control that restores the sectioned view while the official list is active. */
		function SectionsReturnButton({ wide, useSections, showSections, t }) {
			const mode = useSections((state) => state.mode);
			if (mode !== "native") return null;
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t("sections.return"),
				side: "top",
				delayMs: 500,
				children: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: clsx("dsws-return-button", !wide && "dsws-return-rail"),
					"aria-label": t("sections.return"),
					onClick: showSections,
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSlidersTwoOutlineRegular, { size: wide ? 16 : 18 }), wide && (0, react_jsx_runtime.jsx)("span", {
						className: "dsws-return-label",
						children: t("sections.return")
					})]
				})
			});
		}
		/**
		* Inject the plugin's section-count, footer-button and sections-mode row
		* inset stylesheet once. Every value is an official design token; the only
		* literals are the shipped footer geometry and the 12px indent step.
		*/
		function installSectionsUiCss() {
			if (typeof document === "undefined") return;
			const cssId = "dsh-workspace-sections-official/sections-ui.css";
			if (document.querySelector("style[data-plugin-css=" + JSON.stringify(cssId) + "]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-workspace-sections-official";
			tag.dataset.pluginCss = cssId;
			tag.textContent = ` +
    JSON.stringify(cssText) +
    String.raw`;
			document.head.appendChild(tag);
		}
		`
  );
}

export function apply(source) {
  let next = source;
  const sectionsUiCss = buildSectionsUiCss(source);
  next = replaceOnce(next, VIEW_STORE_ANCHOR, STATE_BLOCK, "plugin state, section actions and History bootstrap");
  next = replaceOnce(next, BROWSER_INJECT_OLD, BROWSER_INJECT_NEW, "expose useSections + sectionsActions to the browser");
  next = replaceOnce(next, APPLY_ANCHOR, buildSectionsComponents(sectionsUiCss) + APPLY_ANCHOR, "footer return button component, plugin stylesheet helper and row-inset CSS");
  next = replaceOnce(next, APPLY_TAIL_OLD, APPLY_TAIL_NEW, "footer return button registration and stylesheet install");
  return next;
}

export const anchors = [
  { line: 5026, snippet: "const viewStore = { ... };", purpose: "insert plugin-owned state, actions and the History bootstrap" },
  { line: 5181, snippet: "const browserInjected = () => ({ ... })", purpose: "expose useSections + sectionsActions" },
  { line: 5021, snippet: "function apply(ctx) {", purpose: "insert footer return button component + plugin stylesheet helper" },
  { line: 5330, snippet: "end of apply(): conversation.hero.workspace registration", purpose: "register sidebar.footer.action and install plugin CSS" },
];
