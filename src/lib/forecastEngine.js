// src/lib/forecastEngine.js
import { getEasternTimeDetails } from './dateUtils';

/**
 * Cluster definitions to prevent menu fatigue from repeating
 * base ingredients (e.g., Batter consecutive days, Wheat consecutive days).
 */
const MEAL_CLUSTERS = {
  // Batter / Fermented Rice-Dal
  Dosa: 'batter',
  Idli: 'batter',
  Uttapam: 'batter',
  'Kal Dosa': 'batter',

  // Wheat / Roti / Bread
  Chapati: 'wheat',
  Paratha: 'wheat',
  Puri: 'wheat',
  'Phulka Roti': 'wheat',
  'Pav Bhaji': 'bread',
  'Grilled Cheese': 'bread',
  Subway: 'bread',

  // South Indian Rice / Kuzhambu / Rasam
  Pongal: 'tiffin_grains',
  'Rava Upma': 'tiffin_grains',
  'Semiya Upma': 'tiffin_grains',
  'Rava Kichadi': 'tiffin_grains',
  'Adai Avial': 'tiffin_grains',
  'Sambar Sadam': 'rice_kuzhambu',
  'Rasam Sadam': 'rice_kuzhambu',
  'Mor Kuzhambu': 'rice_kuzhambu',
  'Vatha Kuzhambu': 'rice_kuzhambu',

  // Global / Fun
  Pasta: 'global',
  Pizza: 'global',
  'Veg Hakka Noodles': 'global',
};

function getMealCluster(mealName = '') {
  for (const [key, cluster] of Object.entries(MEAL_CLUSTERS)) {
    if (mealName.toLowerCase().includes(key.toLowerCase())) {
      return cluster;
    }
  }
  return null;
}

/**
 * Core candidate scoring algorithm with Adaptive Learning (Rejection + Win-Rate)
 */
export function rankCandidateMeals({
  allMeals = [],
  recentMealIds = new Set(),
  yesterdayMeal = null,
  specialEvent = null,
  performanceStats = {}, // { [mealId]: { appearances: number, upvotes: number, wins: number } }
}) {
  const { hour: currentHour, day: currentDay } = getEasternTimeDetails();
  const yesterdayCluster = yesterdayMeal ? getMealCluster(yesterdayMeal.name) : null;

  const scored = allMeals.map((m) => {
    // 1. Base score + Entropy Jitter (+/- 2.5 pts to naturally break ties)
    const jitter = Math.random() * 5 - 2.5;
    let score = 50 + jitter;

    // 2. Anti-repeat Recency Penalty (-60 pts if eaten in past 5 days)
    if (recentMealIds.has(m.id)) {
      score -= 60;
    }

    // 3. Sibling / Category Cluster Fatigue Penalty (-25 pts if same style as yesterday)
    if (yesterdayCluster) {
      const thisCluster = getMealCluster(m.name);
      if (thisCluster && thisCluster === yesterdayCluster) {
        score -= 25;
      }
    }

    // 4. Cultural / Calendar Event (Multi-tag stacking boost)
    if (specialEvent) {
      const matchedBoostCount =
        m.tags?.filter((t) => specialEvent.boostTags?.includes(t)).length || 0;
      const matchedAvoidCount =
        m.tags?.filter((t) => specialEvent.avoidTags?.includes(t)).length || 0;

      score += matchedBoostCount * 25;
      score -= matchedAvoidCount * 30;
    }

    // 5. Time of Day Adjustment
    if (currentHour >= 19.5) {
      if (m.effort === 'High') score -= 35;
      if (m.effort === 'Low') score += 20;
    } else if (currentHour < 18.5) {
      if (m.effort === 'High') score += 15;
    }

    // 6. Weekend Boost (+25 pts for Fun Weekend on Fri/Sat)
    if ((currentDay === 5 || currentDay === 6) && m.tags?.includes('Fun Weekend')) {
      score += 25;
    }

    // 7. Adaptive Learning: Rejection Decay Penalty
    const stats = performanceStats[m.id];
    if (stats) {
      // If appeared 2 or more times with zero total upvotes -> cool it down
      if (stats.appearances >= 2 && stats.upvotes === 0) {
        score -= 35;
      }

      // 8. Adaptive Learning: Capped Win-Rate Boost (max +15 pts)
      if (stats.appearances > 0 && stats.wins > 0) {
        const winRate = stats.wins / stats.appearances;
        const winBonus = Math.min(15, Math.round(winRate * 15));
        score += winBonus;
      }
    }

    return { ...m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((m) => m.id);
}