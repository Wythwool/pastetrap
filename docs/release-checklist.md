# Release checklist

## Before tagging

- Update `CHANGELOG.md`
- Run `npm run check`
- Run `npm run package`
- Test overlay behavior on all malicious demo pages
- Test benign demo pages and confirm they do not trigger high or critical
- Export settings and logs once to verify file format still works

## Before publishing a zip

- Open the built extension in a clean browser profile
- Check popup, options page and demo pages manually
- Verify trusted domains survive reload
- Verify session ignores do not survive a full browser restart if `storage.session` is available
- Re-open `dist/manifest.json` and inspect permissions

## Docs

- Update heuristics docs if a rule changed
- Update threat model if the product boundary changed
- Replace placeholder screenshots if you have real captures
