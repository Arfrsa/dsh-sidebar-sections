/**
 * dsh-workspace-sections-official — host (node) half.
 *
 * The only host-side duty is making sure the real directory behind the History
 * tasks section exists before the browser half asks the official
 * workspaces.create API to register it. The Desktop directory picker cannot
 * create directories (workspace/invalid-path: ENOENT realpath), so the host
 * half owns mkdir -p.
 *
 * Startup must never fail because of this plugin: any filesystem problem is a
 * warning, and the browser half surfaces the resulting in-section error with a
 * retry button.
 */
import { mkdirSync } from "node:fs";

/** Absolute path of the real workspace backing the History tasks section. */
export const HISTORY_PATH = "D:\\files\\history-tasks";

/**
 * Cordis plugin body. Synchronous and idempotent; called once per host boot.
 */
export function apply() {
  try {
    mkdirSync(HISTORY_PATH, { recursive: true });
  } catch (error) {
    console.warn("[dsh-workspace-sections-official] could not ensure " + HISTORY_PATH + ": " + String(error));
  }
}
