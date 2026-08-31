// src/lib/calendarClassifier.js

/**
 * Maps event title keywords to meal scoring rules
 */
export function classifyCalendarEvent(summary = '') {
  const title = summary.toLowerCase();

  // 1. Tamil Vratham / Fasting / Tiffin Days
  if (
    title.includes('chaturthi') ||
    title.includes('chathurthi') ||
    title.includes('sankatahara') ||
    title.includes('sankatahara chaturthi') ||
    title.includes('ekadashi') ||
    title.includes('ekadasi') ||
    title.includes('pradosham') ||
    title.includes('sashti') ||
    title.includes('shashti') ||
    title.includes('karthigai') ||
    title.includes('krithigai') ||
    title.includes('amavasai') ||
    title.includes('amavasya') ||
    title.includes('pournami') ||
    title.includes('somavaram') ||
    title.includes('shivarathri') ||
    title.includes('sivarathri') ||
    title.includes('fasting') ||
    title.includes('vratham') ||
    title.includes('viratham')
  ) {
    return {
      name: summary,
      type: 'vratham',
      description: 'Tiffin & Light Meal Focus',
      boostTags: ['Tiffin', 'Light Meal', 'South Indian'],
      avoidTags: ['Takeout', 'Custom Pick'],
      boostScore: 45,
    };
  }

  // 2. Major Festivals (Tamil & Hindu)
  if (
    title.includes('pongal') ||
    title.includes('sankranti') ||
    title.includes('diwali') ||
    title.includes('deepavali') ||
    title.includes('varalakshmi') ||
    title.includes('navratri') ||
    title.includes('janmashtami') ||
    title.includes('gokulashtami') ||
    title.includes('new year') ||
    title.includes('vishu')
  ) {
    return {
      name: summary,
      type: 'festival',
      description: 'Festive Traditional Feast',
      boostTags: ['Festival', 'South Indian', 'Traditional'],
      avoidTags: ['Takeout'],
      boostScore: 50,
    };
  }

  // 3. US / Cultural Holidays
  if (title.includes('thanksgiving')) {
    return {
      name: summary,
      type: 'holiday',
      description: 'Comfort Feast & Mac & Cheese',
      boostTags: ['Holiday Feast', 'Comfort'],
      avoidTags: [],
      boostScore: 45,
    };
  }

  if (title.includes('christmas') || title.includes('easter') || title.includes('4th of july')) {
    return {
      name: summary,
      type: 'holiday',
      description: 'Holiday Celebration',
      boostTags: ['Holiday Feast', 'Fun Weekend'],
      avoidTags: [],
      boostScore: 40,
    };
  }

  // 4. Default Family Events (e.g., "Amma's Birthday", "Family Dinner")
  return {
    name: summary,
    type: 'family',
    description: 'Special Family Day',
    boostTags: ['Fun Weekend', 'Comfort'],
    avoidTags: [],
    boostScore: 30,
  };
}

/**
 * Returns today's active event metadata if present
 */
export async function getTodaySpecialEvent(dateStr) {
  // Built-in calendar dates
  const STATIC_EVENTS_MAP = {
    '2026-08-31': {
      name: 'Sankatahara Chaturthi',
      type: 'vratham',
      description: 'Tiffin & Prasadam Evening',
      boostTags: ['Tiffin', 'Light Meal', 'South Indian'],
      avoidTags: ['Takeout', 'Custom Pick'],
      boostScore: 45,
    },
    '2026-09-07': {
      name: 'Aja Ekadashi',
      type: 'vratham',
      description: 'Light / Grains / Upma Focus',
      boostTags: ['Light Meal', 'Tiffin'],
      avoidTags: ['Takeout'],
      boostScore: 45,
    },
    '2026-09-14': {
      name: 'Vinayaka Chaturthi',
      type: 'festival',
      description: 'Festive South Indian Feast',
      boostTags: ['Festival', 'South Indian', 'Traditional'],
      avoidTags: ['Takeout'],
      boostScore: 50,
    },
    '2026-10-10': {
      name: 'Navratri Starts',
      type: 'festival',
      description: 'Sundal & Satvic Vegetarian Dinners',
      boostTags: ['Festival', 'South Indian', 'Light Meal'],
      avoidTags: ['Takeout'],
      boostScore: 40,
    },
    '2026-11-08': {
      name: 'Diwali',
      type: 'festival',
      description: 'Grand Festive Dinner',
      boostTags: ['Festival', 'Fun Weekend', 'Traditional'],
      avoidTags: ['Takeout'],
      boostScore: 50,
    },
    '2026-11-26': {
      name: 'Thanksgiving Day',
      type: 'holiday',
      description: 'Comfort Feast & Mac & Cheese',
      boostTags: ['Holiday Feast', 'Comfort'],
      avoidTags: [],
      boostScore: 45,
    },
    '2026-12-25': {
      name: 'Christmas Dinner',
      type: 'holiday',
      description: 'Holiday Celebration',
      boostTags: ['Holiday Feast', 'Fun Weekend'],
      avoidTags: [],
      boostScore: 40,
    },
    '2027-01-15': {
      name: 'Pongal / Makar Sankranti',
      type: 'festival',
      description: 'Traditional Pongal Special',
      boostTags: ['Festival', 'South Indian', 'Traditional'],
      avoidTags: ['Takeout'],
      boostScore: 50,
    },
  };

  return STATIC_EVENTS_MAP[dateStr] || null;
}