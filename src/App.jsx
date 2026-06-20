/**
 * @fileoverview App component.
 * Root UI composition, layout structure, authentication, and state management.
 *
 * @author MindFlow Team
 * @version 1.1.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import Dashboard from './components/Dashboard';
import AccessibilitySettings from './components/AccessibilitySettings';

const Journal = lazy(() => import('./components/Journal'));
const Companion = lazy(() => import('./components/Companion'));
const Mindfulness = lazy(() => import('./components/Mindfulness'));
import {
  getOrCreateDeviceId,
  getLocalJournals,
  getLocalChats,
  saveJournalLocally,
  saveChatLocally,
  syncWithDatabase,
} from './utils/storage';

/**
 * App Component
 * @returns {React.ReactElement}
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [journals, setJournals] = useState([]);
  const [chats, setChats] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Recommended breathing parameters
  const [recPaceName, setRecPaceName] = useState(null);
  const [recPaceConfig, setRecPaceConfig] = useState(null);

  // Global Theme State
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // 1. Get or create anonymous Device ID session
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // 2. Load cached logs immediately (local-first)
    setJournals(getLocalJournals());
    setChats(getLocalChats());

    // 2.5 Load global theme
    const savedLightMode = localStorage.getItem('a11y_light_mode') === 'true';
    setIsLightMode(savedLightMode);
    if (savedLightMode) document.body.classList.add('light-mode');

    // 3. Verify active JWT token on load
    const savedToken = localStorage.getItem('mindflow_token');
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsAuthenticated(true);
          triggerSync();
        } else {
          localStorage.removeItem('mindflow_token');
          localStorage.removeItem('mindflow_email');
        }
      })
      .catch(err => {
        console.warn('Could not verify token online, operating locally:', err);
        setIsAuthenticated(true); // Keep active for offline resilience
      });
    }
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const result = await syncWithDatabase();
      if (result.dbSynced) {
        setSyncSuccess(true);
        // Refresh local state with synced data
        setJournals(result.journals);
        setChats(result.chats);
      } else {
        setSyncSuccess(false);
      }
    } catch (e) {
      console.warn('Sync warning:', e);
      setSyncSuccess(false);
    } finally {
      setSyncing(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed');
      }

      if (result.success) {
        localStorage.setItem('mindflow_token', result.token);
        localStorage.setItem('mindflow_email', result.user.email);
        setIsAuthenticated(true);
        triggerSync();
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Server error. Failed to authenticate.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mindflow_token');
    localStorage.removeItem('mindflow_email');
    localStorage.removeItem('mindflow_journals');
    localStorage.removeItem('mindflow_chats');
    setIsAuthenticated(false);
    setJournals([]);
    setChats([]);
  };

  const handleNewJournal = (journal) => {
    saveJournalLocally(journal);
    setJournals((prev) => [...prev, journal]);
    triggerSync();
  };

  const handleNewChatMessage = (msg) => {
    saveChatLocally(msg);
    setChats((prev) => [...prev, msg]);
    triggerSync();
  };

  const handleQuickLogMood = (score, emotion) => {
    const newLog = {
      journal_text: `Quick check-in: Feeling ${emotion}`,
      mood_score: score,
      dominant_emotion: emotion,
      distortions: [],
      stressors: ['Quick Check-in'],
      response_text: `You logged feeling ${emotion}. Remember to take a deep breath and keep going!`,
      created_at: new Date().toISOString(),
    };
    handleNewJournal(newLog);
  };

  const handleTriggerBreathing = (paceName, paceConfig) => {
    setRecPaceName(paceName);
    setRecPaceConfig(paceConfig);
    setActiveTab('mindfulness');
  };

  const toggleTheme = () => {
    const newLightMode = !isLightMode;
    setIsLightMode(newLightMode);
    localStorage.setItem('a11y_light_mode', String(newLightMode));
    
    if (newLightMode) {
      document.body.classList.add('light-mode');
      // Ensure high contrast is off if switching to light mode
      localStorage.setItem('a11y_contrast', 'false');
      document.body.classList.remove('high-contrast');
    } else {
      document.body.classList.remove('light-mode');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard journals={journals} onQuickLogMood={handleQuickLogMood} />;
      case 'journal':
        return (
          <Suspense fallback={<div className="skeleton-loader"><div className="skeleton-line" style={{width:'50%'}}></div></div>}>
            <Journal
              journals={journals}
              deviceId={deviceId}
              onNewJournal={handleNewJournal}
              onTriggerBreathing={handleTriggerBreathing}
            />
          </Suspense>
        );
      case 'companion':
        return (
          <Suspense fallback={<div className="skeleton-loader"><div className="skeleton-line" style={{width:'50%'}}></div></div>}>
            <Companion
              chats={chats}
              deviceId={deviceId}
              onNewMessage={handleNewChatMessage}
            />
          </Suspense>
        );
      case 'mindfulness':
        return (
          <Suspense fallback={<div className="skeleton-loader"><div className="skeleton-line" style={{width:'50%'}}></div></div>}>
            <Mindfulness
              activePaceName={recPaceName}
              activePaceConfig={recPaceConfig}
            />
          </Suspense>
        );
      case 'settings':
        return <AccessibilitySettings />;
      default:
        return <Dashboard journals={journals} />;
    }
  };

  // Render Authentication Screen if not logged in
  if (!isAuthenticated) {
    return (
      <>
        <div className="bg-orbs" aria-hidden="true">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
        </div>

        <button
          onClick={toggleTheme}
          className="theme-toggle-btn absolute-top-right"
          aria-label={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
          title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {isLightMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>

        <div className="app-container" style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
          <section className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }} aria-labelledby="auth-title">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '3rem' }} aria-hidden="true">🌌</span>
              <h1 id="auth-title" className="logo-title" style={{ fontSize: '2rem', marginTop: '0.5rem' }}>MindFlow</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
                Student Stress Wellness Companion
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="settings-label" htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  className="chat-input-bar"
                  style={{ width: '100%', padding: '0.7rem 1rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <label className="settings-label" htmlFor="auth-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    className="chat-input-bar"
                    style={{ width: '100%', padding: '0.7rem 1rem', paddingRight: '2.5rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.2rem'
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? '👁️‍🗨️' : '👁️'}
                  </button>
                </div>
              </div>

              {authError && (
                <div style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '500' }} role="alert">
                  ⚠️ {authError}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={authLoading} style={{ width: '100%', marginTop: '0.5rem' }}>
                {authLoading ? 'Verifying...' : authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="settings-btn"
                style={{ background: 'transparent', border: 'none', color: 'hsl(var(--color-primary))', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? "Need an account? Register" : "Already have an account? Login"}
              </button>
            </div>

            <div style={{ marginTop: '2rem', padding: '0.8rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <strong>💡 Test Credentials:</strong>
              <div style={{ marginTop: '0.3rem' }}>
                Email: <code>student@mindflow.com</code><br />
                Password: <code>Student123!</code>
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Background Orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Skip Navigation Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="app-container">
        {/* Header Section */}
        <header className="header">
          <div className="logo-container">
            <span className="logo-icon" aria-hidden="true">🌌</span>
            <div>
              <h1 className="logo-title">MindFlow</h1>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Empathetic Student Exam-Stress Companion
              </span>
            </div>
          </div>
          
          {/* Database Sync Indicators & User Session */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
              title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {isLightMode ? '🌙' : '☀️'}
            </button>
            <div>
              {syncing ? (
                <span>🔄 Syncing with Neon...</span>
              ) : syncSuccess ? (
                <span style={{ color: '#10b981' }}>🟢 Connected to Neon DB</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>⚪ Offline Storage Mode</span>
              )}
            </div>
            {isAuthenticated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '1rem' }}>
                <span>{localStorage.getItem('mindflow_email')}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="tab-nav" aria-label="Main Navigation">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'journal', label: '📓 Reflective Journal' },
            { id: 'companion', label: '🫂 Chat Companion' },
            { id: 'mindfulness', label: '🧘 Breathing Space' },
            { id: 'settings', label: '⚙️ Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'mindfulness') {
                  setRecPaceName(null);
                  setRecPaceConfig(null);
                }
              }}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main id="main-content" tabIndex="-1" style={{ outline: 'none' }}>
          {renderContent()}
        </main>

        <footer style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p>© 2026 MindFlow Companion. Developed under Google DeepMind PromptWars.</p>
        </footer>
      </div>
    </>
  );
}
