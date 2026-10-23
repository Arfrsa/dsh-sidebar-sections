#!/usr/bin/env node
/**
 * build-client.mjs - reproduce lib/client.js from the vendored official bundle
 * plus the ordered patch modules listed in patches/manifest.json.
 *
 * Pipeline: parse manifest -> verify vendor bytes + sha256 -> load patches in
 * manifest order -> apply each pure apply(source) -> write to a temporary file
 * -> node --check -> write lib/client.js.
 *
 * lib/client.js is a GENERATED artifact: never hand-edit it. Every change must
 * land in vendor/ (baseline refresh) or patches/*.mjs.
 *
 * Exit codes: 0 success; 1 any failure (with a human-readable reason).
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const MANIFEST_FILE = join(PACKAGE_ROOT, "patches", "manifest.json");
const OUTPUT_FILE = join(PACKAGE_ROOT, "lib", "client.js");
const CHECK_DIR = join(PACKAGE_ROOT, "lib", ".build");
const CHECK_FILE = join(CHECK_DIR, "client.check.tmp.js");
const CHECK_ONLY = process.argv.includes("--check-only");
const WANT_HELP = process.argv.includes("--help") || process.argv.includes("-h");
const ALLOW_MISSING = process.env.BUILD_ALLOW_MISSING === "1";

const RE_EXTRACT_INSTRUCTIONS = [
  "Re-extract the official baseline before rebuilding (SPEC section 6.1):",
  "  $archive = 'D:\\files\\DeepSeek Harness\\resources\\app.asar'",
  "  $base = 'dsh\\node_modules\\@deepseek-ai\\dsh-client-ui-workspace\\'",
  "  npx --yes @electron/asar@3.2.10 extract-file $archive ($base + 'lib\\client.js')",
  "  (without npx: node research/tools/asar-tool.mjs extract-file 'dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js' <out>)",
  "Then copy the fresh file over vendor/ and update patches/manifest.json (sha256, bytes, version).",
].join("\n");

const HELP = [
  "build-client.mjs - rebuild lib/client.js from vendor/ + patches/",
  "",
  "Usage:",
  "  node scripts/build-client.mjs                 full build (all manifest patches required)",
  "  node scripts/build-client.mjs --check-only    apply + syntax-check, do not write lib/client.js",
  "  node scripts/build-client.mjs --help",
  "",
  "Environment:",
  "  BUILD_ALLOW_MISSING=1   early smoke tests only: build with the patch files that exist",
  "                          (with a warning; the generated bundle must not be installed)",
  "",
  "PowerShell:  $env:BUILD_ALLOW_MISSING='1'; node scripts/build-client.mjs --check-only",
  "cmd.exe:     set BUILD_ALLOW_MISSING=1 && node scripts/build-client.mjs --check-only",
].join("\n");

class BuildFailure extends Error {}

function fail(message) {
  throw new BuildFailure(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function hexPrefix(hash) {
  return hash.slice(0, 16).toUpperCase();
}

function bytesOf(text) {
  return Buffer.byteLength(text, "utf8");
}

function formatDelta(before, after) {
  const delta = after - before;
  return (delta >= 0 ? "+" : "") + delta + " bytes";
}

function padEnd(text, width) {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function padStart(text, width) {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

async function readText(file, label) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    fail(label + " could not be read: " + file + " (" + String(error.code ?? error) + ")");
  }
}

async function readBuffer(file, label) {
  try {
    return await readFile(file);
  } catch (error) {
    fail(label + " could not be read: " + file + " (" + String(error.code ?? error) + ")");
  }
}

function parseManifest(text) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    fail("patches/manifest.json is not valid JSON: " + String(error.message ?? error));
  }
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("patches/manifest.json must contain a JSON object");
  }
  const baseline = manifest.baseline;
  if (baseline === null || typeof baseline !== "object" || Array.isArray(baseline)) {
    fail("patches/manifest.json: baseline object is missing");
  }
  for (const key of ["package", "version", "file", "sha256", "sha256Prefix16"]) {
    if (typeof baseline[key] !== "string" || baseline[key].length === 0) {
      fail("patches/manifest.json: baseline." + key + " must be a non-empty string");
    }
  }
  if (!/^[0-9a-f]{64}$/.test(baseline.sha256.toLowerCase())) {
    fail("patches/manifest.json: baseline.sha256 must be a 64-character hex sha256");
  }
  if (!/^[0-9A-Fa-f]{16}$/.test(baseline.sha256Prefix16)) {
    fail("patches/manifest.json: baseline.sha256Prefix16 must be 16 hex characters");
  }
  if (!Number.isInteger(baseline.bytes) || baseline.bytes <= 0) {
    fail("patches/manifest.json: baseline.bytes must be a positive integer");
  }
  if (typeof manifest.targetDshVersion !== "string" || manifest.targetDshVersion.length === 0) {
    fail("patches/manifest.json: targetDshVersion must be a non-empty string");
  }
  if (!Array.isArray(manifest.patches) || manifest.patches.length === 0) {
    fail("patches/manifest.json: patches must be a non-empty array");
  }
  for (let index = 0; index < manifest.patches.length; index += 1) {
    const entry = manifest.patches[index];
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      fail("patches/manifest.json: patches[" + index + "] must be an object");
    }
    if (typeof entry.file !== "string" || !entry.file.endsWith(".mjs")) {
      fail("patches/manifest.json: patches[" + index + "].file must be an .mjs filename");
    }
    if (typeof entry.description !== "string" || entry.description.length === 0) {
      fail("patches/manifest.json: patches[" + index + "].description must be a non-empty string");
    }
  }
  return manifest;
}

function selectPatches(manifest) {
  const patchDir = join(PACKAGE_ROOT, "patches");
  const present = [];
  const missing = [];
  const seen = new Set();
  for (const entry of manifest.patches) {
    if (seen.has(entry.file)) {
      fail("patches/manifest.json lists " + entry.file + " more than once");
    }
    seen.add(entry.file);
    const file = join(patchDir, entry.file);
    if (existsSync(file)) present.push({ entry, file });
    else missing.push(entry.file);
  }
  return { present, missing };
}

async function applyPatches(baselineSource, present) {
  let source = baselineSource;
  const records = [];
  for (const item of present) {
    let patchModule;
    try {
      patchModule = await import(pathToFileURL(item.file).href);
    } catch (error) {
      fail("patch " + item.entry.file + " could not be imported: " + String(error.message ?? error));
    }
    if (typeof patchModule.apply !== "function") {
      fail("patches/" + item.entry.file + " must export apply(source) -> string");
    }
    const beforeBytes = bytesOf(source);
    const started = process.hrtime.bigint();
    let next;
    try {
      next = await patchModule.apply(source);
    } catch (error) {
      fail("patches/" + item.entry.file + " failed: " + String(error.message ?? error));
    }
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    if (typeof next !== "string") {
      fail("patches/" + item.entry.file + " returned " + typeof next + " instead of a string");
    }
    const afterBytes = bytesOf(next);
    if (next === source) {
      console.warn("  warning: patches/" + item.entry.file + " did not change the bundle (no-op)");
    }
    records.push({
      file: item.entry.file,
      description: item.entry.description,
      beforeBytes,
      afterBytes,
      elapsedMs,
    });
    console.log(
      "  " + padEnd(item.entry.file, 26) + " " + padStart(formatDelta(beforeBytes, afterBytes), 13) +
        "  " + padStart(String(elapsedMs.toFixed(2)) + " ms", 10),
    );
    source = next;
  }
  return { source, records };
}

async function syntaxCheck(source) {
  await mkdir(CHECK_DIR, { recursive: true });
  await writeFile(CHECK_FILE, source, "utf8");
  try {
    // stdio: "inherit" (not the default "pipe"): on Windows DSH sandboxes a
    // confined process cannot open the named pipes that piped child stdio uses
    // (EPERM). Inheriting the terminal descriptors keeps the check working and
    // still lets node print its own syntax diagnostics to stderr.
    const result = spawnSync(process.execPath, ["--check", CHECK_FILE], {
      stdio: "inherit",
      timeout: 120000,
    });
    if (result.error !== undefined) {
      fail("node --check could not run: " + String(result.error.message ?? result.error));
    }
    if (result.status !== 0) {
      fail("node --check failed for the generated bundle (see the syntax error printed above).");
    }
  } finally {
    await rm(CHECK_DIR, { recursive: true, force: true });
  }
}

async function main() {
  if (WANT_HELP) {
    console.log(HELP);
    return;
  }
  console.log("build-client: dsh-workspace-sections-official");
  console.log("  package root  " + PACKAGE_ROOT);
  console.log("  manifest      patches/manifest.json");
  console.log("  mode          " + (CHECK_ONLY ? "check-only (lib/client.js is not written)" : "full build"));

  const manifestText = await readText(MANIFEST_FILE, "patch manifest");
  const manifest = parseManifest(manifestText);
  const baseline = manifest.baseline;

  const vendorPath = resolve(PACKAGE_ROOT, baseline.file);
  if (!vendorPath.toLowerCase().startsWith(PACKAGE_ROOT.toLowerCase())) {
    fail("patches/manifest.json: baseline.file must stay inside the package (" + baseline.file + ")");
  }
  const vendor = await readBuffer(vendorPath, "vendored baseline");
  if (vendor.length !== baseline.bytes) {
    fail(
      "vendored baseline byte length " + vendor.length + " does not match patches/manifest.json (" +
        baseline.bytes + ").\n" + RE_EXTRACT_INSTRUCTIONS,
    );
  }
  const vendorHash = sha256(vendor);
  const vendorPrefix = hexPrefix(vendorHash);
  if (vendorHash !== baseline.sha256.toLowerCase()) {
    fail(
      "vendored baseline sha256 mismatch for " + baseline.file + ".\n" +
        "  expected   " + baseline.sha256.toLowerCase() + " (prefix " + baseline.sha256Prefix16.toUpperCase() + ")\n" +
        "  actual     " + vendorHash + " (prefix " + vendorPrefix + ")\n" +
        RE_EXTRACT_INSTRUCTIONS,
    );
  }
  if (baseline.sha256Prefix16.toUpperCase() !== vendorPrefix) {
    fail(
      "patches/manifest.json baseline.sha256Prefix16 (" + baseline.sha256Prefix16.toUpperCase() +
        ") does not match the vendored file prefix (" + vendorPrefix + ").",
    );
  }
  console.log("");
  console.log("baseline  " + baseline.package + "@" + baseline.version + " (target DSH " + manifest.targetDshVersion + ")");
  console.log("  file     " + baseline.file);
  console.log("  bytes    " + vendor.length);
  console.log("  sha256   " + vendorHash + " (prefix " + vendorPrefix + ")");

  const { present, missing } = selectPatches(manifest);
  if (missing.length > 0) {
    const missingLines = missing.map((file) => "  - patches/" + file);
    if (!ALLOW_MISSING) {
      fail(
        "cannot build: " + missing.length + " patch file(s) listed in patches/manifest.json are missing:\n" +
          missingLines.join("\n") + "\n\n" +
          "Refusing to produce a partial client bundle: all manifest patches must apply before lib/client.js is shippable.\n" +
          "Patches 02/03/04/06 are owned by other team members; wait for them to land and re-run.\n" +
          "For early smoke tests only, set BUILD_ALLOW_MISSING=1 (the generated bundle must not be installed).",
      );
    }
    console.warn("");
    console.warn("warning: " + missing.length + " patch file(s) are still missing:");
    console.warn(missingLines.join("\n"));
    console.warn("BUILD_ALLOW_MISSING=1: continuing with " + present.length + " available patch(es).");
    console.warn("This is a SMOKE-TEST ARTIFACT - do not install it until every patch is present.");
  }

  console.log("");
  console.log("patches   " + manifest.patches.length + " listed, " + present.length + " applied, " + missing.length + " missing");
  const applied = await applyPatches(vendor.toString("utf8"), present);

  console.log("");
  console.log("syntax    running node --check on the generated bundle");
  await syntaxCheck(applied.source);
  console.log("syntax    node --check OK");

  const outputHash = sha256(Buffer.from(applied.source, "utf8"));
  if (CHECK_ONLY) {
    console.log("output    lib/client.js NOT written (--check-only)");
  } else {
    await mkdir(dirname(OUTPUT_FILE), { recursive: true });
    await writeFile(OUTPUT_FILE, applied.source, "utf8");
    console.log("output    lib/client.js");
    console.log("  bytes    " + bytesOf(applied.source));
    console.log("  sha256   " + outputHash + " (prefix " + hexPrefix(outputHash) + ")");
  }

  console.log("");
  if (missing.length > 0) {
    console.log("build-client: OK (PARTIAL - " + missing.length + " patch(es) missing; smoke-test artifact only)");
  } else {
    console.log("build-client: OK");
  }
  console.log("  baseline bytes -> final bytes: " + vendor.length + " -> " + bytesOf(applied.source));
  console.log("  patches applied: " + applied.records.map((record) => record.file).join(", "));
}

main().catch((error) => {
  console.error("");
  console.error("build-client: FAILED");
  console.error(String(error && error.message ? error.message : error));
  process.exitCode = 1;
});
