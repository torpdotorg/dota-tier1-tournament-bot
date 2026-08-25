export function discordTimestamp(date, style = 'f') {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

export function dayBoundsUtc(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((o, p) => ({ ...o, [p.type]: p.value }), {});
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  // Wide UTC window; results are filtered again using the requested timezone.
  return { start: `${localDate}T00:00:00Z`, end: `${localDate}T23:59:59Z`, localDate };
}

export function isTodayInZone(value, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' });
  return fmt.format(new Date(value)) === fmt.format(new Date());
}

export function teamName(opponent) {
  return opponent?.opponent?.name || 'TBD';
}

export async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    return await response.json();
  } catch (error) {
    const host = new URL(url).hostname;
    const causeCode = error?.cause?.code || error?.code;
    if (error?.name === 'AbortError' || causeCode === 'UND_ERR_CONNECT_TIMEOUT') {
      throw new Error(`Temporary connection timeout from ${host}`, { cause: error });
    }
    if (error instanceof TypeError && String(error.message).includes('fetch failed')) {
      throw new Error(`Temporary network failure while contacting ${host}`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
