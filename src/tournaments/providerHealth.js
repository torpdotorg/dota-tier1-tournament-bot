const providers = new Map();
export function setProviderHealth(name, status, detail = null) {
  const previous = providers.get(name);
  const changed = !previous || previous.status !== status;
  providers.set(name, { name, status, detail, updatedAt: new Date().toISOString() });
  if (changed && previous) console.log(`[Discovery] ${name} ${status === 'healthy' ? 'recovered' : `is ${status}`}${detail ? `: ${detail}` : ''}.`);
}
export function providerHealthSummary() { return [...providers.values()]; }
