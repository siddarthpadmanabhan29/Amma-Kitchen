// src/components/ForecastCard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEasternDateStr, getEasternStartOfDayISO } from '../lib/dateUtils';
import { getTodaySpecialEvent } from '../lib/calendarClassifier';
import { rankCandidateMeals } from '../lib/forecastEngine';
import ForecastMealCard from './ForecastMealCard';
import CustomMealOverride from './CustomMealOverride';
import './ForecastCard.css';

export default function ForecastCard({ userProfile, onCatalogUpdate, newSuggestion }) {
  const [candidates, setCandidates] = useState([]);
  const [suggestedMeals, setSuggestedMeals] = useState([]);
  const [allApprovedMeals, setAllApprovedMeals] = useState([]);
  const [votes, setVotes] = useState([]);
  const [session, setSession] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayStr = getEasternDateStr();
  const isAmma = userProfile?.role === 'admin';
  const isLocked = session?.status === 'locked_in';

  useEffect(() => {
    if (newSuggestion?.id) {
      setSuggestedMeals((prev) => (prev.some((m) => m.id === newSuggestion.id) ? prev : [newSuggestion, ...prev]));
    }
  }, [newSuggestion]);

  useEffect(() => {
    loadDailySession();

    const voteChannel = supabase
      .channel('session_votes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_votes' }, fetchVotes)
      .subscribe();

    const mealChannel = supabase
      .channel('suggested_meals_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, fetchSuggestions)
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
      .gte('created_at', getEasternStartOfDayISO())
      .order('created_at', { ascending: false });

    if (data) setSuggestedMeals(data);
  }

  async function fetchVotes() {
    const { data } = await supabase
      .from('session_votes')
      .select('id, meal_id, user_id, vote_type, profiles(name, avatar_emoji)')
      .eq('session_date', todayStr);

    if (data) setVotes(data);
  }

  async function loadDailySession() {
    setLoading(true);
    try {
      const event = await getTodaySpecialEvent(todayStr);
      setCurrentEvent(event);

      let { data: currentSession } = await supabase
        .from('dinner_sessions')
        .select('*')
        .eq('session_date', todayStr)
        .maybeSingle();

      const { data: allMeals } = await supabase.from('meals').select('*').eq('status', 'approved');
      setAllApprovedMeals(allMeals || []);

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const { data: history } = await supabase
        .from('dinner_history')
        .select('meal_id')
        .gte('session_date', getEasternDateStr(fiveDaysAgo));

      const recentMealIds = new Set((history || []).map((h) => h.meal_id));

      if (!currentSession && allMeals?.length > 0) {
        const top3Ids = rankCandidateMeals({ allMeals, recentMealIds, specialEvent: event });
        const { data: newSession } = await supabase
          .from('dinner_sessions')
          .insert({ session_date: todayStr, candidate_meal_ids: top3Ids, status: 'voting_open' })
          .select()
          .single();

        if (newSession) currentSession = newSession;
      }

      setSession(currentSession);

      if (currentSession) {
        const ids = [...currentSession.candidate_meal_ids, currentSession.final_meal_id].filter(Boolean);
        setCandidates((allMeals || []).filter((m) => ids.includes(m.id)));
      }

      await fetchSuggestions();
      await fetchVotes();
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(mealId, voteType) {
    if (!userProfile || isLocked) return;
    const existing = votes.find((v) => v.user_id === userProfile.id);

    if (existing && existing.meal_id === mealId && existing.vote_type === voteType) {
      await supabase.from('session_votes').delete().eq('id', existing.id);
    } else {
      if (existing) await supabase.from('session_votes').delete().eq('id', existing.id);
      await supabase.from('session_votes').upsert(
        { session_date: todayStr, meal_id: mealId, user_id: userProfile.id, vote_type: voteType },
        { onConflict: 'session_date,meal_id,user_id' }
      );
    }
    await fetchVotes();
  }

  async function handleLockIn(mealId) {
    const { error } = await supabase
      .from('dinner_sessions')
      .update({ status: 'locked_in', final_meal_id: mealId, locked_at: new Date().toISOString() })
      .eq('session_date', todayStr);

    if (!error) {
      await supabase.from('dinner_history').upsert({ session_date: todayStr, meal_id: mealId, locked_by: userProfile.id }, { onConflict: 'session_date' });
      await supabase.from('meals').update({ status: 'approved' }).eq('id', mealId);
      setSession((prev) => ({ ...prev, status: 'locked_in', final_meal_id: mealId }));
    }
  }

  async function handleCustomLockIn({ mealName, effort, selectedMeal }) {
    let target = selectedMeal;
    if (!target) {
      const match = allApprovedMeals.find((m) => m.name.toLowerCase() === mealName.toLowerCase());
      if (match) {
        target = match;
      } else {
        const { data: newMeal } = await supabase
          .from('meals')
          .insert({ name: mealName, effort, tags: ['Custom Pick'], status: 'approved', submitted_by: userProfile.id })
          .select()
          .single();
        target = newMeal;
        if (onCatalogUpdate) onCatalogUpdate(newMeal);
      }
    }
    setCandidates((prev) => (prev.some((m) => m.id === target.id) ? prev : [...prev, target]));
    await handleLockIn(target.id);
  }

  async function handleUnlock() {
    await supabase.from('dinner_sessions').update({ status: 'voting_open', final_meal_id: null }).eq('session_date', todayStr);
    await supabase.from('dinner_history').delete().eq('session_date', todayStr);
    setSession((prev) => ({ ...prev, status: 'voting_open', final_meal_id: null }));
  }

  if (loading) return <p style={{ color: '#64748b' }}>Calculating tonight's options...</p>;

  const winningMeal = [...candidates, ...suggestedMeals].find((m) => m.id === session?.final_meal_id);

  return (
    <div className="session-card">
      {isLocked ? (
        <div className="banner-locked">
          <h3>✅ Tonight's Dinner is Locked In!</h3>
          <p>Amma has chosen <strong>{winningMeal?.name}</strong>.</p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span className="badge">🗳️ Today's Forecast & Voting</span>
          {currentEvent && (
            <div style={{ margin: '8px auto 10px', padding: '6px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '13px', fontWeight: '700', display: 'inline-block' }}>
              🪔 {currentEvent.name}: {currentEvent.description}
            </div>
          )}
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>What's for Dinner Tonight?</h2>
        </div>
      )}

      <div className="candidates-list">
        {candidates.map((meal) => (
          <ForecastMealCard
            key={meal.id}
            meal={meal}
            isWinning={session?.final_meal_id === meal.id}
            isLocked={isLocked}
            isAmma={isAmma}
            votes={votes}
            currentUserId={userProfile?.id}
            onVote={handleVote}
            onLockIn={handleLockIn}
          />
        ))}
      </div>

      {suggestedMeals.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '2px dashed #cbd5e1', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>💡 Family Suggestions ({suggestedMeals.length})</span>
            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              {isLocked ? 'Voting Closed' : 'Active for Voting'}
            </span>
          </div>

          <div className="candidates-list">
            {suggestedMeals.map((meal) => (
              <ForecastMealCard
                key={meal.id}
                meal={meal}
                isSuggested
                isWinning={session?.final_meal_id === meal.id}
                isLocked={isLocked}
                isAmma={isAmma}
                votes={votes}
                currentUserId={userProfile?.id}
                onVote={handleVote}
                onLockIn={handleLockIn}
              />
            ))}
          </div>
        </div>
      )}

      {isAmma && !isLocked && (
        <CustomMealOverride allApprovedMeals={allApprovedMeals} onLockInCustom={handleCustomLockIn} />
      )}

      {isAmma && isLocked && (
        <button className="unlock-btn" onClick={handleUnlock}>🔓 Change Choice / Reopen Voting</button>
      )}
    </div>
  );
}