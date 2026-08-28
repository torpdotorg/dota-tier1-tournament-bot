# Changelog

## v2.3.5 - 28.08.2026

- Consolidated the generic multi-tournament runtime into one stable release baseline
- Updated package and lockfile metadata to v2.3.5
- Simplified startup and status wording after removal of the retired TI-specific runtime
- Updated README documentation for the current catalog-driven platform
- Expanded release validation for provider resolution, shared Liquipedia throttling, and catalog schema 6
- Removed obsolete documentation references to archived TI command behavior

## v2.3.0-v2.3.4 - 26.08.2026 to 28.08.2026

- Added safe provider-ID candidate scoring without automatic assignment
- Added provider-resolution diagnostics and best-rejected candidate evidence
- Added Liquipedia external-link and Steam league-listing candidate discovery
- Added candidate-source visibility to `/platform`
- Added shared Liquipedia request coordination across catalog discovery, structure parsing, and provider-ID discovery
- Added persistent HTTP 429 cooldown across bot restarts
- Added cached and stale-cache fallbacks during provider outages and cooldowns
- Preserved the existing tournament catalog when live discovery is unavailable
- Added catalog schema 6 and persistence of current provider-resolution evidence

## v2.2.0-v2.2.6 - 26.08.2026

- Removed the TI-specific configured runtime and legacy scheduler
- Made Valve, Steam, OpenDota, and Liquipedia access tournament-contextual
- Made `/match` and `/heroes` tournament-aware
- Prevented cross-tournament fallback to archived TI data
- Preferred upcoming main events over qualifiers for automatic command context
- Grouped discovery output into main events and qualifiers/play-ins
- Improved unpublished teams, bracket, and schedule messages
- Added the public `/platform` operational-status command
- Added catalog, provider, preparation, and coverage health reporting

## v2.1.0-v2.1.4 - 24.08.2026

- Added tournament information, teams, bracket, and structure-debug commands
- Added real Liquipedia tournament-page parsing
- Added participant-slot and qualifier-source extraction
- Added bracket topology extraction and grouped round presentation
- Added structure caching, raw-page capture, compatibility support, and regression tests

## v2.0.0 - 24.08.2026

- Added tournament selection with autocomplete to core information commands
- Resolved command context from the tournament catalog
- Added contextual schedule, next-series, and results views
- Added factual unavailable-state messages for unsupported capabilities
- Kept slash-command responses private

## v1.6.0-v1.9.0 - 24.08.2026

- Added autonomous preparation, activation, lifecycle alignment, and provider isolation
- Added tournament-scoped runtime and worker infrastructure
- Added generic adapters and observation-mode workers
- Added the offline tournament lifecycle simulator and full platform validation
