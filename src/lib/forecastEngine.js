// src/lib/forecastEngine.js
import { getEasternTimeDetails } from './dateUtils';

export function rankCandidateMeals({ allMeals = [], recentMealIds = new Set(), specialEvent = null }) {
  const { hour: currentHour, day: currentDay } = getEasternTimeDetails();

  const scored = allMeals.map((m) => {
    let score = 50;

    // 1. Anti-repeat recency penalty
    if (recentMealIds.has(m.id)) {
      score -= 60;
    }

    // 2. Calendar Event / Festival / Vratham boost
    if (specialEvent) {
      const hasBoostTag = m.tags?.some((t) => specialEvent.boostTags?.includes(t));
      const hasAvoidTag = m.tags?.some((t) => specialEvent.avoidTags?.includes(t));

      if (hasBoostTag) score += specialEvent.boostScore || 45;
      if (hasAvoidTag) score -= 30;
    }

    // 3. Time of Day Adjustment
    if (currentHour >= 19.5) {
      if (m.effort === 'High') score -= 35;
      if (m.effort === 'Low') score += 20;
    } else if (currentHour < 18.5) {
      if (m.effort === 'High') score += 15;
    }

    // 4. Weekend Boost
    if ((currentDay === 5 || currentDay === 6) && m.tags?.includes('Fun Weekend')) {
      score += 25;
    }

    return { ...m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((m) => m.id);
}