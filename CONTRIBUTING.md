# Contributing

## Ground rules

- Keep the scope local-first
- No backend hooks, telemetry or cloud lookups
- Do not add fuzzy black-box logic where a readable heuristic would do
- Avoid permission creep in the manifest
- Keep UI copy direct and short

## Setup

```bash
npm install
npm run check
```

## Before opening a pull request

- Run `npm run check`
- Test at least one benign demo page and one malicious demo page
- If you add or change a rule, update `docs/heuristics.md`
- If your change affects warning behavior, update or add tests

## Heuristic changes

Every new rule needs three things:

1. A clear reason for existing
2. A realistic test case
3. A note about what benign pages might trip it

If a rule cannot be explained in plain language, it probably does not belong here.

## UI changes

Keep the UI strict and boring in a good way. No flashy gradients, no fake hacker vibes, no cartoon danger styling.
