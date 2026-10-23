/**
 * Patch 01 — bundle identity.
 *
 * One asserted edit on the vendored official bundle: the
 * `window.__ModuleLoader__.load({ id })` id becomes this package's name. Our
 * loader row imports `dsh-workspace-sections-official`, so the browser bundle
 * must register its factory under that id instead of the official one.
 *
 * The architecture note: this bundle *replaces* the shipped
 * `@deepseek-ai/dsh-client-ui-workspace` row (`cordis.patch.yml` disables it),
 * because owning `sidebar.workspaces` also means owning its child-slot
 * declarations, which the slot ledger allows only once. There is therefore no
 * second occupant to shadow and no `priority` option here — the registration
 * stays exactly as shipped.
 *
 * Baseline: @deepseek-ai/dsh-client-ui-workspace@0.2.1-rc.2
 * (client.js, 232747 bytes, sha256 prefix 4DD7F3C580F2316A, 5352 lines)
 *   - anchor: line 1-2
 *       window.__ModuleLoader__.load({
 *       \tid: "@deepseek-ai/dsh-client-ui-workspace",
 *
 * Re-anchoring after a baseline upgrade: see docs/upgrade-checklist.md section 3.
 */

export const name = "bundle-identity";
export const description = "Rewrites the __ModuleLoader__ bundle id from @deepseek-ai/dsh-client-ui-workspace to dsh-workspace-sections-official.";

const LOADER_ANCHOR = "window.__ModuleLoader__.load({\n\tid: \"@deepseek-ai/dsh-client-ui-workspace\",";
const LOADER_REPLACEMENT = "window.__ModuleLoader__.load({\n\tid: \"dsh-workspace-sections-official\",";

function countOccurrences(haystack, needle) {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

export function apply(source) {
  if (typeof source !== "string") {
    throw new TypeError("patch 01: apply(source) requires the bundle source string");
  }
  const count = countOccurrences(source, LOADER_ANCHOR);
  if (count === 0) {
    if (source.includes(LOADER_REPLACEMENT)) {
      throw new Error(
        "patch 01: already applied — the replacement loader id is present. " +
          "Rebuild from vendor/ instead of patching a patched bundle.",
      );
    }
    throw new Error(
      "patch 01: loader anchor not found in the vendored baseline. " +
        "The official bundle changed; re-diff it and update patches/01-bundle-identity.mjs " +
        "(docs/upgrade-checklist.md section 3).",
    );
  }
  if (count !== 1) {
    throw new Error("patch 01: loader anchor matched " + count + " times, expected exactly 1.");
  }
  const next = source.replace(LOADER_ANCHOR, () => LOADER_REPLACEMENT);
  if (countOccurrences(next, "id: \"dsh-workspace-sections-official\"") !== 1) {
    throw new Error("patch 01: post-condition failed — expected exactly one rewritten loader id");
  }
  if (countOccurrences(next, "id: \"@deepseek-ai/dsh-client-ui-workspace\"") !== 0) {
    throw new Error("patch 01: post-condition failed — the official loader id is still present");
  }
  return next;
}
