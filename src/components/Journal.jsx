/**
 * @fileoverview Journal component.
 * Handles student journaling inputs, skeleton loaders, and feedback presentation.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import React, { useState } from 'react';

/**
 * Journal Component
 * @param {Object} props
 * @param {Array<Object>} props.journals - List of existing journals
 * @param {string} props.deviceId - Device UUID
 * @param {function(Object): void} props.onNewJournal - Callback on new journal saved
 * @param {function(string, Object): void} props.onTriggerBreathing - Callback to switch to breathing page with custom pace
 * @returns {React.ReactElement}
 */
export default function Journal({ journals = [], deviceId, onNewJournal, onTriggerBreathing }) {
  const [entry, setEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (entry.trim().length < 10) {
      setError('Your journal entry should be at least 10 characters long.');
      return;
    }
    setError('');
    setLoading(true);
    setCurrentAnalysis(null);

    try {
      const token = localStorage.getItem('mindflow_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          device_id: deviceId,
          journal_text: entry,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || 'API request failed');
      }

      const result = await response.json();
      if (result.success) {
        onNewJournal(result.data);
        setCurrentAnalysis(result.data);
        setEntry('');
      } else {
        throw new Error(result.message || 'Analysis failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server error. Failed to analyze journal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="journal-layout">
      {/* Writing Box */}
      <section className="glass-card" aria-labelledby="write-title">
        <h2 id="write-title" className="logo-title" style={{ fontSize: '1.4rem', margin: '0 0 1rem 0' }}>
          ✍️ Reflect & Release
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="journal-textarea" className="settings-label">
            Write freely about your day, mock tests, syllabus stress, or self-doubt:
          </label>
          <textarea
            id="journal-textarea"
            className="textarea-field"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="E.g., I did poorly on my mock test today. I'm catastrophizing that I will never get into medical school and my parents will be disappointed..."
            disabled={loading}
            aria-required="true"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Characters: {entry.length} (minimum 10)
            </span>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Analyzing thoughts...' : 'Analyze Journal'}
            </button>
          </div>
        </form>

        {error && (
          <div style={{ color: '#ef4444', marginTop: '1rem', fontWeight: '500' }} role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* Skeleton Loader */}
        {loading && (
          <div style={{ marginTop: '2rem' }} className="skeleton-loader">
            <div className="skeleton-line" style={{ width: '80%' }}></div>
            <div className="skeleton-line" style={{ width: '60%' }}></div>
            <div className="skeleton-line" style={{ width: '90%' }}></div>
            <div className="skeleton-line" style={{ width: '40%' }}></div>
          </div>
        )}

        {/* Feedback Display */}
        {currentAnalysis && (
          <div style={{ marginTop: '2rem' }} className="fade-in">
            <h3 className="analysis-title">
              🧠 Aura's Thought Analysis
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="stat-badge" style={{ background: 'rgba(147, 51, 234, 0.2)' }}>
                Mood: {currentAnalysis.mood_score}/10
              </span>
              <span className="stat-badge" style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
                Emotion: {currentAnalysis.dominant_emotion}
              </span>
            </div>

            {/* Cognitive Distortions */}
            {currentAnalysis.distortions && currentAnalysis.distortions.length > 0 ? (
              <div>
                <h4 style={{ margin: '0.5rem 0' }}>Flagged Cognitive Distortions</h4>
                {currentAnalysis.distortions.map((d, index) => (
                  <div key={index} className="distortion-card">
                    <strong>🔍 {d.name}</strong>
                    <p className="distortion-quote">"{d.quote}"</p>
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.95rem' }}>{d.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#10b981', fontWeight: '500' }}>
                🎉 Great job! No cognitive distortions flagged in this reflection.
              </p>
            )}

            {/* Empathetic Reframing */}
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ margin: '0.5rem 0' }}>Empathetic Perspective Change</h4>
              <p style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                {currentAnalysis.response_text}
              </p>
            </div>

            {/* Mindfulness Recommendation */}
            {currentAnalysis.mindfulnessRx && (
              <div className="mindfulness-rx-card">
                <strong>🧘 Recommended Mindfulness Practice:</strong>
                <p style={{ fontSize: '0.95rem', margin: '0.3rem 0 1rem 0' }}>
                  {currentAnalysis.mindfulnessRx.type} — {currentAnalysis.mindfulnessRx.description}
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => onTriggerBreathing(currentAnalysis.mindfulnessRx.type, currentAnalysis.mindfulnessRx.pace)}
                >
                  Start Recommended Breathing
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* History List */}
      <section className="glass-card" aria-labelledby="history-title" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <h2 id="history-title" className="logo-title" style={{ fontSize: '1.4rem', margin: '0 0 1rem 0' }}>
          📓 Journal History
        </h2>
        {journals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No reflections logged yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {journals.slice().reverse().map((j, index) => {
              const date = new Date(j.created_at).toLocaleString();
              // Parse distortions if saved as string
              let distortions = j.distortions || [];
              if (typeof distortions === 'string') {
                try { distortions = JSON.parse(distortions); } catch (e) { distortions = []; }
              }

              return (
                <article
                  key={index}
                  style={{
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>{date}</span>
                    <span>Mood: <strong>{j.mood_score}/10</strong> ({j.dominant_emotion})</span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', lineBreak: 'anywhere' }}>
                    {j.journal_text}
                  </p>
                  {distortions && distortions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                      {distortions.map((d, dIdx) => (
                        <span key={dIdx} className="stat-badge" style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
                          ⚠️ {d.name}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
