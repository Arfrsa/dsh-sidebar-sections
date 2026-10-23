#!/usr/bin/env node
/**
 * derive-selftest.mjs — exercise the patched sections derivation without a browser.
 *
 * The generated lib/client.js keeps every function module-private, so this test
 * slices the patched derivation region out of the generated bundle and evaluates
 * it in a vm sandbox with the small set of official helpers it depends on
 * stubbed (mainSessionId / owningGroupKey / sectionMembers / sessionVisible /
 * orderedUngrouped / buildGroup). The assertions below are the SPEC 2.1 rules:
 *
 *   - running / pending-attention / current-group workspaces -> active
 *   - manual pin beats the threshold and the automatic active rules
 *   - latest activity = max member updatedAt (fallback: workspace createdAt)
 *   - history workspace -> fixed "history" section, expanded and flat
 *   - ungrouped -> active
 *   - native mode -> official derivation output (no section fields)
 *   - archived-only keeps the History workspace only in sections mode
 *
 * Run from the plugin root:  node scripts/derive-selftest.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const BUNDLE_FILE = join(PACKAGE_ROOT, "lib", "client.js");
const DAY = 86400000;

let failures = 0;
function assert(label, condition, detail) {
  if (condition) {
    console.log("  ok   " + label);
  } else {
    failures += 1;
    console.error("  FAIL " + label + (detail === undefined ? "" : " -> " + JSON.stringify(detail)));
  }
}

const source = readFileSync(BUNDLE_FILE, "utf8");
const START = "//#region dsh-workspace-sections-official/sections-derive";
const END_MARKER = "function sectionsLatestActivity(group, statuses) {";
const startIndex = source.indexOf(START);
if (startIndex < 0) throw new Error("derive-selftest: patched derivation region missing from lib/client.js - rebuild first");
const endStart = source.indexOf(END_MARKER, startIndex);
if (endStart < 0) throw new Error("derive-selftest: sectionsLatestActivity missing - rebuild first");
let depth = 0;
let scanning = false;
let endIndex = -1;
for (let i = source.indexOf("{", endStart); i < source.length; i += 1) {
  const ch = source[i];
  if (ch === "{") {
    depth += 1;
    scanning = true;
  } else if (ch === "}") {
    depth -= 1;
    if (scanning && depth === 0) {
      endIndex = i + 1;
      break;
    }
  }
}
if (endIndex < 0) throw new Error("derive-selftest: could not slice the sectionsLatestActivity body");
const region = source.slice(startIndex, endIndex);

const sandbox = {
  console,
  Date,
  Number,
  Math,
  JSON,
  Set,
  Map,
  Object,
  Array,
  mainSessionId: (list) => list.main,
  owningGroupKey: (workspaces, sessionId) => {
    for (const workspace of workspaces) if (workspace.sessionIds.includes(sessionId)) return workspace.workspaceId;
    return "";
  },
  sectionMembers: (sessions) => sessions.slice(),
  sessionVisible: (summary, current, archived, archivedFilter) => {
    const isArchived = archived.has(summary.id);
    if (archivedFilter === "hide") return !isArchived;
    if (archivedFilter === "only") return isArchived;
    return true;
  },
  orderedUngrouped: (members) => members,
  buildGroup: (key, workspaceId, cwd, createdAt, label, members) => ({ key, workspaceId, cwd, createdAt, label, sessions: [...members] }),
  visiblePendingKind: (kind) => (kind === "approval" || kind === "plan-review" || kind === "question" ? kind : undefined),
  sessionTitle: (session) => session.id,
};
vm.createContext(sandbox);
const exported = vm.runInContext(region + "\n;({ deriveGroups });", sandbox, { filename: BUNDLE_FILE });
const deriveGroups = exported.deriveGroups;

function workspace(workspaceId, path, createdAt, sessionIds) {
  return { workspaceId, path, title: workspaceId, createdAt, sessionIds };
}
function session(id, updatedAt, extra) {
  return { id, updatedAt, blank: false, running: false, ...(extra ?? {}) };
}
function listOf(sessions, main) {
  const byId = {};
  for (const s of sessions) byId[s.id] = s;
  return { ids: sessions.map((s) => s.id), byId, main, projectionsBySession: {} };
}
function state(overrides) {
  return {
    version: 2,
    mode: "sections",
    activeDays: 7,
    pins: {},
    sectionCollapsed: { active: false, history: false, inactive: true },
    historyState: "idle",
    historyError: null,
    ...(overrides ?? {}),
  };
}
function statusesOf(entries) {
  return new Map(entries.map(([id, value]) => [id, value]));
}
function viewOf(overrides) {
  return { expandedGroups: [], ungroupedOrder: undefined, sections: state(overrides), ...overrides };
}
function run(list, workspaces, rowState, statuses, view) {
  return deriveGroups(list, workspaces, rowState, statuses, view);
}
const now = Date.now();
const baseRowState = { archivedSessionIds: [], pinnedSessionIds: [], archivedFilter: "default" };

console.log("derive-selftest: " + BUNDLE_FILE);

// --- 1. threshold, running, pending, current, history, ungrouped -----------------
{
  const sessions = [
    session("recent", now - 1 * DAY),
    session("stale", now - 30 * DAY),
    session("running", now - 30 * DAY, { running: true }),
    session("pending", now - 30 * DAY),
    session("current", now - 30 * DAY),
    session("history", now - 30 * DAY),
    session("loose", now - 30 * DAY),
  ];
  const workspaces = [
    workspace("ws-recent", "D:\\projects\\recent", new Date(now - 90 * DAY).toISOString(), ["recent"]),
    workspace("ws-stale", "D:\\projects\\stale", new Date(now - 90 * DAY).toISOString(), ["stale"]),
    workspace("ws-running", "D:\\projects\\running", new Date(now - 90 * DAY).toISOString(), ["running"]),
    workspace("ws-pending", "D:\\projects\\pending", new Date(now - 90 * DAY).toISOString(), ["pending"]),
    workspace("ws-current", "D:\\projects\\current", new Date(now - 90 * DAY).toISOString(), ["current"]),
    workspace("ws-history", "D:\\files\\history-tasks", new Date(now - 900 * DAY).toISOString(), ["history"]),
  ];
  const list = listOf(sessions, "current");
  const statuses = statusesOf([["pending", { running: false, pendingInteraction: { kind: "approval" } }]]);
  const groups = run(list, workspaces, baseRowState, statuses, viewOf({}));
  const byKey = Object.fromEntries(groups.map((group) => [group.key, group]));
  assert("recent workspace is active", byKey["ws-recent"].section === "active", byKey["ws-recent"].section);
  assert("stale workspace is inactive", byKey["ws-stale"].section === "inactive", byKey["ws-stale"].section);
  assert("running workspace is active", byKey["ws-running"].section === "active", byKey["ws-running"].section);
  assert("pending-attention workspace is active", byKey["ws-pending"].section === "active", byKey["ws-pending"].section);
  assert("current main-view workspace is active", byKey["ws-current"].section === "active", byKey["ws-current"].section);
  assert("history workspace is the fixed history section", byKey["ws-history"].section === "history", byKey["ws-history"].section);
  assert("history group is expanded and flat", byKey["ws-history"].expanded === true && byKey["ws-history"].sessions.length > 0);
  assert("ungrouped group is active", byKey[""].section === "active", byKey[""].section);
  assert("latestActivity picks newest member", byKey["ws-recent"].latestActivity === now - 1 * DAY);
  assert("activityDays is whole days", byKey["ws-stale"].activityDays === 30, byKey["ws-stale"].activityDays);
}

// --- 2. manual pins win over both threshold and running --------------------------
{
  const sessions = [session("recent", now - 1 * DAY), session("running", now - 1 * DAY, { running: true })];
  const workspaces = [
    workspace("ws-recent", "D:\\projects\\recent", new Date(now - 90 * DAY).toISOString(), ["recent"]),
    workspace("ws-running", "D:\\projects\\running", new Date(now - 90 * DAY).toISOString(), ["running"]),
    workspace("ws-pinned-active", "D:\\projects\\pinned-active", new Date(now - 900 * DAY).toISOString(), []),
    workspace("ws-pinned-inactive", "D:\\projects\\pinned-inactive", new Date(now - 90 * DAY).toISOString(), []),
  ];
  const list = listOf(sessions, "recent");
  const groups = run(list, workspaces, baseRowState, statusesOf([]), viewOf({
    pins: { "ws-pinned-active": "active", "ws-pinned-inactive": "inactive" },
  }));
  const byKey = Object.fromEntries(groups.map((group) => [group.key, group]));
  assert("pin=active lifts an old empty workspace", byKey["ws-pinned-active"].section === "active", byKey["ws-pinned-active"].section);
  assert("pin=inactive pushes a fresh workspace down", byKey["ws-pinned-inactive"].section === "inactive", byKey["ws-pinned-inactive"].section);
  assert("pinnedSection is reported back", byKey["ws-pinned-inactive"].pinnedSection === "inactive");

  const pinnedOverRunning = run(list, [workspaces[1]], baseRowState, statusesOf([]), viewOf({ pins: { "ws-running": "inactive" } }));
  assert("pin=inactive beats the running rule", pinnedOverRunning[0].section === "inactive", pinnedOverRunning[0].section);
}

// --- 3. threshold is configurable and clamped by the UI action -------------------
{
  const sessions = [session("s", now - 10 * DAY)];
  const workspaces = [workspace("ws", "D:\\projects\\ws", new Date(now - 900 * DAY).toISOString(), ["s"])];
  const list = listOf(sessions, undefined);
  const seven = run(list, workspaces, baseRowState, statusesOf([]), viewOf({ activeDays: 7 }));
  const thirty = run(list, workspaces, baseRowState, statusesOf([]), viewOf({ activeDays: 30 }));
  assert("10-day-old session is inactive under the 7-day default", seven[0].section === "inactive", seven[0].section);
  assert("10-day-old session is active under a 30-day threshold", thirty[0].section === "active", thirty[0].section);
}

// --- 4. native mode renders the official derivation -----------------------------
{
  const sessions = [session("recent", now - 1 * DAY), session("history", now - 500 * DAY)];
  const workspaces = [
    workspace("ws", "D:\\projects\\ws", new Date(now - 90 * DAY).toISOString(), ["recent"]),
    workspace("ws-history", "D:\\files\\history-tasks", new Date(now - 900 * DAY).toISOString(), ["history"]),
  ];
  const list = listOf(sessions, undefined);
  const nativeGroups = run(list, workspaces, baseRowState, statusesOf([]), viewOf({ mode: "native" }));
  assert("native mode keeps every official group", nativeGroups.length === 2, nativeGroups.length);
  assert("native mode adds no section field", nativeGroups.every((group) => group.section === undefined && group.pinnedSection === undefined && group.activityDays === undefined));
  const nativeHistory = nativeGroups.find((group) => group.key === "ws-history");
  assert("native mode keeps the history workspace collapsed like any workspace", nativeHistory.expanded === false);
  assert("native mode does not flatten history sessions", nativeHistory.sessions.length === 0);
}

// --- 5. archived-only keeps the History workspace only in sections mode ---------
{
  const sessions = [session("archived", now - 1 * DAY)];
  const workspaces = [workspace("ws-history", "D:\\files\\history-tasks", new Date(now - 900 * DAY).toISOString(), [])];
  const rowState = { archivedSessionIds: ["archived"], pinnedSessionIds: [], archivedFilter: "only" };
  const list = listOf(sessions, undefined);
  const sectionsGroups = run(list, workspaces, rowState, statusesOf([]), viewOf({}));
  const nativeGroups = run(list, workspaces, rowState, statusesOf([]), viewOf({ mode: "native" }));
  assert("sections mode keeps the empty History workspace under archived-only", sectionsGroups.some((group) => group.key === "ws-history"));
  assert("native mode applies the official archived-only drop to the History workspace", !nativeGroups.some((group) => group.key === "ws-history"), nativeGroups.map((group) => group.key));
}

// --- 6. archived sessions do not count as activity in any mode ------------------
{
  const sessions = [session("archived-old", now - 1 * DAY)];
  const workspaces = [workspace("ws", "D:\\projects\\ws", new Date(now - 900 * DAY).toISOString(), ["archived-old"])];
  const rowState = { archivedSessionIds: ["archived-old"], pinnedSessionIds: [], archivedFilter: "hide" };
  const groups = run(listOf(sessions, undefined), workspaces, rowState, statusesOf([]), viewOf({}));
  assert("hidden archived session leaves the workspace inactive", groups[0].section === "inactive", groups[0].section);
}

console.log("");
if (failures > 0) {
  console.error("derive-selftest: " + failures + " assertion(s) FAILED");
  process.exit(1);
}
console.log("derive-selftest: OK");
