# Changelog

## v2.0.0 — 24.08.2026

- Added tournament selection with autocomplete to `/today`, `/next`, `/standings`, `/results`, `/series`, and `/bracket`
- Commands resolve tournament context from the catalog instead of assuming TI 2026
- Added contextual schedule, next-series, and results views
- Preserved archived TI command behavior when TI 2026 is selected
- Added factual unavailable-state messages when a selected tournament lacks a required adapter
- Kept all slash-command responses private

## v1.9.0 — 24.08.2026

- Added a synthetic end-to-end tournament lifecycle simulator
- Validates discovery-ready data, activation, runtime, worker observation, live series, results, and completion
- Added `npm run simulate-tournament`
- Added `npm run validate-platform` to run release checks and the full simulation
- Added private `/simulate-tournament` administrator command
- Simulation sends zero public Discord messages
- Added reusable fixture data and lifecycle regression tests

## v1.8.2 — 24.08.2026

- Added a contextual OpenDota adapter for non-configured tournaments with a league ID
- Normalized tournament schedules and completed results behind the generic adapter contract
- Added one-minute provider caching to reduce duplicate OpenDota requests
- Generic workers now perform observation polling after successful startup
- Added degraded-worker visibility to `/coverage` and `/diagnostics`
- Kept generic workers non-publishing until real event validation is complete

## v1.8.1 — 24.08.2026

- Retired the legacy configured-tournament scheduler after tournament completion
- Prevented creation of idle TI polling timers
- Replaced TI-specific console and bot-status wording with platform wording
- Marked the configured tournament as archived in diagnostics
- Generalized slash-command descriptions
- Continued the consolidated documentation policy with no version-specific README files

## v1.8.0 — 24.08.2026

- Added generic tournament provider adapter contract
- Added per-tournament coverage workers in observation mode
- Added adapter registry and safe degraded state
- Added tournament-scoped worker message keys
- Expanded `/coverage` and `/diagnostics` with worker state
- Consolidated release documentation into `README.md`, `CHANGELOG.md`, and `docs/`
- Removed version-specific README files from release packages

## v1.7.1 — 24.08.2026

- Aligned completed tournament states
- Stopped scheduled posts and polling after tournament completion
- Archived persistent bracket and series messages

## v1.7.0 — 24.08.2026

- Added catalog-driven coverage runtime registry
- Added tournament-scoped message namespaces
- Added `/coverage`

## v1.6.x — 24.08.2026

- Added automatic activation lifecycle
- Added provider isolation and recovery
- Added participant persistence and preparation safety
