# Privacy

PasteTrap keeps data local.

## What is stored

In extension storage only:

- settings
- trusted domains
- session ignores
- local logs
- latest scan state per tab

## What local logs contain

- timestamp
- domain and URL
- page title
- score and risk level
- matched rule ids
- redacted command preview if one exists
- user action such as overlay shown or trust domain

## What is not stored

- full raw commands unless they already fit inside the redacted preview
- cookies
- page screenshots
- browsing history beyond the minimal current-page scan state
- account identifiers

## What is never uploaded

Everything.

There is no backend, no telemetry endpoint, no analytics SDK and no account system.

## Clearing data

From the options page you can:

- clear logs
- clear session ignores
- export and re-import settings
- remove trusted domains one by one

You can also remove the extension and let the browser wipe its storage.
