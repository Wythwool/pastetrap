# Changelog

## 0.2.0

This release turns the repository from a prototype into a releaseable extension build.

### Added

- Playwright end-to-end coverage for unpacked Chromium extension flows: popup, options, overlay, iframe delivery, SPA lazy load, redirects and long pages.
- GitHub Actions CI for lint, typecheck, unit tests, build, smoke check and Chromium e2e, plus a manual release workflow.
- Release packaging now writes a SHA-256 manifest next to the ZIP artifact.
- Smoke-check script for the built MV3 bundle.
- Settings schema v2 with normalization, legacy migration, clamped values and per-site category suppressions.
- Exact-host and host+path trusted-site rules. Legacy trusted domains are migrated to exact host rules instead of broad subdomain trust.
- Synchronous popup rescan handshake: trigger scan, wait for scan completion, persist state, then refresh popup state.
- All-frame content-script coverage with `all_frames` and `match_about_blank`.
- Page collection for open shadow DOM, iframe descriptors, lazy-loaded DOM, copy attributes, clipboard-like payloads, canvas/image/video/audio descriptors and long page text.
- More command-chain heuristics: hidden PowerShell, downloader-to-file, LOLBins, shell wrappers, Python/Perl remote execution, short URLs, launchctl, temp execution and obfuscation markers.
- Multilingual page-signal detection for English, Russian, Ukrainian and Spanish verification/copy/run wording.
- Local rule-pack manifest and regression corpus for false-positive and false-negative tracking.
- Demo pages for iframe, SPA shadow DOM, redirect and long-page scenarios.
- Screenshot capture helper for store assets.

### Changed

- Developer-documentation downgrade no longer hides real execution signals.
- Ignore keys preserve query strings so one ignored URL does not accidentally cover a wider flow.
- Mutation scanning is debounced and filtered to avoid rescanning on useless script/style/meta changes.
- Content settings are cached and invalidated via storage change listeners.

## 0.1.0

Initial local MV3 prototype with popup, options page, overlay, core command heuristics, session ignores and local logs.
