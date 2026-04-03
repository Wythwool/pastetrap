# False positives

This extension will false-positive sometimes. That is not a bug by itself. The question is whether the friction is manageable and explainable.

## Built-in pressure release

- Ignore once for the current page during the current browser session
- Trust domain for sites you control or already know
- Toggle whole categories off
- Switch sensitivity profile
- Read the technical reasons before deciding the warning is wrong

## Common benign pages that may look suspicious

- internal runbooks that mention PowerShell or Terminal a lot
- developer docs with copy buttons
- software install pages with shell snippets
- admin panels that expose command examples for real maintenance work

## When to trust a domain

Trusting a domain makes sense when:

- you own it
- you administer it
- you already audited the docs there
- repeated prompts are slowing down real work

Do not trust a domain just because one page told you to.

## When to open a false positive issue

Open one if you can show:

- the page is benign
- the hit is reproducible
- the rule is noisy in a way that should be fixed, not just suppressed locally

Include the redacted command preview if one was shown, plus the matched rule titles.


## Docs downgrade path

There is a specific downgrade for boring developer pages that look like docs instead of bait.

It only applies when the page looks like installation or documentation material and does not also hit the uglier signals like fake verification, encoded payloads, pipe-to-shell chains or Windows LOLBins.

That downgrade exists because a browser extension that screams at every `brew install` snippet is useless after one day.
