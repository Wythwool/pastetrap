# PasteTrap

PasteTrap is a browser extension that tries to stop one very specific scam pattern before it turns into malware execution.

Some malicious pages do not exploit the browser at all. They exploit the person sitting in front of it.

The flow is usually stupidly simple:

1. The page shows a fake CAPTCHA, fake support alert, or fake update message
2. It tells the user to open Win+R, PowerShell, CMD, Terminal, bash, or osascript
3. It gives them a command to paste and run
4. The browser stays technically "safe", but the user just launched the payload themselves

That gap is exactly what PasteTrap is built for.

Instead of trying to be a giant security platform, it stays focused on this one problem: pages that push people into copy-pasting dangerous commands.

## What it does

PasteTrap scans the page locally and looks for combinations like:

- fake verification or fake support wording
- instructions to open a shell or run box
- nearby command blocks or copy-run prompts
- suspicious one-liners that download, decode, or execute something
- delivery chains that clearly try to move execution outside the browser

When the page crosses the risk threshold, the extension shows a blocking warning before the user follows the instructions.

## What it does not do

PasteTrap is intentionally narrow in scope.

It does **not**:

- intercept commands outside the browser
- replace antivirus or endpoint protection
- send page content to a server
- use accounts, telemetry, cloud scoring, or LLM APIs
- try to classify every shell command on the internet

This is not meant to be magic. It is meant to catch a specific class of scams early, locally, and in a way that is easy to inspect.

## Why this exists

A lot of scam pages are not technically sophisticated. They do not need to be.

If a page can scare or pressure someone into opening PowerShell and pasting a line they do not understand, the damage is already done. Browser security does not help much at that point because the browser was never the real target.

PasteTrap exists for that ugly middle ground where the page is "just text", but the text is clearly trying to trick the user into running malware.

## Why local-only

This extension runs locally on purpose.

Sending page content to a backend would create privacy problems fast. It would also make the whole thing heavier, more annoying to maintain, and more expensive for no real reason.

For this use case, local heuristics are enough to be useful.

You lose centralized reputation data.
You gain:

- no telemetry
- no cloud bill
- no account system
- fewer privacy questions
- simpler auditing

That tradeoff is worth it here.

## Main features

- scans visible page text and suspicious UI areas
- checks dialogs, buttons, links, code blocks, and copy-adjacent containers
- extracts likely command candidates from the page
- scores page-level and command-level signals with explainable heuristics
- shows a blocking overlay on high and critical findings
- stores logs locally only
- supports trusted domains
- supports ignore once
- supports category toggles
- supports multiple sensitivity profiles
- includes demo pages for manual testing
- includes English and Russian UI without any external translation service

## Detection flow

The pipeline is split into small steps on purpose:

1. collect a page snapshot
2. extract command candidates
3. match page signals
4. match command signals
5. score everything using the selected sensitivity profile
6. show the overlay only for high or critical results

The goal is not just to flag pages, but to make the logic understandable and maintainable.

## Project structure

```text
.github/
demo/
docs/
public/
scripts/
src/
tests/
````

High-level breakdown:

* `src/content`
  collects page evidence, rescans SPA pages, and renders the warning overlay

* `src/shared/detection`
  handles signal matching, command extraction, and scoring

* `src/background`
  keeps current scan state and local logs

* `src/popup`
  shows the current tab state and quick actions

* `src/options`
  manages settings, logs, trusted domains, and session ignores

* `src/shared/storage`
  wraps extension storage with a small session fallback

## Quick start

```bash
npm install
npm run build
```

The production build goes to `dist/`.

## Development

```bash
npm run dev
```

This runs a watch build. After changes, reload the unpacked extension in the browser.

## Tests and checks

```bash
npm run test
npm run lint
npm run typecheck
npm run check
```

## Demo pages

```bash
npm run demo
```

Then open:

```text
http://127.0.0.1:4177
```

The demo pages in `demo/` are there for manual checks and regression testing.

## Load into Chrome, Chromium, or Edge

1. Run `npm run build`
2. Open the browser extensions page
3. Enable Developer mode
4. Click **Load unpacked**
5. Select the `dist/` folder

If you want to test against local `file://` pages, enable file access for the extension in the browser UI.

## Firefox

The code follows WebExtension patterns, but the repo currently ships a Chromium MV3 setup first.

Firefox MV3 support keeps changing, especially around service workers and `storage.session`, so a Firefox package is possible but not treated as the primary target in this repo right now.

## Screenshots

The repo currently includes simple placeholder SVGs in `docs/assets/`:

* `docs/assets/popup-placeholder.svg`
* `docs/assets/overlay-placeholder.svg`

They exist so the documentation is still complete without pretending there are polished production screenshots already.

## Privacy

PasteTrap is local-first by design.

* no backend
* no telemetry
* no account
* no cloud sync
* settings live in extension storage
* logs stay local
* logs keep minimal redacted command context instead of storing full raw payloads

More details: [docs/privacy.md](docs/privacy.md)

## False positives

This kind of extension becomes useless fast if it starts screaming at normal admin docs, dev setup guides, or harmless terminal instructions.

To keep that under control, the repo includes a few escape valves:

* trusted domains
* ignore once
* per-category toggles
* three sensitivity profiles
* reason visibility, so alerts are not a black box
* a docs downgrade path, so a normal install guide does not get treated like malware bait just because it mentions Terminal once

More details: [docs/false-positives.md](docs/false-positives.md)

## Threat model

Read this before treating the extension like some universal shield:

[docs/threat-model.md](docs/threat-model.md)

## Roadmap

A few obvious next steps:

* better Firefox packaging
* more resilient copy-neighbor extraction on heavily scripted pages
* optional rules for fake extension-install scams
* better per-site suppression controls
* lightweight rule updates with an actual changelog process

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

A few rules matter here:

* keep patches small
* keep heuristics explainable
* do not dump in giant generic signature lists just to inflate detections
* if a rule is noisy, fix it properly instead of hiding the problem behind more complexity

## Security

See [SECURITY.md](SECURITY.md) for disclosure rules.

## License

[MIT](LICENSE)

## Maintainer note

This repo is meant to behave like a small practical security tool.

Not a chrome-extension-themed landing page.
Just a focused utility that solves one real problem.

Primary org: [Nullbit1](https://github.com/Nullbit1)
Maintainer: [Wythwool](https://github.com/Wythwool)`
