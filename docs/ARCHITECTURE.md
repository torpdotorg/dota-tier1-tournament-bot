# Architecture

## Lifecycle

`Discovery → Preparation → Activation → Runtime → Worker → Completion`

## Runtime safety

Activated tournaments receive a runtime descriptor. A worker starts only when a registered provider adapter supports the tournament and passes validation. Workers default to observation mode (`publish: false`). Public posting is enabled only in a later release after end-to-end validation.

## Provider adapters

Adapters normalize schedule, standings, live games, and results behind one interface. The configured TI adapter preserves historical compatibility. Fixture adapters support synthetic lifecycle tests. Future Valve/OpenDota adapters will use the tournament context and league ID instead of global TI configuration.

## Persistence

Tournament catalog records hold lifecycle and worker state. Notification keys must use `tournament:<id>:<scope>:<entity>`.

## Contextual OpenDota adapter

For non-configured tournaments with a league ID, the OpenDota context adapter filters professional matches by league and normalizes schedule/results for generic workers. Live-feed and bracket coverage remain unavailable until a compatible context-aware Valve adapter is added.

## Simulation engine

The simulation engine exercises the generic lifecycle without writing to the production catalog or Discord. A fixture adapter supplies schedule, live game, and result transitions to an observing coverage worker.

## Command context

Slash commands resolve a tournament from the catalog and route through the matching adapter. Contextual commands avoid falling back to TI data for unconfigured tournaments. Missing provider capabilities return factual private messages rather than fabricated data.
