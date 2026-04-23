# Detection heuristics

PasteTrap is rule-based. The detector does not try to decide whether a website is “good” or “bad” as a whole. It scores concrete evidence from the current page and the command-like content found on it.

## Inputs

The collector reads:

- page title and meta description;
- visible body text, with text-content fallback for hidden/lazy sections;
- buttons, links, dialogs and ARIA labels;
- code blocks, textareas, keyboard snippets and command-like containers;
- suspicious data/onclick/copy attributes;
- open shadow DOM text;
- iframe descriptors;
- canvas, image, video and audio descriptors;
- clipboard-like payloads observed from copy/click flows;
- copy buttons near command-like content.

Content scripts run with `all_frames` and `match_about_blank`, so each frame gets scanned in its own context when Chromium allows it.

## Page signals

Page wording is matched in English, Russian, Ukrainian and Spanish. Current page-signal groups include:

- fake verification and anti-bot language;
- terminal or Run dialog instructions;
- copy, paste and Enter wording;
- fake update and support pressure;
- imperative open/copy/paste/run sequences;
- terminal name drops;
- iframe verification bait;
- shadow DOM bait;
- canvas/media verification bait;
- benign developer-documentation context.

The matcher skips nearby negated wording such as “not”, “no”, “без”, “немає” and “sin” so docs that explain what not to do are less noisy.

## Command signals

Commands are extracted from code blocks, copy-neighbor containers, attributes, inline text and clipboard-like payloads. The extractor currently recognizes:

- PowerShell and `pwsh` chains;
- `cmd /c` launchers;
- `curl`, `wget`, `bash`, `sh`, `zsh` wrappers;
- `mshta`, `rundll32`, `regsvr32`, `certutil`, `bitsadmin`, `wmic`, `schtasks`;
- `osascript` and `launchctl`;
- Python and Perl remote execution patterns;
- remote URLs and common shorteners;
- base64, PowerShell encoded commands, `FromBase64String`, string joining and escapes;
- temp-path download/write/execute chains.

A command candidate is redacted before it is displayed in UI or logs.

## Scoring

Every rule adds or subtracts weight. Sensitivity profiles apply a multiplier:

- `low`: fewer warnings;
- `balanced`: default;
- `strict`: earlier warnings.

Compound bonuses raise confidence when several independent signals appear together, for example fake verification plus remote execution, terminal instructions plus clipboard bait, or clipboard payload plus social-engineering wording.

Developer-documentation context can reduce noise, but it does not hide real execution signals such as encoded payloads, remote download execution or clipboard payload commands.

## Suppressions

Suppressions are per host/path/category. They are applied after page and command matches are built, before scoring. They are safer than broad trust because one noisy category can be suppressed while the rest of the detector stays active.

## Regression corpus

The corpus in `tests/fixtures/rule-corpus` tracks false-positive and false-negative examples. Add a fixture whenever a rule changes or a real-world page needs to be pinned.

## Rule-pack manifest

`src/shared/detection/rulePack.ts` exposes a local bundled rule-pack manifest with version, channel, rule count and hash. It is ready for signed-rule-pack discipline without requiring a remote update channel in the current release.
