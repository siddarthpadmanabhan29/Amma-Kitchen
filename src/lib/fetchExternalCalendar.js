// src/lib/fetchExternalCalendar.js
import ICAL from 'ical.js';
import { getEasternDateStr } from './dateUtils';
import { classifyCalendarEvent } from './calendarClassifier';

// You can replace this with your family Google Calendar iCal link (Settings -> Integrate calendar -> Secret/Public address in iCal format)
const ICAL_FEED_URL = 'YOUR_GOOGLE_CALENDAR_OR_PANCHANG_ICAL_URL';

/**
 * Fetches the iCal feed and returns classified event data for today's Eastern date
 */
export async function fetchTodayCalendarEvent() {
  if (!ICAL_FEED_URL || ICAL_FEED_URL.startsWith('YOUR_')) {
    return null;
  }

  try {
    const res = await fetch(ICAL_FEED_URL);
    if (!res.ok) return null;

    const icsText = await res.text();
    const jcalData = ICAL.parse(icsText);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const todayEastern = getEasternDateStr(); // 'YYYY-MM-DD'

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      
      // Get event start date in YYYY-MM-DD
      const startDateStr = event.startDate.toJSDate().toISOString().split('T')[0];

      // If the event is on today's date
      if (startDateStr === todayEastern) {
        return classifyCalendarEvent(event.summary);
      }
    }

    return null;
  } catch (err) {
    console.warn('Could not load live calendar event:', err);
    return null;
  }
}