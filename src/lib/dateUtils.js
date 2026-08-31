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
 * Returns the exact UTC ISO string for midnight Eastern Time,
 * automatically calculating EST (-5) vs EDT (-4) offset.
 */
export function getEasternStartOfDayISO(date = new Date()) {
  const dateStr = getEasternDateStr(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Start with local midnight representation
  const target = new Date(year, month - 1, day, 0, 0, 0);
  
  // Format target into Eastern to determine exact UTC offset dynamically
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    timeZoneName: 'shortOffset',
  });
  
  const parts = formatter.formatToParts(target);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-4';
  
  // Parses "GMT-4" or "GMT-5"
  const offsetMatch = offsetPart.match(/([+-]\d+)/);
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -4;
  
  // Compute UTC timestamp of Eastern midnight
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0));
  return utcMidnight.toISOString();
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