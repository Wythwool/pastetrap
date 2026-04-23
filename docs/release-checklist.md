# Release checklist

1. Update `package.json` version.
2. Add a changelog entry.
3. Run `npm install` after dependency changes.
4. Run `npm run release:check`.
5. Run `npm run e2e` in a Chromium-capable environment.
6. Run `npm run screenshots` when store screenshots need a refresh.
7. Run `npm run package`.
8. Verify `release/pastetrap-<version>.zip` and the matching `.release.json` SHA-256 metadata.
9. Load the ZIP contents as an unpacked extension for a final smoke pass.
10. Submit with the current privacy and store notes.

The CI workflow runs lint, typecheck, tests, build, smoke and e2e. The manual release workflow can optionally apply a version before packaging.
