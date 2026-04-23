# Store submission notes

## Product summary

PasteTrap is a local browser extension that warns users before they paste suspicious commands from fake verification, ClickFix and paste-run scam pages.

## Permissions

- `storage`: stores settings, trusted-site rules, suppressions, session ignores and local logs.
- `activeTab`: lets the popup read and rescan the active tab state.
- `http://*/*`, `https://*/*`: scans pages where paste-scam content may appear.

## Data handling

No telemetry, no account, no backend and no remote upload of page content. All settings and logs stay in the browser profile.

## Screenshots

Generate current screenshots with:

```bash
npm run screenshots
```

Expected outputs:

- `docs/assets/overlay.png`
- `docs/assets/popup.png`
- `docs/assets/options.png`

## Compatibility statement

The current production package targets Chromium MV3. Firefox packaging is not claimed until a dedicated Firefox test matrix is added.

## QA notes

Before submission, run:

```bash
npm run release:check
npm run e2e
npm run package
```

Also test the unpacked `dist/` build manually on the demo pages.
