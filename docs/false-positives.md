# False positives

PasteTrap is deliberately cautious around copy/run flows. Normal developer docs can still look suspicious when they contain shell snippets and copy buttons.

## What to do first

Use the popup to rescan. The popup waits for scan completion before showing refreshed state, so stale results should be rare.

Then check the matched rules. If the page is normal documentation and the rule is only a wording rule, prefer a suppression over broad trust.

## Prefer suppressions over trust

A suppression disables one category for one host/path:

- `docs.example.org/install` + `fake-verification`;
- `internal.example.org/tools` + `terminal-invocation`.

Command-chain rules remain active unless they are explicitly suppressed.

## Use trust only when the whole scope is safe

Trusted-site rules are exact by default:

- exact host: `docs.example.org`;
- path only: `docs.example.org/install`;
- subdomains only when the checkbox is enabled.

Avoid trusting a root domain when only one docs path is noisy.

## Reporting a bad detection

Include:

- URL and path;
- matched rules;
- risk level;
- redacted command preview if present;
- whether the page uses iframe, shadow DOM or lazy loading.

Do not paste live malicious payloads into an issue without redaction.
