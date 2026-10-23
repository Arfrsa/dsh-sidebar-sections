# Third-party notices

This package is a patched build of an official DeepSeek Harness client bundle.
The official package is **not modified on disk**: the upstream artifact is
vendored byte-for-byte and the build pipeline generates this package's browser
half from it (`patches/*.mjs`).

## `@deepseek-ai/dsh-client-ui-workspace` 0.2.1-rc.2

- Copyright (c) 2026 DeepSeek
- License: MIT
- Upstream: <https://github.com/deepseek-ai/deepseek-harness> (`packages/client/ui-workspace`)
- Vendored file: `vendor/dsh-client-ui-workspace-0.2.1-rc.2.js`
  (232747 bytes, SHA256 `4dd7f3c580f2316af8172ee4dc542b10e19b030e81f9242f4696e8139260dc17`)
- License text: [`vendor/LICENSE.dsh-client-ui-workspace`](vendor/LICENSE.dsh-client-ui-workspace)

The patched browser artifact (`lib/client.js`) is generated from that vendored
file by `scripts/build-client.mjs`; the patch pipeline is this package's own MIT
work. The patch set changes the bundle id, adds the section derivation/render
layer, extends the view-options menu and workspace row menu, and replaces the
shipped `ui-workspace` loader row while this bundle is enabled.

## Runtime modules

At run time the browser bundle only requires the DeepSeek Harness web shell's
frozen platform seed modules (`react`, `react/jsx-runtime`,
`@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-store`,
`@deepseek-ai/dsh-client-ui-primitives`). They are provided by the host
application, not redistributed here.
