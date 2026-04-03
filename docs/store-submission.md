# Store submission notes

This repo builds an unpacked extension cleanly. Store submission is a separate packaging and policy task.

## Manual checks before submission

- Read `docs/release-checklist.md`
- Verify the final manifest version and permissions
- Capture real screenshots instead of the placeholder SVG assets
- Re-check every link in the options page and docs
- Test on at least one Chromium-based browser release channel

## Chrome Web Store notes

- Package the contents of `dist/`
- Fill the privacy section honestly: local storage only, no telemetry, no remote code
- Explain host permissions clearly: the extension scans page content for social engineering patterns
- Expect review questions if the warning overlay is too aggressive or if the store reviewer lands on a demo page

## Firefox Add-ons notes

This repo does not claim Firefox store readiness out of the box. Re-check current MV3 support and adjust packaging if needed.
