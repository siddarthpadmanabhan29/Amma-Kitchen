// src/components/CustomMealOverride.jsx
import { useState } from 'react';
import MealAutocomplete from './MealAutocomplete';

export default function CustomMealOverride({ allApprovedMeals = [], onLockInCustom }) {
  const [showInput, setShowInput] = useState(false);
  const [mealName, setMealName] = useState('');
  const [effort, setEffort] = useState('Medium');
  const [selectedMeal, setSelectedMeal] = useState(null);

  if (!showInput) {
    return (
      <div className="custom-override-container">
        <button type="button" className="custom-trigger-btn" onClick={() => setShowInput(true)}>
          <span>✍️</span> Cook something else tonight? (Type Custom Dish)
        </button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!mealName.trim()) return;

    await onLockInCustom({ mealName: mealName.trim(), effort, selectedMeal });
    setShowInput(false);
    setMealName('');
    setSelectedMeal(null);
  }

  return (
    <div className="custom-override-container">
      <form onSubmit={handleSubmit} className="custom-form-card">
        <div className="custom-form-header">Select from catalog or enter a new dinner:</div>

        <MealAutocomplete
          allMeals={allApprovedMeals}
          value={mealName}
          onChange={(val) => {
            setMealName(val);
            setSelectedMeal(null);
          }}
          onSelectExisting={(m) => {
            setSelectedMeal(m);
            setEffort(m.effort);
          }}
          placeholder="Start typing dish name..."
        />

        {!selectedMeal && (
          <div className="custom-effort-row">
            <label className="custom-effort-label">Effort Level:</label>
            <select
              className="auth-select"
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
            >
              <option value="Low">⚡ Low (Quick)</option>
              <option value="Medium">🍲 Medium</option>
              <option value="High">👑 High (Elaborate)</option>
            </select>
          </div>
        )}

        <div className="custom-btn-group">
          <button type="submit" className="custom-lockin-btn">Lock In Custom Dinner ✅</button>
          <button
            type="button"
            className="custom-cancel-btn"
            onClick={() => {
              setShowInput(false);
              setMealName('');
              setSelectedMeal(null);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}