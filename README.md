# PasteTrap

PasteTrap is a local browser extension that looks for paste-run scams, fake verification pages and ClickFix-style flows before the user pastes a command into a terminal, Run dialog or shell.

It does not call a backend. It scans the page in the browser, stores settings locally and writes local logs only when a risk signal is found.

## What it catches

PasteTrap looks for combinations of page pressure and command behavior:

- fake CAPTCHA, anti-bot and “verify you are human” language;
- instructions to open Win+R, PowerShell, CMD, Terminal or shell;
- copy/paste/run instructions in English, Russian, Ukrainian and Spanish;
- commands hidden in code blocks, copy-neighbor content, attributes and clipboard-like payloads;
- PowerShell encoded payloads, `iwr`/`irm` + `iex`, hidden windows and bypass flags;
- `curl | bash`, `wget | sh`, shell wrappers and temp-file execution chains;
- Windows LOLBins such as `mshta`, `rundll32`, `regsvr32`, `certutil`, `bitsadmin`, `wmic` and `schtasks`;
- macOS `osascript` and `launchctl` abuse;
- iframe, open shadow DOM, lazy-loaded SPA and long-page delivery patterns;
- suspicious canvas, image, video and audio descriptors in fake verification flows.

The score is intentionally rule-based. The project is meant to be inspectable, tunable and shippable without sending page contents to a server.

## Product state

Current version: **0.2.0**.

The repository now includes the production plumbing needed for a real browser-extension release:

- MV3 manifest generation with `all_frames` and `match_about_blank`;
- unit and integration tests;
- Playwright e2e tests against a real Chromium extension context;
- demo pages for the main attack shapes;
- CI for lint, typecheck, tests, build, smoke and e2e;
- release ZIP generation with SHA-256 metadata;
- settings schema v2 with migration and normalization;
- granular exact-host/path trust and per-site suppressions;
- local rule-pack manifest and regression corpus.

## Install for development

```bash
npm install
npm run build
```

Then load `dist/` as an unpacked extension in Chromium:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the generated `dist` folder.

## Demo pages

Start the local demo server:

```bash
npm run demo
```

Open `http://127.0.0.1:4177` and use the unpacked extension against the demo pages. The suite includes benign docs, fake CAPTCHA, fake update, macOS terminal abuse, iframe delivery, SPA shadow DOM, redirect and long-page scenarios.

## Scripts

```bash
npm run manifest       # sync public/manifest.json from package metadata
npm run build          # build extension into dist/
npm run smoke          # validate the built extension bundle
npm run test           # run Vitest tests
npm run typecheck      # TypeScript check
npm run lint           # ESLint
npm run e2e            # build and run Playwright extension e2e tests
npm run release:check  # lint + typecheck + tests + build + smoke
npm run package        # build and write release/pastetrap-<version>.zip
npm run screenshots    # capture store screenshots into docs/assets/
```

`npm run screenshots` writes real screenshots to:

- `docs/assets/overlay.png`
- `docs/assets/popup.png`
- `docs/assets/options.png`

Those files are generated artifacts and can be refreshed before a store submission.

## Testing strategy

The test stack is split into four layers:

1. **Pure rule tests** for extraction, scoring, settings schema and domain/path trust.
2. **Collector + integration tests** using JSDOM to scan mounted pages.
3. **Regression corpus** for known malicious and benign fixtures.
4. **Playwright e2e** that launches Chromium with the built unpacked extension and exercises popup, options and content-script behavior.

The e2e suite covers:

- fake CAPTCHA overlay behavior;
- popup rescan handshake;
- options trust and suppression UI;
- iframe delivery;
- SPA lazy-load and shadow DOM;
- redirects;
- long pages.

## Trust and suppressions

Trust is intentionally narrow.

A trusted-site rule can be:

- exact host: `docs.example.org`;
- host + path: `docs.example.org/install`;
- optional subdomain coverage, only when explicitly enabled.

Session ignores are URL-specific and preserve query strings. That avoids turning one ignored attack URL into a blanket ignore for a whole path.

Suppressions are separate from trust. Use them when a known site produces one noisy category, for example suppressing `fake-verification` on `docs.example.org/install` while keeping command-chain detection active.

## Settings schema

Settings use schema version 2.

Imported settings are normalized before saving:

- unknown language and sensitivity values are reset to defaults;
- `logLimit` is clamped;
- enabled categories are rebuilt from the known category list;
- legacy `trustedDomains` migrate into exact-host trusted-site rules;
- invalid trust and suppression rules are dropped.

## Release flow

Local release check:

```bash
npm run release:check
npm run package
```

The package script writes:

- `release/pastetrap-<version>.zip`
- `release/pastetrap-<version>.release.json`

The release metadata contains the artifact name, size, creation time and SHA-256 digest.

GitHub Actions includes:

- `.github/workflows/ci.yml` for normal checks and e2e;
- `.github/workflows/release.yml` for manual packaging.

## Browser compatibility

The production target is Chromium MV3.

Firefox/WebExtensions packaging is tracked separately because the MV3 service-worker and extension-loading behavior differs enough to deserve its own test matrix and compatibility policy.

## Privacy

PasteTrap is local-only by design:

- no telemetry;
- no account;
- no backend;
- no remote rule fetch by default;
- page content is not uploaded.

Logs, trusted sites, suppressions and settings are stored in the browser profile storage.

## Limitations

Rule-based detection is not magic. It is designed to catch common and moderately evasive paste-scam delivery, not every possible malicious page. Closed shadow roots, cross-origin frame internals, image-only payloads and highly staged clipboard attacks can still reduce visibility. The regression corpus and e2e demo pages are meant to keep tightening that gap with every release.

## Repository layout

```text
src/background/          MV3 service-worker router
src/content/             page collector, scanner orchestration, overlay mount
src/shared/detection/    rules, extraction, scoring and rule-pack manifest
src/shared/settings/     schema v2 normalization and migrations
src/shared/storage/      local/session storage wrappers
src/popup/               popup UI
src/options/             settings, logs, trust and suppressions UI
demo/                    local demo pages for manual and e2e testing
tests/                   Vitest tests, e2e tests and regression corpus
scripts/                 manifest sync, smoke check, release package, screenshots
.github/workflows/       CI and release automation
```

## Security reporting

Report security issues through the repository security contact listed in `SECURITY.md`.
