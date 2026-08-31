// src/lib/dateUtils.js

const EASTERN_TZ = 'America/New_York';

/**
 * Returns today's date string formatted as YYYY-MM-DD in Ohio Eastern Time
 */
export function getEasternDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date); // Outputs 'YYYY-MM-DD'
}

/**
 * Returns the exact ISO string for midnight Eastern Time with explicit timezone offset.
 * Example for August 30 EDT: "2026-08-30T00:00:00.000-04:00"
 */
export function getEasternStartOfDayISO(date = new Date()) {
  const dateStr = getEasternDateStr(date);

  // Determine whether Eastern Time is currently EDT (-04:00) or EST (-05:00)
  const isEDT = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    timeZoneName: 'short',
  })
    .format(date)
    .includes('EDT');

  const offset = isEDT ? '-04:00' : '-05:00';

  return `${dateStr}T00:00:00.000${offset}`;
}

/**
 * Returns current hour (0-23) and day of week (0=Sun, 6=Sat) in Eastern Time
 */
export function getEasternTimeDetails(date = new Date()) {
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    hour: 'numeric',
    hour12: false,
  });
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    weekday: 'short',
  });

  const hour = parseInt(hourFormatter.format(date), 10);
  const weekday = dayFormatter.format(date);

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, day: dayMap[weekday] ?? date.getDay() };
}