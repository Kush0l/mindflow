/**
 * @fileoverview Dashboard component.
 * Displays mood tracking analytics, academic stressors, and emotional weather indicators.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import React from 'react';

/**
 * Gets emotional weather details based on average mood score.
 *
 * @param {number} avgMood - Average mood score (1-10)
 * @returns {{ icon: string, name: string, desc: string }}
 */
function getWeather(avgMood) {
  if (avgMood >= 8) {
    return { icon: '☀️', name: 'Clear Skies', desc: 'You are feeling balanced and composed.' };
  } else if (avgMood >= 6) {
    return { icon: '🌤️', name: 'Partly Cloudy', desc: 'Mild academic stress, but coping well.' };
  } else if (avgMood >= 4) {
    return { icon: '☁️', name: 'Overcast', desc: 'High stress load. Take regular breathing breaks.' };
  } else {
    return { icon: '⛈️', name: 'Stormy / High Pressure', desc: 'Severe exam anxiety. Please check in with your companion.' };
  }
}

/**
 * Dashboard Component
 * @param {Object} props
 * @param {Array<Object>} props.journals - Historical journal logs
 * @returns {React.ReactElement}
 */
export default function Dashboard({ journals = [] }) {
  if (journals.length === 0) {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem 1.5rem' }}>
        <span style={{ fontSize: '3rem' }}>🌱</span>
        <h2>Your Wellness Journey Begins Here</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '1rem auto' }}>
          Write your first open-ended daily journal entry. Aura will analyze your emotional weather, flag cognitive distortions, and track your stress levels.
        </p>
      </div>
    );
  }

  // Calculate stats
  const total = journals.length;
  const moodScores = journals.map((j) => Number(j.mood_score || 0));
  const avgMood = (moodScores.reduce((sum, val) => sum + val, 0) / total).toFixed(1);

  // Emotional weather
  const weather = getWeather(Number(avgMood));

  // Limit to last 7 logs for the graph
  const recentJournals = journals.slice(-7);

  // Group all academic stressors
  const stressorCounts = {};
  journals.forEach((j) => {
    // Parse distortions if saved as string
    let stressors = j.stressors || [];
    if (typeof stressors === 'string') {
      try { stressors = JSON.parse(stressors); } catch (e) { stressors = []; }
    }
    if (Array.isArray(stressors)) {
      stressors.forEach((s) => {
        stressorCounts[s] = (stressorCounts[s] || 0) + 1;
      });
    }
  });

  const topStressors = Object.entries(stressorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="dashboard-grid">
      {/* Weather Widget */}
      <section className="glass-card weather-widget" aria-labelledby="weather-title">
        <span className="weather-icon" aria-hidden="true">{weather.icon}</span>
        <h2 id="weather-title" className="weather-title">{weather.name}</h2>
        <p className="weather-subtitle">{weather.desc}</p>
        <div style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>
          Average Mood Score: <strong>{avgMood} / 10</strong>
        </div>
      </section>

      {/* Chart & Analytics */}
      <section className="glass-card graph-container" aria-labelledby="analytics-title">
        <h2 id="analytics-title" className="logo-title" style={{ fontSize: '1.4rem', margin: 0 }}>
          📊 Weekly Stress-Level Weather Chart
        </h2>
        
        {/* Simple Bar Chart */}
        <div className="bar-chart" aria-label="Bar chart showing mood scores over time.">
          {recentJournals.map((j, index) => {
            const date = new Date(j.created_at);
            const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const heightPercentage = (Number(j.mood_score || 0) / 10) * 100;

            return (
              <div key={index} className="chart-bar-wrapper">
                <div 
                  className="chart-bar" 
                  style={{ height: `${heightPercentage}%` }} 
                  title={`Mood: ${j.mood_score}/10 on ${label}`}
                />
                <span className="chart-label">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Identified Stressors */}
        <div>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: '1rem 0 0.5rem 0' }}>
            Flagged Academic Stressors
          </h3>
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
              No academic stressors flagged yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
