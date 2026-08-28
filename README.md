# Dota Tier 1 Tournament Bot

A Discord platform for discovering, preparing, activating, and covering Tier 1 Dota 2 tournaments.

## Requirements

- Node.js 22 or newer
- Discord application credentials
- Steam API key
- A descriptive Liquipedia user agent

## Install or update

1. Stop the bot.
2. Copy the release files over the existing project.
3. Preserve `.env`, `data/`, `assets/`, and `node_modules/`.
4. Run `npm install --package-lock-only` when package metadata changes.
5. Run `npm run register` only when slash-command definitions change.
6. Run `npm run validate-platform`.
7. Start with `npm start`.

## Platform capabilities

- Tier 1 tournament discovery through OpenDota and Liquipedia
- Main-event, qualifier, and play-in relationships
- Catalog-driven tournament selection and lifecycle handling
- Tournament-aware schedule, results, teams, heroes, and bracket views
- Generic Valve, OpenDota, and Liquipedia adapters
- Tournament-scoped coverage workers in observation mode
- Team identity, logo, and Discord emoji preparation
- Provider-ID candidate scoring with ambiguity protection
- Shared Liquipedia throttling, persistent HTTP 429 cooldown, and stale-cache fallback
- Public platform status and private administrator diagnostics
- Offline release validation and tournament lifecycle simulation

## Commands

User commands:

`/today`, `/next`, `/standings`, `/match`, `/results`, `/heroes`, `/series`, `/bracket`, `/tournaments`, `/tournament-info`, `/teams`, `/platform`, `/bot-status`

Operational commands:

`/coverage`, `/diagnostics`, `/tournament-info-debug`, `/simulate-tournament`

Core information commands support tournament selection. When no tournament is selected, the bot prefers the most relevant active or upcoming main event.

## Validation

Run:

```bat
npm run validate-platform
```

This performs syntax checks, automated tests, release validation, and an offline synthetic tournament lifecycle simulation. The simulation sends no Discord messages and does not modify the production tournament catalog.

See `docs/OPERATIONS.md` for operational guidance and `CHANGELOG.md` for release history.
