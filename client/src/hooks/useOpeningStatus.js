import { useEffect, useMemo, useState } from 'react';

/*
 * The business's ordering availability, read on its own clock.
 *
 * The public payload already resolves today's open/closed verdict on the
 * server, but a guest can keep the menu open across the opening or closing
 * minute — so the same schedule (`business.working_hours`) is evaluated in the
 * business timezone here as well, on a light 30-second tick. That is what lets
 * a closed panel re-enable itself the moment the business opens, without a
 * reload.
 *
 * States:
 *   open        — inside today's trading range
 *   before      — today, earlier than the saved opening time
 *   after       — today, later than the saved closing time
 *   holiday     — the day is switched off in Working Hours (an off day)
 *   no_schedule — no usable schedule for today (missing day or bad times)
 *
 * A business that never saved working hours is never gated: with no schedule to
 * judge, the menu keeps ordering exactly as before.
 */

const WEEKDAY = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };
const TICK_MS = 30 * 1000;

function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Current wall clock inside the business timezone, never the browser's. */
function zonedClock(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value;
    const dayKey = WEEKDAY[get('weekday')];
    if (!dayKey) return null;
    return { dayKey, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
  } catch {
    return null;
  }
}

export function openingStatus(workingHours, timeZone) {
  const configured = Boolean(
    workingHours && typeof workingHours === 'object' && Object.keys(workingHours).length > 0,
  );
  if (!configured) return { state: 'open', closed: false, configured: false };

  const clock = zonedClock(timeZone);
  if (!clock) return { state: 'no_schedule', closed: true, configured: true };

  const day = workingHours[clock.dayKey];
  if (!day || typeof day !== 'object') {
    return { state: 'no_schedule', closed: true, configured: true, dayKey: clock.dayKey };
  }

  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const range = { configured: true, dayKey: clock.dayKey, open: day.open || '', close: day.close || '' };

  if (day.closed) return { state: 'holiday', closed: true, ...range };
  if (open === null || close === null) return { state: 'no_schedule', closed: true, ...range };

  /* A range that ends at or before it starts runs past midnight, so the small
     hours of the next calendar day still belong to this service. */
  const overnight = close <= open;
  const isOpen = overnight
    ? clock.minutes >= open || clock.minutes <= close
    : clock.minutes >= open && clock.minutes <= close;
  if (isOpen) return { state: 'open', closed: false, ...range };

  const before = overnight
    ? clock.minutes > close && clock.minutes < open
    : clock.minutes < open;
  return { state: before ? 'before' : 'after', closed: true, ...range };
}

export default function useOpeningStatus(workingHours, timeZone) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return useMemo(
    () => openingStatus(workingHours, timeZone),
    // `tick` is the input that makes the evaluation run again over time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workingHours, timeZone, tick],
  );
}
