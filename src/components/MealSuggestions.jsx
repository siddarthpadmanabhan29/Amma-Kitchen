import { useState } from 'react';
import { supabase } from '../lib/supabase';
import MealAutocomplete from './MealAutocomplete';

export default function MealSuggestions({ userProfile, allMeals = [], onSuggestionAdded }) {
  const [mealName, setMealName] = useState('');
  const [effort, setEffort] = useState('Medium');
  const [selectedTag, setSelectedTag] = useState('Comfort');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmitSuggestion(e) {
    e.preventDefault();
    if (!mealName.trim() || !userProfile) return;
    setSubmitting(true);
    setMessage('');

    try {
      const cleanName = mealName.trim();
      const existing = allMeals.find(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );

      let targetMeal = null;

      if (existing) {
        targetMeal = {
          ...existing,
          status: 'suggested',
          submitted_by: userProfile.id,
          profiles: {
            name: userProfile.name,
            avatar_emoji: userProfile.avatar_emoji,
          },
        };
      } else {
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
          <label className="auth-label">Dish Name</label>
          <MealAutocomplete
            allMeals={allMeals}
            value={mealName}
            onChange={setMealName}
            onSelectExisting={(meal) => {
              setEffort(meal.effort);
              if (meal.tags?.[0]) setSelectedTag(meal.tags[0]);
            }}
            placeholder="e.g. Dosa, Rajma Chawal, Pasta..."
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label className="auth-label">Effort Level</label>
            <select
              className="auth-select"
              style={{ width: '100%' }}
              value={effort}
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
              style={{ width: '100%' }}
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="Comfort">Comfort</option>
              <option value="Quick">Quick</option>
              <option value="Light Meal">Light Meal</option>
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