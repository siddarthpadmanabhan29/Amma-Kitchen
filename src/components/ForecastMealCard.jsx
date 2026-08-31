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

      {!isLocked && (
        <div className="actions-row">
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

          {isAmma && (
            <button
              type="button"
              className="lockin-btn"
              style={{ flex: 1.5 }}
              onClick={() => onLockIn(meal.id)}
            >
              Lock In 🔒
            </button>
          )}
        </div>
      )}

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