/**
 * @fileoverview Custom React hook for the Stress Weather widget.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import { useMemo } from 'react';

/**
 * Calculates emotional weather details based on the user's journal logs.
 *
 * @param {Array<Object>} journals - Historical journal logs
 * @returns {{ avgMood: string, weather: { icon: string, name: string, desc: string, class: string } }}
 */
export default function useWeatherWidget(journals) {
  const avgMood = useMemo(() => {
    if (!journals || journals.length === 0) return '0.0';
    const total = journals.length;
    const moodScores = journals.map((j) => Number(j.mood_score || 0));
    return (moodScores.reduce((sum, val) => sum + val, 0) / total).toFixed(1);
  }, [journals]);

  const weather = useMemo(() => {
    const score = Number(avgMood);
    if (score >= 8) {
      return { icon: '☀️', name: 'Clear Skies', desc: 'Balanced & Composed', class: 'sunny' };
    } else if (score >= 6) {
      return { icon: '🌤️', name: 'Partly Cloudy', desc: 'Mild Preparation Pressure', class: 'cloudy' };
    } else if (score >= 4) {
      return { icon: '☁️', name: 'Overcast', desc: 'High Stress Load', class: 'overcast' };
    } else {
      return { icon: '⛈️', name: 'Stormy / High Pressure', desc: 'Severe Exam Burnout', class: 'stormy' };
    }
  }, [avgMood]);

  return { avgMood, weather };
}
