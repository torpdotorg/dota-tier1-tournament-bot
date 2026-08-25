export function validParticipants(participants = []) {
  return (Array.isArray(participants) ? participants : [])
    .filter(team => team?.teamId && team?.name)
    .map(team => ({ teamId: String(team.teamId), name: String(team.name).trim() }));
}

export function participantSignature(participants = []) {
  return validParticipants(participants)
    .map(team => team.teamId)
    .sort()
    .join('|');
}

export function shouldSkipPreparedTournament(event, { force = false } = {}) {
  if (force || event.state === 'completed' || event.preparationState !== 'ready') return false;
  const participants = validParticipants(event.participants);
  if (!participants.length) return false;
  const currentSignature = participantSignature(participants);
  const preparedSignature = String(event.preparedParticipantSignature || '');
  return Boolean(preparedSignature) && preparedSignature === currentSignature;
}
