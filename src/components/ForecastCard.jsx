import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import MealAutocomplete from './MealAutocomplete';
import './ForecastCard.css';

export default function ForecastCard({ userProfile, onCatalogUpdate, newSuggestion }) {
  const [candidates, setCandidates] = useState([]);
  const [suggestedMeals, setSuggestedMeals] = useState([]);
  const [allApprovedMeals, setAllApprovedMeals] = useState([]);
  const [votes, setVotes] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Amma Custom Meal Override Form State
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMealName, setCustomMealName] = useState('');
  const [customEffort, setCustomEffort] = useState('Medium');
  const [selectedCustomMeal, setSelectedCustomMeal] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Instant local sync whenever a suggestion is added in this browser
  useEffect(() => {
    if (newSuggestion && newSuggestion.id) {
      setSuggestedMeals((prev) => {
        const exists = prev.some((m) => m.id === newSuggestion.id);
        if (exists) return prev;
        return [newSuggestion, ...prev];
      });
    }
  }, [newSuggestion]);

  // 2. Realtime listener for cross-device voting and new suggestions
  useEffect(() => {
    loadDailySession();

    // Listen to real-time vote changes
    const voteChannel = supabase
      .channel('session_votes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_votes' },
        () => {
          fetchVotes();
        }
      )
      .subscribe();

    // Listen to real-time meal changes (new suggestions or updates from other devices)
    const mealChannel = supabase
      .channel('suggested_meals_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals' },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(voteChannel);
      supabase.removeChannel(mealChannel);
    };
  }, []);

  async function fetchSuggestions() {
    const { data } = await supabase
      .from('meals')
      .select('*, profiles:submitted_by(name, avatar_emoji)')
      .eq('status', 'suggested')
      .order('created_at', { ascending: false });

    if (data) {
      setSuggestedMeals(data);
    }
  }

  async function fetchVotes() {
    const { data: voteData } = await supabase
      .from('session_votes')
      .select(`
        id,
        meal_id,
        user_id,
        vote_type,
        profiles (
          name,
          avatar_emoji
        )
      `)
      .eq('session_date', todayStr);

    if (voteData) setVotes(voteData);
  }

  async function loadDailySession() {
    setLoading(true);
    try {
      // 1. Fetch or create today's session
      let { data: currentSession } = await supabase
        .from('dinner_sessions')
        .select('*')
        .eq('session_date', todayStr)
        .maybeSingle();

      // 2. Fetch all approved meals
      const { data: allMeals } = await supabase
        .from('meals')
        .select('*')
        .eq('status', 'approved');

      setAllApprovedMeals(allMeals || []);

      // 3. Fetch past 5 days of history for Anti-Repeat Recency Penalty
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];

      const { data: recentHistory } = await supabase
        .from('dinner_history')
        .select('meal_id, session_date')
        .gte('session_date', fiveDaysAgoStr);

      const recentMealIds = new Set((recentHistory || []).map((h) => h.meal_id));

      // 4. Generate Top 3 Candidate Pool if session not already created
      if (!currentSession && allMeals && allMeals.length > 0) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        const scored = allMeals.map((m) => {
          let score = 50;

          if (recentMealIds.has(m.id)) {
            score -= 60;
          }

          if (currentHour >= 19.5) {
            if (m.effort === 'High') score -= 35;
            if (m.effort === 'Low') score += 20;
          } else if (currentHour < 18.5) {
            if (m.effort === 'High') score += 15;
          }

          if ((currentDay === 5 || currentDay === 6) && m.tags?.includes('Fun Weekend')) {
            score += 25;
          }

          return { ...m, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top3Ids = scored.slice(0, 3).map((m) => m.id);

        const { data: newSession, error: insertErr } = await supabase
          .from('dinner_sessions')
          .insert({
            session_date: todayStr,
            candidate_meal_ids: top3Ids,
            status: 'voting_open',
          })
          .select()
          .single();

        if (!insertErr) currentSession = newSession;
      }

      setSession(currentSession);

      // Hydrate Top 3 Candidates
      if (currentSession) {
        const idsToFetch = [
          ...currentSession.candidate_meal_ids,
          currentSession.final_meal_id,
        ].filter(Boolean);

        const candidateList = (allMeals || []).filter((m) =>
          idsToFetch.includes(m.id)
        );
        setCandidates(candidateList);
      }

      // Fetch suggested meals and votes
      await fetchSuggestions();
      await fetchVotes();
    } catch (err) {
      console.error('Session loading error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(mealId, voteType) {
    if (!userProfile) return;

    const existingVote = votes.find(
      (v) => v.meal_id === mealId && v.user_id === userProfile.id
    );

    if (existingVote && existingVote.vote_type === voteType) {
      await supabase.from('session_votes').delete().eq('id', existingVote.id);
    } else {
      await supabase.from('session_votes').upsert(
        {
          session_date: todayStr,
          meal_id: mealId,
          user_id: userProfile.id,
          vote_type: voteType,
        },
        { onConflict: 'session_date,meal_id,user_id' }
      );
    }
    await fetchVotes();
  }

  async function handleLockIn(mealId) {
    const { error } = await supabase
      .from('dinner_sessions')
      .update({
        status: 'locked_in',
        final_meal_id: mealId,
        locked_at: new Date().toISOString(),
      })
      .eq('session_date', todayStr);

    if (!error) {
      await supabase.from('dinner_history').upsert(
        {
          session_date: todayStr,
          meal_id: mealId,
          locked_by: userProfile.id,
        },
        { onConflict: 'session_date' }
      );

      // If a suggested meal is locked in, mark it approved for the permanent catalog
      await supabase.from('meals').update({ status: 'approved' }).eq('id', mealId);

      setSession((prev) => ({
        ...prev,
        status: 'locked_in',
        final_meal_id: mealId,
      }));
    }
  }

  async function handleCustomMealLockIn(e) {
    e.preventDefault();
    if (!customMealName.trim()) return;

    let targetMeal = selectedCustomMeal;

    if (!targetMeal) {
      const existing = allApprovedMeals.find(
        (m) => m.name.toLowerCase() === customMealName.trim().toLowerCase()
      );

      if (existing) {
        targetMeal = existing;
      } else {
        const { data: newMeal, error } = await supabase
          .from('meals')
          .insert({
            name: customMealName.trim(),
            effort: customEffort,
            tags: ['Custom Pick'],
            status: 'approved',
            submitted_by: userProfile.id,
          })
          .select()
          .single();

        if (error) {
          alert(`Error creating meal: ${error.message}`);
          return;
        }
        targetMeal = newMeal;
        if (onCatalogUpdate) onCatalogUpdate(newMeal);
      }
    }

    setCandidates((prev) => {
      const exists = prev.some((m) => m.id === targetMeal.id);
      return exists ? prev : [...prev, targetMeal];
    });

    await handleLockIn(targetMeal.id);
    setShowCustomInput(false);
    setCustomMealName('');
    setSelectedCustomMeal(null);
  }

  async function handleUnlock() {
    await supabase
      .from('dinner_sessions')
      .update({ status: 'voting_open', final_meal_id: null })
      .eq('session_date', todayStr);

    await supabase.from('dinner_history').delete().eq('session_date', todayStr);

    setSession((prev) => ({
      ...prev,
      status: 'voting_open',
      final_meal_id: null,
    }));
  }

  if (loading) {
    return <p style={{ color: '#64748b' }}>Calculating tonight's options...</p>;
  }

  const isAmma = userProfile?.role === 'admin';
  const isLocked = session?.status === 'locked_in';
  const allCurrentOptions = [...candidates, ...suggestedMeals];
  const winningMeal = allCurrentOptions.find((m) => m.id === session?.final_meal_id);

  const renderMealCard = (meal, isSuggested = false) => {
    const upvoters = votes.filter(
      (v) => v.meal_id === meal.id && v.vote_type === 'upvote'
    );
    const downvoters = votes.filter(
      (v) => v.meal_id === meal.id && v.vote_type === 'downvote'
    );
    const score = upvoters.length - downvoters.length;

    const userVote = votes.find(
      (v) => v.meal_id === meal.id && v.user_id === userProfile?.id
    );

    const isWinning = session?.final_meal_id === meal.id;

    return (
      <div
        key={meal.id}
        className={`meal-option-card ${isWinning ? 'winning-meal' : ''}`}
      >
        <div className="meal-header">
          <span className="meal-name">
            {isWinning ? '👑 ' : ''}
            {meal.name}
          </span>
          <span
            className={`vote-tally ${
              score > 0 ? 'positive' : score < 0 ? 'negative' : ''
            }`}
          >
            {score > 0 ? `+${score}` : score} votes
          </span>
        </div>

        {/* Submitter Attribution */}
        {isSuggested && (
          <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '700', marginBottom: '6px' }}>
            💡 Suggested by {meal.profiles?.avatar_emoji || '👤'} {meal.profiles?.name || 'Family Member'}
          </div>
        )}

        <div className="meal-meta">
          <span className="tag-badge">⚡ {meal.effort} Effort</span>
          {meal.tags?.map((t, idx) => (
            <span key={idx} className="tag-badge">
              {t}
            </span>
          ))}
        </div>

        {!isLocked && (
          <div className="actions-row">
            <button
              type="button"
              className={`vote-btn ${
                userVote?.vote_type === 'upvote' ? 'active-up' : ''
              }`}
              onClick={() => handleVote(meal.id, 'upvote')}
            >
              👍 {upvoters.length}
            </button>
            <button
              type="button"
              className={`vote-btn ${
                userVote?.vote_type === 'downvote' ? 'active-down' : ''
              }`}
              onClick={() => handleVote(meal.id, 'downvote')}
            >
              👎 {downvoters.length}
            </button>

            {isAmma && (
              <button
                type="button"
                className="lockin-btn"
                style={{ flex: 1.5 }}
                onClick={() => handleLockIn(meal.id)}
              >
                Lock In 🔒
              </button>
            )}
          </div>
        )}

        {/* Voter Breakdown Chips */}
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
  };

  return (
    <div className="session-card">
      {isLocked ? (
        <div className="banner-locked">
          <h3>✅ Tonight's Dinner is Locked In!</h3>
          <p>
            Amma has chosen <strong>{winningMeal?.name}</strong>.
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span className="badge">🗳️ Today's Forecast & Voting</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
            What's for Dinner Tonight?
          </h2>
        </div>
      )}

      {/* 1. Daily Algorithmic Top 3 Candidates */}
      <div className="candidates-list">
        {candidates.map((meal) => renderMealCard(meal, false))}
      </div>

      {/* 2. Real-Time Family Suggestions Section */}
      {suggestedMeals.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '2px dashed #cbd5e1', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              💡 Family Suggestions ({suggestedMeals.length})
            </span>
            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              Active for Voting
            </span>
          </div>

          <div className="candidates-list">
            {suggestedMeals.map((meal) => renderMealCard(meal, true))}
          </div>
        </div>
      )}

      {/* 3. Amma's Custom Override Input */}
      {isAmma && !isLocked && (
        <div className="custom-override-container">
          {!showCustomInput ? (
            <button
              type="button"
              className="custom-trigger-btn"
              onClick={() => setShowCustomInput(true)}
            >
              <span>✍️</span> Cook something else tonight? (Type Custom Dish)
            </button>
          ) : (
            <form onSubmit={handleCustomMealLockIn} className="custom-form-card">
              <div className="custom-form-header">
                Select from catalog or enter a new dinner:
              </div>

              <MealAutocomplete
                allMeals={allApprovedMeals}
                value={customMealName}
                onChange={(val) => {
                  setCustomMealName(val);
                  setSelectedCustomMeal(null);
                }}
                onSelectExisting={(meal) => {
                  setSelectedCustomMeal(meal);
                  setCustomEffort(meal.effort);
                }}
                placeholder="Start typing dish name..."
              />

              {!selectedCustomMeal && (
                <div className="custom-effort-row">
                  <label className="custom-effort-label">Effort Level:</label>
                  <select
                    className="auth-select"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    value={customEffort}
                    onChange={(e) => setCustomEffort(e.target.value)}
                  >
                    <option value="Low">⚡ Low (Quick)</option>
                    <option value="Medium">🍲 Medium</option>
                    <option value="High">👑 High (Elaborate)</option>
                  </select>
                </div>
              )}

              <div className="custom-btn-group">
                <button type="submit" className="custom-lockin-btn">
                  Lock In Custom Dinner ✅
                </button>
                <button
                  type="button"
                  className="custom-cancel-btn"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomMealName('');
                    setSelectedCustomMeal(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {isAmma && isLocked && (
        <button className="unlock-btn" onClick={handleUnlock}>
          🔓 Change Choice / Reopen Voting
        </button>
      )}
    </div>
  );
}