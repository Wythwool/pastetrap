# PasteTrap

PasteTrap is a browser extension for a very specific mess.

Some scam pages do not try to exploit the browser. They try to exploit the user. They throw a fake CAPTCHA, fake support flow or fake update prompt on screen, then tell the victim to open Win+R, PowerShell, Terminal, CMD, bash or osascript and paste a command. That is the whole trick.

This extension watches for that pattern locally inside the browser. It scans page text, nearby command blocks, copy-run wording, obvious delivery chains and a handful of platform-specific one-liners. When the page looks dangerous, it throws a blocking warning before the user follows the instructions.

Typical flow this catches:

1. A page says "verify you are human".
2. It tells the user to press Win+R or open Terminal.
3. It shows a one-liner that downloads and runs something.
4. The browser itself is not exploited, but the user is about to execute malware for the page.

PasteTrap is built for that gap.

## What it does

- Scans page text, dialogs, buttons, links, code blocks and suspicious containers
- Extracts command candidates from code blocks and copy-adjacent UI
- Scores page-level and command-level signals with explainable heuristics
- Shows a high-visibility overlay on high and critical pages
- Keeps local logs only
- Supports ignore once, trusted domains, category toggles and sensitivity profiles
- Ships with demo pages for manual checks
- Supports English and Russian UI without any translation service

## What it does not do

- It does not intercept system command execution outside the browser
- It does not replace antivirus, EDR or basic judgment
- It does not phone home
- It does not use a backend, account system, ML or LLM APIs
- It does not try to classify every shell command on the internet

That scope is deliberate. The extension stays local, readable and cheap to audit.

## Why browser-first and local-only

The pages this targets are often short-lived, noisy and full of user-specific bait. Shipping page content to a server would be a privacy problem and an operational headache. Local heuristics are enough for the first useful cut here.

You lose global reputation data. You gain simple deployment, no telemetry, no cloud bill and fewer privacy questions.

## Architecture

Short version:

- `src/content` collects page evidence, rescans SPA pages and renders the warning overlay
- `src/shared/detection` handles rule matching, command extraction and scoring
- `src/background` stores the latest scan state and local logs
- `src/popup` shows current tab state and quick actions
- `src/options` handles settings, trusted domains, session ignores and logs
- `src/shared/storage` wraps extension storage with a small session fallback

The detection path is split on purpose:

1. Collect page snapshot
2. Extract command candidates
3. Match page signals
4. Match command signals
5. Score with selected sensitivity profile
6. Show overlay only on high or critical results

## Quick start

```bash
npm install
npm run build
```

Build output lands in `dist/` and is ready to load as an unpacked extension.

### Development

```bash
npm run dev
```

This runs a watch build. Reload the unpacked extension after changes.

### Tests, lint, typecheck

```bash
npm run test
npm run lint
npm run typecheck
npm run check
```

### Demo pages

```bash
npm run demo
```

Then open `http://127.0.0.1:4177` and use the pages in `demo/`.

## Loading into Chrome, Chromium or Edge

1. Run `npm run build`
2. Open the browser extension page
3. Enable Developer mode
4. Choose Load unpacked
5. Point it at `dist/`

For local `file://` pages, enable file access for the extension in the browser UI if you want to test those manually.

## Firefox note

The code is written in WebExtension style, but this repo ships a Chromium MV3 manifest first. Firefox MV3 support keeps moving. If you want a Firefox package, start by checking current MV3 limits around service workers and `storage.session`.

## Screenshots

The repo includes simple placeholder SVGs in `docs/assets/`.

- `docs/assets/popup-placeholder.svg`
- `docs/assets/overlay-placeholder.svg`

They are there so the docs do not lie about having polished screenshots before the extension is actually captured in the wild.

## Privacy summary

- No backend
- No telemetry
- No account
- No cloud sync
- Settings and logs live in extension storage only
- Logs store minimal redacted command context, not full raw payloads

More detail: [docs/privacy.md](docs/privacy.md)

## False positives

This kind of tooling can get annoying fast if it fires on normal admin docs or developer install guides. The repo has a few pressure-release valves for that:

- trust domain
- ignore once
- per-category toggles
- three sensitivity profiles
- technical reasons view so the warning is not a black box
- a small docs downgrade path so normal install guides do not trip the overlay just because they mention Terminal once

More detail: [docs/false-positives.md](docs/false-positives.md)

## Threat model

Read this before treating the extension like magic:

[docs/threat-model.md](docs/threat-model.md)

## Repository structure

```text
.github/
demo/
docs/
public/
scripts/
src/
tests/
```

## Roadmap

Near-term improvements that make sense:

- Better Firefox packaging path
- More resilient copy-neighbor extraction on heavily scripted pages
- Optional rules for browser extension install scams
- Better per-site suppression controls
- Small rule update process with changelog discipline

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Keep patches small. Keep heuristics explainable. Do not stuff in giant generic signature dumps just to bump the hit rate.

## Security

Read [SECURITY.md](SECURITY.md) for disclosure rules.

## License

[MIT](LICENSE)

## Maintainer note

This repo is set up to look and behave like a small security tool, not like a fake startup landing page glued onto an extension.

Primary org: [Nullbit1](https://github.com/Nullbit1)

Maintainer reference: [Wythwool](https://github.com/Wythwool)
