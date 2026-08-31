import { useState } from 'react';
import { supabase } from '../lib/supabase';
import MealAutocomplete from './MealAutocomplete';

export default function MealSuggestions({ userProfile, allMeals = [], onSuggestionAdded }) {
  const [mealName, setMealName] = useState('');
  const [effort, setEffort] = useState('Medium');
  const [selectedTag, setSelectedTag] = useState('Comfort');
  const [isExisting, setIsExisting] = useState(false);
  const [selectedExistingMeal, setSelectedExistingMeal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  function handleInputChange(value) {
    setMealName(value);

    const matched = allMeals.find(
      (m) => m.name.toLowerCase() === value.trim().toLowerCase()
    );

    if (matched) {
      setEffort(matched.effort || 'Medium');
      setSelectedTag(matched.tags?.[0] || 'Comfort');
      setIsExisting(true);
      setSelectedExistingMeal(matched);
    } else {
      setIsExisting(false);
      setSelectedExistingMeal(null);
    }
  }

  function handleSelectExisting(meal) {
    setMealName(meal.name);
    setEffort(meal.effort || 'Medium');
    setSelectedTag(meal.tags?.[0] || 'Comfort');
    setIsExisting(true);
    setSelectedExistingMeal(meal);
  }

  async function handleSubmitSuggestion(e) {
    e.preventDefault();
    if (!mealName.trim() || !userProfile) return;
    setSubmitting(true);
    setMessage('');

    try {
      const cleanName = mealName.trim();
      let targetMeal = null;

      if (selectedExistingMeal) {
        // 1. If suggesting a catalog staple, insert a lightweight suggested record for today
        const { data: suggestedCopy, error: copyErr } = await supabase
          .from('meals')
          .insert({
            name: selectedExistingMeal.name,
            effort: selectedExistingMeal.effort,
            tags: selectedExistingMeal.tags || ['Comfort'],
            status: 'suggested',
            submitted_by: userProfile.id,
          })
          .select()
          .single();

        if (copyErr) throw copyErr;

        targetMeal = {
          ...suggestedCopy,
          profiles: {
            name: userProfile.name,
            avatar_emoji: userProfile.avatar_emoji,
          },
        };
      } else {
        // 2. If suggesting a brand new dish, insert new meal
        const { data: newMeal, error: insertErr } = await supabase
          .from('meals')
          .insert({
            name: cleanName,
            effort,
            tags: [selectedTag],
            status: 'suggested',
            submitted_by: userProfile.id,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        targetMeal = {
          ...newMeal,
          profiles: {
            name: userProfile.name,
            avatar_emoji: userProfile.avatar_emoji,
          },
        };
      }

      setMessage(`🎉 "${cleanName}" added to tonight's suggestions!`);
      setMealName('');
      setIsExisting(false);
      setSelectedExistingMeal(null);

      if (onSuggestionAdded && targetMeal) {
        onSuggestionAdded(targetMeal);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">💡 Suggest a Dinner</h3>
        <span className="card-pill-tag">Instant Idea</span>
      </div>

      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
        Craving something specific tonight? Add it directly to today's vote!
      </p>

      <form onSubmit={handleSubmitSuggestion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="auth-label">Dish Name</label>
            {isExisting && (
              <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>
                🔒 Existing Catalog Meal
              </span>
            )}
          </div>
          <MealAutocomplete
            allMeals={allMeals}
            value={mealName}
            onChange={handleInputChange}
            onSelectExisting={handleSelectExisting}
            placeholder="e.g. Ven Pongal, Dosa, Rajma Chawal..."
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label className="auth-label">Effort Level</label>
            <select
              className="auth-select"
              style={{
                width: '100%',
                backgroundColor: isExisting ? '#f1f5f9' : '#ffffff',
                cursor: isExisting ? 'not-allowed' : 'pointer',
                opacity: isExisting ? 0.75 : 1,
              }}
              value={effort}
              disabled={isExisting}
              onChange={(e) => setEffort(e.target.value)}
            >
              <option value="Low">⚡ Low (Quick)</option>
              <option value="Medium">🍲 Medium</option>
              <option value="High">👑 High (Elaborate)</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label className="auth-label">Category Tag</label>
            <select
              className="auth-select"
              style={{
                width: '100%',
                backgroundColor: isExisting ? '#f1f5f9' : '#ffffff',
                cursor: isExisting ? 'not-allowed' : 'pointer',
                opacity: isExisting ? 0.75 : 1,
              }}
              value={selectedTag}
              disabled={isExisting}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="South Indian">South Indian</option>
              <option value="Tiffin">Tiffin</option>
              <option value="Comfort">Comfort</option>
              <option value="Quick">Quick</option>
              <option value="Light Meal">Light Meal</option>
              <option value="Festival">Festival</option>
              <option value="North Indian">North Indian</option>
              <option value="Fun Weekend">Fun Weekend</option>
              <option value="Batch Cook">Batch Cook</option>
              <option value="Takeout">Takeout</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="auth-submit-btn"
          style={{ marginTop: '6px' }}
        >
          {submitting ? 'Adding...' : "Add to Tonight's Suggestions 🚀"}
        </button>
      </form>

      {message && (
        <p style={{ fontSize: '13px', color: '#0369a1', marginTop: '12px', textAlign: 'center', fontWeight: '600' }}>
          {message}
        </p>
      )}
    </div>
  );
}