const childPattern = /\b(qualifier|play[- ]?in|showmatch)\b/i;
const rejectPattern = /\b(test event|scrim|pubstomp|streamer battle)\b/i;
const DAY = 86_400_000;

export function eventType(name = '') {
  if (/\bplay[- ]?in\b/i.test(name)) return 'play-in';
  if (/\bqualifier\b/i.test(name)) return 'qualifier';
  if (/\bshowmatch\b/i.test(name)) return 'showmatch';
  return 'main';
}

export function withinDiscoveryHorizon(candidate, now = Date.now(), { pastDays = 30, futureDays = 120 } = {}) {
  const start = Date.parse(`${candidate.startDate || ''}T00:00:00Z`);
  const end = Date.parse(`${candidate.endDate || candidate.startDate || ''}T23:59:59Z`);
  if (!Number.isFinite(start) && !Number.isFinite(end)) return false;
  return (Number.isFinite(end) ? end : start) >= now - pastDays * DAY &&
    (Number.isFinite(start) ? start : end) <= now + futureDays * DAY;
}

export function scoreTournament(candidate, {
  knownTeams = 0,
  proMatches = 0,
  hasSchedule = false,
  providerAgreement = 1
} = {}) {
  let score = 0;
  const reasons = [];

  if (candidate.leagueId) { score += 15; reasons.push('league ID'); }
  if (candidate.startDate && candidate.endDate) { score += 10; reasons.push('date range'); }
  if (hasSchedule) { score += 20; reasons.push('schedule'); }
  if (knownTeams >= 8) { score += 20; reasons.push('eight or more teams'); }
  else if (knownTeams >= 4) score += 8;
  if (proMatches >= 6) { score += 20; reasons.push('professional matches'); }
  else if (proMatches > 0) score += 8;
  if (providerAgreement >= 2) { score += 10; reasons.push('provider agreement'); }
  if (candidate.verifiedTierOne) { score += 35; reasons.push('verified Tier 1'); }
  if (candidate.verifiedTierOneChild && candidate.parentTournamentId) {
    score += 30;
    reasons.push('verified Tier 1 child event');
  }
  if (rejectPattern.test(candidate.name || '')) { score -= 60; reasons.push('excluded event type'); }
  if (childPattern.test(candidate.name || '') && !candidate.parentTournamentId) {
    score -= 45;
    reasons.push('unlinked child event');
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function classifyTournament(candidate, context = {}, now = Date.now()) {
  const result = scoreTournament(candidate, context);
  const start = Date.parse(`${candidate.startDate || ''}T00:00:00Z`);
  const end = Date.parse(`${candidate.endDate || candidate.startDate || ''}T23:59:59Z`);
  let state = result.score >= 60 ? 'upcoming' : 'monitoring';

  if (Number.isFinite(end) && end < now) state = 'completed';
  else if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)) {
    state = result.score >= 60 ? 'active' : 'monitoring';
  }
  if (rejectPattern.test(candidate.name || '')) state = 'rejected';
  if (childPattern.test(candidate.name || '') && !candidate.parentTournamentId) state = 'rejected';

  return {
    ...result,
    eventType: candidate.eventType || eventType(candidate.name),
    state,
    eligible: result.score >= 80 && !['completed', 'rejected'].includes(state),
    inHorizon: withinDiscoveryHorizon(candidate, now)
  };
}
