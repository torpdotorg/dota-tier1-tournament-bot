# Release Checklist
1. Update `package.json` and `package-lock.json` to the same version.
2. Run `npm run release-check`.
3. Confirm zero failed tests.
4. Inspect the full ZIP structure.
5. Preserve runtime data and secrets during deployment.
6. Run `npm run register` only when commands changed.
