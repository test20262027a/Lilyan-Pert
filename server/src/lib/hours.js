const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Current wall-clock time inside the business timezone, without extra deps.
 */
export function zonedNow(timeZone = 'UTC') {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date());
  } catch {
    return null;
  }
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const weekdayShort = get('weekday');
  const map = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };
  return {
    dayKey: map[weekdayShort],
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/**
 * Authoritative open/closed calculation. When the working-hours data is
 * missing or malformed we report `valid: false` and treat the business as
 * closed — we never infer that it is open.
 */
export function openStatus(workingHours, timeZone) {
  const now = zonedNow(timeZone);
  if (!now) return { valid: false, is_open: false, reason: 'BAD_TIMEZONE' };
  const day = workingHours?.[now.dayKey];
  if (!day || typeof day !== 'object') {
    return { valid: false, is_open: false, reason: 'NO_HOURS', day: now.dayKey };
  }
  if (day.closed) return { valid: true, is_open: false, reason: 'CLOSED_TODAY', day: now.dayKey };
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  if (open === null || close === null) {
    return { valid: false, is_open: false, reason: 'INVALID_HOURS', day: now.dayKey };
  }
  const mins = now.hour * 60 + now.minute;
  const overnight = close <= open;
  const isOpen = overnight ? mins >= open || mins <= close : mins >= open && mins <= close;
  return {
    valid: true,
    is_open: isOpen,
    reason: isOpen ? 'OPEN' : 'OUTSIDE_HOURS',
    day: now.dayKey,
    open: day.open,
    close: day.close,
    local_time: `${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`,
  };
}
