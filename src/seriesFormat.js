export function normalizeSeriesFormat({ bestOf = null, seriesType = null, stage = '' } = {}) {
  const scheduled = Number(bestOf);
  let games = [1, 2, 3, 5].includes(scheduled) ? scheduled : null;
  let source = games ? 'Valve schedule' : null;

  if (!games && seriesType !== null && seriesType !== undefined) {
    const type = Number(seriesType);
    const openDotaMap = { 0: 1, 1: 3, 2: 5 };
    games = openDotaMap[type] || null;
    if (games) source = 'OpenDota series type';
  }

  if (!games && /grand final/i.test(String(stage))) {
    games = 5;
    source = 'TI playoff fallback';
  } else if (!games && /(upper|lower|playoff|quarterfinal|semifinal|final)/i.test(String(stage))) {
    games = 3;
    source = 'TI playoff fallback';
  }

  if (!games) return { bestOf: null, label: null, winsNeeded: null, fixedGames: null, source: null };
  if (games === 2) return { bestOf: 2, label: 'Bo2', winsNeeded: null, fixedGames: 2, source };
  return { bestOf: games, label: `Bo${games}`, winsNeeded: Math.ceil(games / 2), fixedGames: null, source };
}

export function seriesProgress({ scoreA = 0, scoreB = 0, gameNumber = null, format = null } = {}) {
  const a = Number(scoreA || 0);
  const b = Number(scoreB || 0);
  const nextGame = Number(gameNumber || (a + b + 1));
  if (!format?.bestOf) return { nextGame, label: `Game ${nextGame}`, decider: false, complete: false };
  const complete = format.bestOf === 2 ? a + b >= 2 : Math.max(a, b) >= format.winsNeeded;
  const decider = !complete && (
    (format.bestOf === 3 && a === 1 && b === 1) ||
    (format.bestOf === 5 && a === 2 && b === 2)
  );
  return { nextGame, label: decider ? `Deciding Game ${nextGame}` : `Game ${nextGame} of ${format.label}`, decider, complete };
}
