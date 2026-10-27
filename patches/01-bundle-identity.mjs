/**
 * Patch 01 — bundle identity + CSS-tag namespacing.
 *
 * Two asserted edits on the vendored official bundle:
 *
 * 1. The `window.__ModuleLoader__.load({ id })` id becomes this package's name.
 *    Our loader row imports `dsh-sidebar-sections`, so the browser bundle must
 *    register its factory under that id instead of the official one.
 *
 * 2. The four CSS-module style-tag ids (`"@deepseek-ai/dsh-client-ui-workspace/
 *    <Module>.module.css"`) are namespaced to `"dsh-sidebar-sections/<Module>
 *    .module.css"`. The shipped bundle dedupes its style tags by that id: when
 *    this plugin is disabled live, the old style tags stay in the document, and
 *    after a host update the newly loaded official bundle would see its own id
 *    already taken and skip injecting the new (re-hashed) CSS — leaving the
 *    official UI unstyled until a full reload. Namespacing keeps the two sets
 *    independent; the same version's CSS is byte-identical, so legacy leftovers
 *    are harmless and a changed host version still injects its own styles.
 *
 * The architecture note: this bundle *replaces* the shipped
 * `@deepseek-ai/dsh-client-ui-workspace` row (`cordis.patch.yml` disables it),
 * because owning `sidebar.workspaces` also means owning its child-slot
 * declarations, which the slot ledger allows only once. There is therefore no
 * second occupant to shadow and no `priority` option here — the registration
 * stays exactly as shipped.
 *
 * Baseline: @deepseek-ai/dsh-client-ui-workspace@0.2.1-rc.3
 * (client.js, 232860 bytes, sha256 prefix BAFD2D6EEA2F8267, 5356 lines)
 *   - anchor: line 1-2
 *       window.__ModuleLoader__.load({
 *       \tid: "@deepseek-ai/dsh-client-ui-workspace",
 *   - CSS tag ids: 4 occurrences of `"@deepseek-ai/dsh-client-ui-workspace/`
 *       Rows / AnimatedRows / WorkspacePicker / WorkspaceBrowser `.module.css`
 *
 * Re-anchoring after a baseline upgrade: see docs/upgrade-checklist.md section 3.
 */

export const name = "bundle-identity";
export const description =
  "Rewrites the __ModuleLoader__ bundle id and namespaces the four CSS-module style-tag ids.";

const LOADER_ANCHOR = "window.__ModuleLoader__.load({\n\tid: \"@deepseek-ai/dsh-client-ui-workspace\",";
const LOADER_REPLACEMENT = "window.__ModuleLoader__.load({\n\tid: \"dsh-sidebar-sections\",";
const CSS_TAG_PREFIX_ANCHOR = "\"@deepseek-ai/dsh-client-ui-workspace/";
const CSS_TAG_PREFIX_REPLACEMENT = "\"dsh-sidebar-sections/";

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
  const cssTagCount = countOccurrences(source, CSS_TAG_PREFIX_ANCHOR);
  if (cssTagCount !== 4) {
    throw new Error(
      "patch 01: expected exactly 4 CSS-module style-tag ids (\"@deepseek-ai/dsh-client-ui-workspace/…) " +
        "in the vendored baseline, found " + cssTagCount + ". Re-check the CSS module list.",
    );
  }
  let next = source.replace(LOADER_ANCHOR, () => LOADER_REPLACEMENT);
  next = next.split(CSS_TAG_PREFIX_ANCHOR).join(CSS_TAG_PREFIX_REPLACEMENT);
  if (countOccurrences(next, "id: \"dsh-sidebar-sections\"") !== 1) {
    throw new Error("patch 01: post-condition failed — expected exactly one rewritten loader id");
  }
  if (countOccurrences(next, "id: \"@deepseek-ai/dsh-client-ui-workspace\"") !== 0) {
    throw new Error("patch 01: post-condition failed — the official loader id is still present");
  }
  if (countOccurrences(next, CSS_TAG_PREFIX_ANCHOR) !== 0) {
    throw new Error("patch 01: post-condition failed — an official CSS style-tag id is still present");
  }
  if (countOccurrences(next, CSS_TAG_PREFIX_REPLACEMENT) !== 4) {
    throw new Error("patch 01: post-condition failed — expected exactly 4 namespaced CSS style-tag ids");
  }
  return next;
}
