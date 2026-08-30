import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import MealAutocomplete from './MealAutocomplete';

export default function MealSuggestions({ userProfile, allMeals = [], onMealApproved }) {
  const [mealName, setMealName] = useState('');
  const [effort, setEffort] = useState('Medium');
  const [selectedTag, setSelectedTag] = useState('Comfort Food');
  const [pendingMeals, setPendingMeals] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const isAmma = userProfile?.role === 'admin';

  useEffect(() => {
    if (isAmma) {
      fetchPendingMeals();
    }
  }, [isAmma]);

  async function fetchPendingMeals() {
    const { data, error } = await supabase
      .from('meals')
      .select('*, profiles:submitted_by(name, avatar_emoji)')
      .eq('status', 'pending');

    if (!error && data) {
      setPendingMeals(data);
    }
  }

  async function handleSubmitSuggestion(e) {
    e.preventDefault();
    if (!mealName.trim()) return;
    setSubmitting(true);
    setMessage('');

    try {
      const existing = allMeals.find(
        (m) => m.name.toLowerCase() === mealName.trim().toLowerCase()
      );

      if (existing) {
        setMessage(`ℹ️ "${existing.name}" is already in the kitchen catalog!`);
        setSubmitting(false);
        return;
      }

      const newMealStatus = isAmma ? 'approved' : 'pending';

      const { data, error } = await supabase
        .from('meals')
        .insert({
          name: mealName.trim(),
          effort,
          tags: [selectedTag],
          status: newMealStatus,
          submitted_by: userProfile.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (isAmma) {
        setMessage(`✅ Added "${mealName.trim()}" directly to catalog!`);
        if (onMealApproved) onMealApproved(data);
      } else {
        setMessage(`🎉 Suggestion submitted to Amma for approval!`);
      }

      setMealName('');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(meal) {
    const { error } = await supabase
      .from('meals')
      .update({ status: 'approved' })
      .eq('id', meal.id);

    if (!error) {
      setPendingMeals((prev) => prev.filter((m) => m.id !== meal.id));
      if (onMealApproved) onMealApproved(meal);
    }
  }

  async function handleReject(mealId) {
    await supabase.from('meals').delete().eq('id', mealId);
    setPendingMeals((prev) => prev.filter((m) => m.id !== mealId));
  }

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">💡 Suggest a Dinner</h3>
        <span className="card-pill-tag">Catalog Idea</span>
      </div>

      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
        Craving something not in the rotation? Enter it here.
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
            <label className="auth-label">Category</label>
            <select
              className="auth-select"
              style={{ width: '100%' }}
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="Comfort Food">Comfort Food</option>
              <option value="Quick & Easy">Quick & Easy</option>
              <option value="Fun Weekend">Fun Weekend</option>
              <option value="Light Meal">Light Meal</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="auth-submit-btn" style={{ marginTop: '6px' }}>
          {submitting ? 'Submitting...' : isAmma ? 'Add Directly to Master Catalog' : 'Send Suggestion to Amma 🚀'}
        </button>
      </form>

      {message && (
        <p style={{ fontSize: '13px', color: '#0369a1', marginTop: '12px', textAlign: 'center', fontWeight: '600' }}>
          {message}
        </p>
      )}

      {/* Amma's Pending Approval Queue */}
      {isAmma && pendingMeals.length > 0 && (
        <div style={{ marginTop: '24px', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '14px', color: '#0f172a', marginBottom: '12px', fontWeight: '800' }}>
            📥 Pending Family Suggestions ({pendingMeals.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingMeals.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Suggested by {item.profiles?.avatar_emoji} {item.profiles?.name || 'Family'} • {item.effort} Effort
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleApprove(item)}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Add
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}