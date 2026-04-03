# Changelog

## 0.1.1

Tightened a few parts that were too neat on the first cut.

- popup now opens logs and settings as different targets instead of dumping both into the same action
- runtime messaging is typed by message kind instead of accepting blind unknown payloads and casting the answer on faith
- added a docs downgrade path so normal install guides and developer docs do not light up just because they mention Terminal once
- added router and page-level integration tests instead of only happy-path pure-function coverage
- packaged output no longer preserves one obvious linear timestamp pattern

## 0.1.0

Initial public cut.

- MV3 browser extension with local-only heuristics
- Page signal matching and command extraction
- Explainable scoring with low, balanced and strict profiles
- High and critical overlay warning flow
- Popup and options pages
- Local logs with redacted command previews
- Trusted domains and session ignores
- English and Russian UI
- Demo pages and baseline docs
