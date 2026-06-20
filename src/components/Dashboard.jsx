/**
 * @fileoverview Enhanced Dashboard component.
 * Features animated stress weather, quick emoji logging, resilience metrics,
 * and exam affirmations.
 *
 * @author MindFlow Team
 * @version 1.2.0
 */

import React, { useState, useEffect } from 'react';
import useWeatherWidget from '../utils/useWeatherWidget';

const affirmations = [
  "An exam is a measure of a single moment, not your intelligence or potential.",
  "Your value is not determined by a mock test score. Keep learning, keep growing.",
  "Deep breaths. One chapter, one syllabus topic, one day at a time.",
  "Compare yourself only to who you were yesterday, not to other students.",
  "Rest is a part of preparation. Give your brain the break it deserves.",
  "You have successfully navigated tough preparation days before; you can navigate today."
];



/**
 * Dashboard Component
 * @param {Object} props
 * @param {Array<Object>} props.journals - Historical journal logs
 * @param {function(number, string): void} props.onQuickLogMood - Callback to log quick mood
 * @returns {React.ReactElement}
 */
export default function Dashboard({ journals = [], onQuickLogMood }) {
  const [affirmation, setAffirmation] = useState('');
  const [breathingCount, setBreathingCount] = useState(0);

  useEffect(() => {
    // Select a random affirmation
    const idx = Math.floor(Math.random() * affirmations.length);
    setAffirmation(affirmations[idx]);

    // Load mindfulness session count
    const count = Number(localStorage.getItem('mindflow_sessions_completed') || 0);
    setBreathingCount(count);
  }, [journals]);

  // Use the custom hook for weather and mood calculations
  // Must be called unconditionally before any early returns (React Rules of Hooks)
  const { avgMood, weather } = useWeatherWidget(journals);

  if (journals.length === 0) {
    return (
      <div className="glass-card text-center" style={{ padding: '3.5rem 1.5rem' }}>
        <span style={{ fontSize: '4.5rem' }}>🌱</span>
        <h2 style={{ fontSize: '1.8rem', marginTop: '1rem' }}>Welcome to your Safe Space</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '1rem auto', fontSize: '1.05rem' }}>
          MindFlow helps you manage the stress of high-stakes exams. Take a moment to log your current mood or write your first journal entry to unlock your stress weather dashboard.
        </p>

        {/* Quick check-in for empty state too */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>How are you feeling right now?</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {[
              { score: 2, emoji: '😞', label: 'Overwhelmed' },
              { score: 5, emoji: '😐', label: 'Tired' },
              { score: 7, emoji: '🙂', label: 'Focused' },
              { score: 9, emoji: '😃', label: 'Confident' },
              { score: 10, emoji: '🌟', label: 'Inspired' }
            ].map((m) => (
              <button
                key={m.score}
                type="button"
                className="settings-btn"
                style={{ fontSize: '1.8rem', padding: '0.8rem', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
                onClick={() => onQuickLogMood(m.score, m.label)}
                title={m.label}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const total = journals.length;

  // Limit to last 7 logs for graph
  const recentJournals = journals.slice(-7);

  // Reconcile distortions and stressors
  const distortionCounts = {};
  const stressorCounts = {};
  
  journals.forEach((j) => {
    let distortions = j.distortions || [];
    let stressors = j.stressors || [];

    if (typeof distortions === 'string') {
      try { distortions = JSON.parse(distortions); } catch (e) { distortions = []; }
    }
    if (typeof stressors === 'string') {
      try { stressors = JSON.parse(stressors); } catch (e) { stressors = []; }
    }

    if (Array.isArray(distortions)) {
      distortions.forEach((d) => {
        distortionCounts[d.name] = (distortionCounts[d.name] || 0) + 1;
      });
    }
    if (Array.isArray(stressors)) {
      stressors.forEach((s) => {
        stressorCounts[s] = (stressorCounts[s] || 0) + 1;
      });
    }
  });

  const topDistortion = Object.entries(distortionCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const topStressors = Object.entries(stressorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Calculate cognitive resilience index (0-100)
  // Formula: (avgMood * 7) + (totalLogs * 2) + (breathingSessions * 4) [Capped at 100]
  const resilienceScore = Math.min(
    Math.round(Number(avgMood) * 7 + total * 1.5 + breathingCount * 3),
    100
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Dynamic Affirmation Banner */}
      <section className="glass-card fade-in" style={{ borderLeft: '4px solid hsl(var(--color-accent))', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }} aria-label="Affirmation">
        <p style={{ margin: 0, fontSize: '1.05rem', fontStyle: 'italic', color: '#fff', fontWeight: '500', flex: '1 1 250px' }}>
          ✨ "{affirmation}"
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="settings-btn"
          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          🖨️ Print Report
        </button>
      </section>

      {/* Grid Layout */}
      <div className="dashboard-grid">
        
        {/* Weather Indicator Card */}
        <section className={`glass-card weather-widget ${weather.class}`} aria-labelledby="weather-title" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Weather Animation Overlays */}
          {weather.class === 'sunny' && (
            <div className="sun-effect-glow" aria-hidden="true" />
          )}
          {weather.class === 'stormy' && (
            <div className="rain-effect-container" aria-hidden="true">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rain-drop" style={{ left: `${i * 18 + 5}%`, animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          )}

          <span className="weather-icon" aria-hidden="true" style={{ position: 'relative', zIndex: 1 }}>{weather.icon}</span>
          <h2 id="weather-title" className="weather-title" style={{ position: 'relative', zIndex: 1 }}>{weather.name}</h2>
          <p className="weather-subtitle" style={{ position: 'relative', zIndex: 1 }}>{weather.desc}</p>
          
          <div style={{ marginTop: '1.5rem', fontSize: '1.1rem', position: 'relative', zIndex: 1 }}>
            Average Mood: <strong>{avgMood} / 10</strong>
          </div>
        </section>

        {/* Chart Card */}
        <section className="glass-card graph-container" aria-labelledby="analytics-title">
          <h2 id="analytics-title" className="logo-title" style={{ fontSize: '1.3rem', margin: 0 }}>
            📊 Mood Tracker Chart (Last 7 Entries)
          </h2>
          
          <div className="bar-chart" aria-label="Bar chart showing mood scores over time.">
            {recentJournals.map((j, index) => {
              const date = new Date(j.created_at);
              const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const heightPercentage = (Number(j.mood_score || 0) / 10) * 100;
              
              // Color map based on mood severity
              const getBarColor = (score) => {
                if (score >= 8) return 'linear-gradient(180deg, #10b981, #059669)';
                if (score >= 5) return 'linear-gradient(180deg, #3b82f6, #1d4ed8)';
                return 'linear-gradient(180deg, #ef4444, #b91c1c)';
              };

              return (
                <div key={index} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar" 
                    style={{ 
                      height: `${heightPercentage}%`,
                      background: getBarColor(j.mood_score)
                    }} 
                    title={`Mood: ${j.mood_score}/10 on ${label}`}
                  />
                  <span className="chart-label">{label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '0.8rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔴 Severe Stress (1-4)</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔵 Moderate Pressure (5-7)</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🟢 Composed (8-10)</span>
          </div>
        </section>
      </div>

      {/* Row 2: Resilience Meter, Stressors, and Quick Log */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        
        {/* Cognitive Resilience & Stressors */}
        <section className="glass-card" aria-labelledby="resilience-title" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 id="resilience-title" className="logo-title" style={{ fontSize: '1.3rem', margin: 0 }}>
            🧠 Cognitive Resilience Index
          </h2>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              <span>Resilience Index Score:</span>
              <strong>{resilienceScore} %</strong>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${resilienceScore}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, hsl(var(--color-primary)), hsl(var(--color-accent)))',
                  transition: 'width 0.5s ease-out' 
                }} 
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.3rem' }}>
              Index calculates mood composition, journaling consistency, and completed mindfulness sessions.
            </span>
          </div>

          <div>
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>Flagged Academic Stressors</h3>
            {topStressors.length > 0 ? (
              <div className="stat-badges">
                {topStressors.map(([name, count]) => (
                  <span key={name} className="stat-badge">
                    {name} ({count}x)
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                Reflections are healthy. No stressors flagged.
              </p>
            )}
          </div>
        </section>

        {/* Quick Log Mood Card */}
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'space-between', gap: '1rem' }} aria-labelledby="quick-log-title">
          <h2 id="quick-log-title" className="logo-title" style={{ fontSize: '1.3rem', margin: 0 }}>
            ⚡ Quick Check-in
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            No time for a journal reflection? Log your current mood with one tap to keep your weekly tracker updated.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            {[
              { score: 2, emoji: '😞', label: 'Overwhelmed' },
              { score: 5, emoji: '😐', label: 'Tired' },
              { score: 7, emoji: '🙂', label: 'Focused' },
              { score: 9, emoji: '😃', label: 'Confident' },
              { score: 10, emoji: '🌟', label: 'Inspired' }
            ].map((m) => (
              <button
                key={m.score}
                type="button"
                className="settings-btn"
                style={{ fontSize: '1.6rem', padding: '0.5rem', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' }}
                onClick={() => onQuickLogMood(m.score, m.label)}
                title={m.label}
              >
                {m.emoji}
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div>
              Reflections: <strong>{total}</strong>
            </div>
            <div>
              Breathing Breaks: <strong>{breathingCount}</strong>
            </div>
            {topDistortion && (
              <div style={{ gridColumn: 'span 2', marginTop: '0.3rem' }}>
                Frequent distortion: <strong style={{ color: '#fca5a5' }}>{topDistortion[0]} ({topDistortion[1]}x)</strong>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
