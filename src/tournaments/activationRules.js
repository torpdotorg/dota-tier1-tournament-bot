const DAY = 86_400_000;

function atStartOfDay(value) {
  const parsed = Date.parse(`${value || ''}T00:00:00Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function atEndOfDay(value) {
  const parsed = Date.parse(`${value || ''}T23:59:59Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function activationDecision(event, now = Date.now(), { activationWindowHours = 48 } = {}) {
  const start = atStartOfDay(event.startDate);
  const end = atEndOfDay(event.endDate || event.startDate);
  const child = event.eventType && event.eventType !== 'main';
  const threshold = child ? 70 : 80;

  if (Number.isFinite(end) && end < now) {
    return { state: 'completed', eligible: false, reason: 'Tournament date range has ended' };
  }
  if (event.state === 'rejected' || event.state === 'completed') {
    return { state: event.state === 'completed' ? 'completed' : 'blocked', eligible: false, reason: `Tournament state is ${event.state}` };
  }
  if (event.preparationState !== 'ready') {
    return { state: 'waiting-preparation', eligible: false, reason: 'Tournament preparation is not ready' };
  }
  if (Number(event.score || 0) < threshold) {
    return { state: 'blocked-confidence', eligible: false, reason: `Confidence below ${threshold}/100` };
  }
  if (!event.leagueId) {
    return { state: 'blocked-provider', eligible: false, reason: 'No Valve/OpenDota league ID' };
  }
  if (!event.hasSchedule) {
    return { state: 'blocked-schedule', eligible: false, reason: 'No reliable schedule available' };
  }
  if (Number(event.preparedTeamCount || 0) < 2) {
    return { state: 'blocked-teams', eligible: false, reason: 'Prepared participant set is incomplete' };
  }
  if (!Number.isFinite(start)) {
    return { state: 'blocked-dates', eligible: false, reason: 'Tournament start date is unavailable' };
  }

  const activationAt = start - activationWindowHours * 60 * 60 * 1000;
  if (now < activationAt) {
    return {
      state: 'ready-outside-window',
      eligible: false,
      reason: `Activation begins ${activationWindowHours} hours before start`,
      activationAt: new Date(activationAt).toISOString()
    };
  }

  return {
    state: 'active-coverage',
    eligible: true,
    reason: 'Preparation, confidence, provider identity and schedule requirements satisfied',
    activatedAt: new Date(now).toISOString()
  };
}
