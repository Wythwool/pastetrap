# Threat model

PasteTrap focuses on social-engineering pages that trick users into copying and running commands outside the browser.

## In scope

- Fake CAPTCHA and fake verification pages.
- ClickFix-style flows.
- Fake browser update and support-session bait.
- Commands delivered through visible text, code blocks, copy buttons and attributes.
- Clipboard-like payloads exposed by click/copy flows.
- Open shadow DOM rendering.
- Lazy-loaded SPA content and route changes.
- Iframe delivery, with each accessible frame scanned by the content script.
- Long pages and delayed DOM insertion.
- Common Windows, Unix and macOS command chains.

## Out of scope

- Full malware classification.
- Network reputation.
- Closed shadow roots.
- Cross-origin frame internals that the browser does not expose to the current context.
- OCR of image-only payloads.
- Guaranteed detection of every obfuscated or staged clipboard attack.
- Enterprise policy management.

## Assets protected

- User attention before a command leaves the browser.
- Local browser profile settings and logs.
- Trust decisions made by the user.

## Main failure modes

1. **False positive on documentation.** Mitigated with developer-doc context, category suppressions and exact/path trust.
2. **False negative through evasive rendering.** Mitigated with all-frame scans, open shadow DOM collection, mutation debounce and regression corpus.
3. **Broad user trust.** Mitigated by exact-host default, path rules and UI labels showing what is trusted.
4. **Stale popup state.** Mitigated by the rescan handshake: trigger, scan done, state saved, popup refreshed.
5. **Performance on heavy SPAs.** Mitigated by mutation filtering, debounce, settings cache and scan budget warnings.

## Privacy stance

The extension is local-only. Page content is analyzed in the browser and is not uploaded.
