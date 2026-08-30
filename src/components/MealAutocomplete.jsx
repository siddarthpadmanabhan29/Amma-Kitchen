import { useState, useEffect, useRef } from 'react';

export default function MealAutocomplete({
  allMeals = [],
  value = '',
  onChange,
  onSelectExisting,
  placeholder = 'Type meal name...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value.trim().length > 0) {
      const matches = allMeals.filter((m) =>
        m.name.toLowerCase().includes(value.toLowerCase().trim())
      );
      setFiltered(matches);
      setIsOpen(true);
    } else {
      setFiltered([]);
      setIsOpen(false);
    }
  }, [value, allMeals]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (meal) => {
    onChange(meal.name);
    if (onSelectExisting) onSelectExisting(meal);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="auth-input"
        style={{ width: '100%', boxSizing: 'border-box' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length > 0) setIsOpen(true);
        }}
        required
      />

      {isOpen && filtered.length > 0 && (
        <ul className="autocomplete-dropdown">
          {filtered.map((meal) => (
            <li
              key={meal.id}
              className="autocomplete-item"
              onClick={() => handleSelect(meal)}
            >
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{meal.name}</span>
              <span className="tag-badge" style={{ fontSize: '11px' }}>
                {meal.effort} Effort
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && value.trim().length > 0 && filtered.length === 0 && (
        <div className="autocomplete-dropdown" style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b' }}>
          ✨ New dish! Type to create "<strong>{value.trim()}</strong>"
        </div>
      )}
    </div>
  );
}