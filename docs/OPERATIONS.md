# Operations

## Routine validation

- Run `npm run release-check` after every update.
- Use `/diagnostics` to verify discovery providers, preparation, activation, runtime, and workers.
- Use `/tournaments` to inspect lifecycle decisions.
- Use `/coverage` to inspect active runtimes and workers.

## Expected no-tournament state

- Active coverage: 0
- Coverage runtime running: 0
- Generic workers observing/publishing: 0
- Upcoming events may remain awaiting provider ID or preparation

## Safety

Generic workers remain in observation mode. A provider outage moves the worker to degraded state without public messages. Completed tournaments retain archived messages but stop scheduled workers.

## Completed configured tournament

When the configured tournament is complete, the legacy scheduler is not started. Archived commands and messages remain available while discovery, preparation, activation, runtime reconciliation, and generic workers continue.

## Generic adapter validation

When a future tournament gains a league ID and reaches active coverage, `/coverage` should show an observing worker using `opendota-context`. A provider failure should show `degraded` and must not publish Discord messages.

## Synthetic lifecycle validation

Use `npm run validate-platform` after architecture changes. The simulation must report all nine lifecycle stages, zero public messages, and a final worker state of `stopped`. The private `/simulate-tournament` command provides the same validation from Discord without channel spam.
