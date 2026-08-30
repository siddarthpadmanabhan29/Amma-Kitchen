import { useState, useRef, useEffect } from 'react';

export default function MealAutocomplete({
  allMeals = [],
  value = '',
  onChange,
  onSelectExisting,
  placeholder = 'Type dish name...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Filter approved meals based on current typing
  const matches = value.trim()
    ? allMeals.filter((m) =>
        m.name.toLowerCase().includes(value.trim().toLowerCase())
      )
    : [];

  // Close dropdown when clicking anywhere outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(meal) {
    onChange(meal.name);
    if (onSelectExisting) {
      onSelectExisting(meal);
    }
    setIsOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="auth-input"
        style={{ width: '100%', boxSizing: 'border-box' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (value.trim() && matches.length > 0) {
            setIsOpen(true);
          }
        }}
      />

      {isOpen && matches.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            marginTop: '4px',
            padding: '4px 0',
            listStyle: 'none',
            maxHeight: '180px',
            overflowY: 'auto',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          {matches.map((meal) => (
            <li
              key={meal.id}
              // onMouseDown fires BEFORE the input blur event, selecting in 1 click
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(meal);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <span style={{ fontWeight: '600', color: '#1e293b' }}>{meal.name}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                ⚡ {meal.effort}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}