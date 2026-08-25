# Dota Tier 1 Tournament Bot

A Discord platform for discovering, preparing, activating, and covering Tier 1 Dota 2 tournaments.

## Install or update

1. Stop the bot.
2. Extract the release over the existing project.
3. Preserve `.env`, `data/`, `assets/`, and `node_modules/`.
4. Run `npm run register` when commands changed.
5. Run `npm run release-check`.
6. Run `npm start`.

## Current platform layers

- Tier 1 discovery through configured, OpenDota, and Liquipedia sources
- Qualifier, play-in, and showmatch linking
- Team, logo, and Discord emoji preparation
- Activation and completion lifecycle
- Catalog-driven runtime registry
- Generic coverage worker framework
- Automatic retirement of completed legacy tournament schedulers
- Private diagnostics and release validation

## Commands

`/today`, `/next`, `/standings`, `/match`, `/results`, `/heroes`, `/series`, `/bracket`, `/tournaments`, `/coverage`, `/bot-status`, `/diagnostics`

See `docs/OPERATIONS.md` for operational checks and `CHANGELOG.md` for release history.

## Platform simulation

Run `npm run simulate-tournament` for an offline synthetic lifecycle test. Run `npm run validate-platform` for release validation followed by simulation. The simulator does not post to Discord or alter the production tournament catalog.

## Tournament-aware commands

Core information commands accept an optional autocomplete `tournament` parameter. Omit the option to use the most relevant active or upcoming event. Select The International 2026 to access archived TI data.
