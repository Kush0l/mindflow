/**
 * @fileoverview App component.
 * Root UI composition, layout structure, and state management.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import Companion from './components/Companion';
import Mindfulness from './components/Mindfulness';
import AccessibilitySettings from './components/AccessibilitySettings';
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

  // Recommended breathing parameters
  const [recPaceName, setRecPaceName] = useState(null);
  const [recPaceConfig, setRecPaceConfig] = useState(null);

  useEffect(() => {
    // 1. Get or create anonymous Device ID session
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // 2. Load cached logs immediately (local-first)
    setJournals(getLocalJournals());
    setChats(getLocalChats());

    // 3. Sync with Neon Postgres in background
    triggerSync();
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

  const handleNewJournal = (journal) => {
    saveJournalLocally(journal);
    setJournals((prev) => [...prev, journal]);
    // Sync to database in background
    triggerSync();
  };

  const handleNewChatMessage = (msg) => {
    saveChatLocally(msg);
    setChats((prev) => [...prev, msg]);
    // Sync to database in background
    triggerSync();
  };

  const handleTriggerBreathing = (paceName, paceConfig) => {
    setRecPaceName(paceName);
    setRecPaceConfig(paceConfig);
    setActiveTab('mindfulness');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard journals={journals} />;
      case 'journal':
        return (
          <Journal
            journals={journals}
            deviceId={deviceId}
            onNewJournal={handleNewJournal}
            onTriggerBreathing={handleTriggerBreathing}
          />
        );
      case 'companion':
        return (
          <Companion
            chats={chats}
            deviceId={deviceId}
            onNewMessage={handleNewChatMessage}
          />
        );
      case 'mindfulness':
        return (
          <Mindfulness
            activePaceName={recPaceName}
            activePaceConfig={recPaceConfig}
          />
        );
      case 'settings':
        return <AccessibilitySettings />;
      default:
        return <Dashboard journals={journals} />;
    }
  };

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
          
          {/* Database Sync Indicators */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {syncing ? (
              <span>🔄 Syncing with Neon...</span>
            ) : syncSuccess ? (
              <span style={{ color: '#10b981' }}>🟢 Connected to Neon DB</span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>⚪ Offline Storage Mode</span>
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
                // Clear recommendations if manually changing tab
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
