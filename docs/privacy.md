# Privacy

PasteTrap is designed to run locally.

## What is stored

The extension stores only browser-profile data:

- settings schema version;
- language and sensitivity;
- enabled detection categories;
- trusted-site rules;
- per-site suppressions;
- session ignore keys;
- local scan/action logs.

Logs contain redacted command previews, matched rule IDs, score, domain, URL, timestamp and user action. The log limit is clamped by the settings schema.

## What is not collected

PasteTrap does not collect:

- accounts;
- telemetry;
- analytics events;
- page contents on a server;
- browsing history outside local extension state;
- remote rule update requests.

## Clipboard handling

PasteTrap does not need clipboard read permission. It observes copy/click flows and command-like copy attributes visible to the content script. If text is selected during a copy event, a truncated local preview can be used for detection. It stays in memory for the current content-script context and is not uploaded.

## Deleting data

Use the options page to clear logs or session ignores. Trusted sites and suppressions can be removed individually from the options page.
