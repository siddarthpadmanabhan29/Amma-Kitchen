import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Auth.css';

export default function Auth({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('👤');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim() || 'Family Member',
              role: 'member', // Default role
              avatar_emoji: avatarEmoji,
            },
          },
        });
        if (error) throw error;
        setMessage('Account created! Logging in...');
        if (data?.session?.user) onAuthSuccess(data.session.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data?.session?.user) onAuthSuccess(data.session.user);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="badge">🍲 Welcome to Amma's Kitchen</div>
      <h2 className="auth-title">{isSignUp ? 'Create Family Profile' : 'Sign In'}</h2>

      <form onSubmit={handleAuth} className="auth-form">
        {isSignUp && (
          <>
            <label className="auth-label">Your Name</label>
            <input
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label className="auth-label">Profile Emoji</label>
            <div className="emoji-row">
              {['👤', '🧔', '👦', '👧', '🧑', '🎉'].map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  className={`emoji-btn ${avatarEmoji === emoji ? 'selected' : ''}`}
                  onClick={() => setAvatarEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="auth-label">Email</label>
        <input
          type="email"
          className="auth-input"
          placeholder="yourname@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="auth-label">Password</label>
        <input
          type="password"
          className="auth-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? 'Please wait...' : isSignUp ? 'Create Profile' : 'Sign In'}
        </button>
      </form>

      {message && <p className="auth-error-msg">{message}</p>}

      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setMessage(null);
        }}
        className="auth-switch-btn"
      >
        {isSignUp ? 'Already have a profile? Sign In' : 'First time? Create a profile'}
      </button>
    </div>
  );
}