import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import ForecastCard from './components/ForecastCard';
import MealSuggestions from './components/MealSuggestions';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [allMeals, setAllMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestSuggestion, setLatestSuggestion] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setUserProfile(data);
    fetchAllMeals();
  }

  async function fetchAllMeals() {
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('status', 'approved');

    if (data) setAllMeals(data);
    setLoading(false);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="auth-wrapper">
        <p style={{ color: '#475569', fontSize: '18px', fontWeight: '600' }}>
          🍲 Loading Amma's Kitchen...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-wrapper">
        <Auth onAuthSuccess={(user) => fetchProfile(user.id)} />
      </div>
    );
  }

  // Strictly formatted to Ohio / US Eastern Time
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="dashboard-wrapper">
      {/* Top Sticky Header */}
      <header className="dashboard-navbar">
        <div className="navbar-inner">
          <div className="brand-section">
            <span className="brand-icon">🍲</span>
            <div>
              <h1 className="brand-title">Amma's Kitchen</h1>
              <p className="brand-subtitle">{todayFormatted}</p>
            </div>
          </div>

          <div className="user-section">
            <div className="user-badge">
              <span>{userProfile?.avatar_emoji || '👤'}</span>
              <span>
                {userProfile?.name}{' '}
                {userProfile?.role === 'admin' ? '(Admin)' : ''}
              </span>
            </div>
            <button onClick={handleSignOut} className="signout-btn">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Grid */}
      <main className="dashboard-main">
        {/* Left Column: Dinner Forecast, Live Voting, & Family Suggestions */}
        <section>
          <ForecastCard
            userProfile={userProfile}
            newSuggestion={latestSuggestion}
            onCatalogUpdate={(newMeal) => setAllMeals((prev) => [...prev, newMeal])}
          />
        </section>

        {/* Right Column: Instant Suggestion Box */}
        <section>
          <MealSuggestions
            userProfile={userProfile}
            allMeals={allMeals}
            onSuggestionAdded={(newMeal) => {
              setLatestSuggestion(newMeal);
              setAllMeals((prev) => {
                const exists = prev.some((m) => m.id === newMeal.id);
                return exists ? prev : [...prev, newMeal];
              });
            }}
          />
        </section>
      </main>
    </div>
  );
}