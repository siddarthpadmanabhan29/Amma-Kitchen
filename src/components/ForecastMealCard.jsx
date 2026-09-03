// src/components/ForecastMealCard.jsx
export default function ForecastMealCard({
  meal,
  isSuggested = false,
  isWinning = false,
  isLocked = false,
  isAmma = false,
  votes = [],
  currentUserId,
  onVote,
  onLockIn,
}) {
  const upvoters = votes.filter((v) => v.meal_id === meal.id && v.vote_type === 'upvote');
  const downvoters = votes.filter((v) => v.meal_id === meal.id && v.vote_type === 'downvote');
  const score = upvoters.length - downvoters.length;
  const userVote = votes.find((v) => v.meal_id === meal.id && v.user_id === currentUserId);

  return (
    <div className={`meal-option-card ${isWinning ? 'winning-meal' : ''}`}>
      <div className="meal-header">
        <span className="meal-name">
          {isWinning ? '👑 ' : ''}
          {meal.name}
        </span>
        <span className={`vote-tally ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`}>
          {score > 0 ? `+${score}` : score} votes
        </span>
      </div>

      {isSuggested && (
        <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '700', marginBottom: '6px' }}>
          💡 Suggested by {meal.profiles?.avatar_emoji || '👤'} {meal.profiles?.name || 'Family Member'}
        </div>
      )}

      <div className="meal-meta">
        <span className="tag-badge">⚡ {meal.effort} Effort</span>
        {meal.tags?.map((t, idx) => (
          <span key={idx} className="tag-badge">{t}</span>
        ))}
      </div>

      <div className="actions-row" style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Voting buttons are hidden once dinner is locked */}
        {!isLocked && (
          <>
            <button
              type="button"
              className={`vote-btn ${userVote?.vote_type === 'upvote' ? 'active-up' : ''}`}
              onClick={() => onVote(meal.id, 'upvote')}
            >
              👍 {upvoters.length}
            </button>
            <button
              type="button"
              className={`vote-btn ${userVote?.vote_type === 'downvote' ? 'active-down' : ''}`}
              onClick={() => onVote(meal.id, 'downvote')}
            >
              👎 {downvoters.length}
            </button>
          </>
        )}

        {/* Amma can toggle lock-in at any time */}
        {isAmma && (
          <button
            type="button"
            onClick={() => onLockIn(meal.id)}
            style={{
              flex: 1.5,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.15s ease-in-out',
              background: isWinning ? '#fee2e2' : '#2563eb',
              color: isWinning ? '#991b1b' : '#ffffff',
            }}
          >
            {isWinning ? '❌ Remove from Tonight' : '🔒 Lock In for Tonight'}
          </button>
        )}
      </div>

      {(upvoters.length > 0 || downvoters.length > 0) && (
        <div className="voters-breakdown">
          {upvoters.length > 0 && (
            <div className="voter-pill upvote-pill">
              <span>👍</span>
              {upvoters.map((v) => (
                <span key={v.id} className="voter-name" title={v.profiles?.name}>
                  {v.profiles?.avatar_emoji} {v.profiles?.name}
                </span>
              ))}
            </div>
          )}

          {downvoters.length > 0 && (
            <div className="voter-pill downvote-pill">
              <span>👎</span>
              {downvoters.map((v) => (
                <span key={v.id} className="voter-name" title={v.profiles?.name}>
                  {v.profiles?.avatar_emoji} {v.profiles?.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}