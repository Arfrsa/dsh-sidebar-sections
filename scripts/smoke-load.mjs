#!/usr/bin/env node
/**
 * smoke-load.mjs - materialise the generated lib/client.js against a stub
 * platform module table, without a browser, and fail loudly if the bundle no
 * longer registers or exports the expected surface.
 *
 * This is the runtime half of the SPEC section 5.2 item 1 proof: the bundle is
 * evaluated with only the frozen platform seed modules stubbed
 * (@deepseek-ai/dsh-client-store, @deepseek-ai/dsh-client-ui-primitives,
 * @deepseek-ai/cordis, react, react/jsx-runtime). Any require outside that table
 * makes this script throw "unexpected require".
 *
 * It does not call apply(ctx) - that needs real services - but it does execute
 * the module factory body, including the official CSS tag injection, so a broken
 * patch that corrupts the module epilogue or top-level code is caught here.
 *
 * Usage: node scripts/smoke-load.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const BUNDLE_FILE = join(PACKAGE_ROOT, "lib", "client.js");
const EXPECTED_ID = "dsh-workspace-sections-official";

function fail(message) {
  throw new Error("smoke-load: " + message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

let source;
try {
  source = readFileSync(BUNDLE_FILE, "utf8");
} catch (error) {
  fail("cannot read " + BUNDLE_FILE + " (" + String(error.code ?? error) + "); run build-client.mjs first");
}

let entry;
const styleTags = [];
const fakeDocument = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, textContent: "", setAttribute() {} }),
  head: { appendChild: (tag) => styleTags.push(tag) },
};
const sandbox = {
  console,
  window: { __ModuleLoader__: { load: (value) => { entry = value; } } },
  document: fakeDocument,
  setTimeout,
  clearTimeout,
};
vm.runInNewContext(source, sandbox, { filename: BUNDLE_FILE });

assert(entry !== undefined, "bundle did not call window.__ModuleLoader__.load");
assert(entry.id === EXPECTED_ID, "loader id is " + JSON.stringify(entry.id) + ", expected " + JSON.stringify(EXPECTED_ID));
assert(typeof entry.factory === "function", "loader entry has no factory function");

const snapshotStore = (initial) => {
  let snapshot = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    set: (next) => { snapshot = next; for (const listener of listeners) listener(); },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
};
const store = {
  createSnapshotStore: snapshotStore,
  derive: (sourceStore, selector) => ({
    getSnapshot: () => selector(sourceStore.getSnapshot()),
    subscribe: sourceStore.subscribe,
  }),
};
const primitives = new Proxy({}, {
  get: (_target, name) => name === "writeClipboard"
    ? async () => true
    : function StubPrimitive() { return null; },
});
const react = new Proxy({}, {
  get: (_target, name) => name === "createElement"
    ? function createElement() { return null; }
    : function stubHook() { return undefined; },
});
const jsxRuntime = { jsx: () => null, jsxs: () => null, Fragment: "fragment" };
const moduleTable = new Map([
  ["@deepseek-ai/dsh-client-store", store],
  ["@deepseek-ai/dsh-client-ui-primitives", primitives],
  ["@deepseek-ai/cordis", { Service: class StubService {} }],
  ["react", react],
  ["react/jsx-runtime", jsxRuntime],
]);
const requireStub = (spec) => {
  if (!moduleTable.has(spec)) fail("unexpected require(" + JSON.stringify(spec) + ") - module is outside the frozen platform seed table");
  return moduleTable.get(spec);
};

let exported;
try {
  exported = entry.factory(requireStub);
} catch (error) {
  fail("module factory threw: " + String(error && error.message ? error.message : error));
}
assert(exported !== null && typeof exported === "object", "module exports is not an object");
assert(typeof exported.apply === "function", "module does not export apply()");
assert(Array.isArray(exported.inject), "module does not export an inject array");
assert(exported.inject.length > 0, "module exports an empty inject array");
assert(styleTags.length > 0, "module evaluation injected no official CSS style tags");

console.log("smoke-load: OK");
console.log("  bundle id: " + entry.id);
console.log("  exports:   " + Object.keys(exported).join(", "));
console.log("  inject:    " + exported.inject.join(", "));
console.log("  requires:  " + [...moduleTable.keys()].join(", "));
console.log("  css tags:  " + styleTags.length + " injected at module evaluation");
