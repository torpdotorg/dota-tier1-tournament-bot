const adapters = new Map();
export function registerTournamentAdapter(adapter) {
  if (!adapter?.name) throw new Error('Tournament adapter requires a name');
  adapters.set(adapter.name, adapter);
  return adapter;
}
export function listTournamentAdapters() { return [...adapters.values()]; }
export function resolveTournamentAdapter(context) {
  return listTournamentAdapters().find(adapter => adapter.supports(context)) || null;
}
export function clearTournamentAdapters() { adapters.clear(); }

export function resolveTournamentCapability(context, capability) {
  return listTournamentAdapters().find(adapter => adapter.supports(context) && adapter.capabilities?.(context)?.[capability]) || null;
}
