/**
 * @fileoverview Mindfulness component.
 * Interactive breathing bubble coach with multiple pacing exercises.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';

const breathingPaces = {
  'Panic Relief (4-7-8 Breathing)': {
    label: 'Panic Relief (4-7-8)',
    desc: 'Calms hyperventilation and extreme exam anxiety.',
    inhale: 4,
    hold: 7,
    exhale: 8,
    holdPost: 0,
  },
  'Focus Box (4-4-4-4 Box Breathing)': {
    label: 'Focus Box (4-4-4-4)',
    desc: 'Resets cognitive focus before mock tests or study sessions.',
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdPost: 4,
  },
  'Grounding Breath (5-5 Calm)': {
    label: 'Grounding Calm (5-5)',
    desc: 'Steady, deep breathing to counter generalized academic stress.',
    inhale: 5,
    hold: 0,
    exhale: 5,
    holdPost: 0,
  },
  'Energizing Breath (4-4 Breath)': {
    label: 'Energizing Boost (4-4)',
    desc: 'Quick shallow focus breathing to combat fatigue and burnout.',
    inhale: 4,
    hold: 0,
    exhale: 4,
    holdPost: 0,
  },
};

/**
 * Mindfulness Component
 * @param {Object} props
 * @param {string} props.activePaceName - Preselected exercise name from journal recommendation
 * @param {Object} props.activePaceConfig - Preselected pace values from journal recommendation
 * @returns {React.ReactElement}
 */
export default function Mindfulness({ activePaceName, activePaceConfig }) {
  const [selectedPace, setSelectedPace] = useState('Grounding Breath (5-5 Calm)');
  const [phase, setPhase] = useState('exhale'); // 'inhale', 'hold', 'exhale', 'holdPost'
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef(null);

  // Load preselected recommendation if provided
  useEffect(() => {
    if (activePaceName && breathingPaces[activePaceName]) {
      setSelectedPace(activePaceName);
      setIsActive(true);
    } else if (activePaceConfig && activePaceConfig.inhale) {
      // Direct custom configuration fallback
      breathingPaces['Custom Recommended'] = {
        label: 'Custom Recommended',
        desc: 'Customized stress-level breathing pace.',
        ...activePaceConfig,
      };
      setSelectedPace('Custom Recommended');
      setIsActive(true);
    }
  }, [activePaceName, activePaceConfig]);

  const currentPace = breathingPaces[selectedPace] || breathingPaces['Grounding Breath (5-5 Calm)'];

  // Handle breathing state machine
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('exhale');
      setSecondsLeft(0);
      return;
    }

    // Start of loop
    let currentPhase = 'inhale';
    let duration = currentPace.inhale;
    setPhase(currentPhase);
    setSecondsLeft(duration);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Transition to next phase
          if (currentPhase === 'inhale') {
            if (currentPace.hold > 0) {
              currentPhase = 'hold';
              duration = currentPace.hold;
            } else {
              currentPhase = 'exhale';
              duration = currentPace.exhale;
            }
          } else if (currentPhase === 'hold') {
            currentPhase = 'exhale';
            duration = currentPace.exhale;
          } else if (currentPhase === 'exhale') {
            if (currentPace.holdPost > 0) {
              currentPhase = 'holdPost';
              duration = currentPace.holdPost;
            } else {
              currentPhase = 'inhale';
              duration = currentPace.inhale;
            }
          } else if (currentPhase === 'holdPost') {
            currentPhase = 'inhale';
            duration = currentPace.inhale;
          }

          setPhase(currentPhase);
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, selectedPace]);

  const toggleTrainer = () => {
    setIsActive(!isActive);
  };

  const getPhaseText = () => {
    if (!isActive) return 'Ready';
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'hold') return 'Hold';
    if (phase === 'exhale') return 'Exhale';
    if (phase === 'holdPost') return 'Hold Empty';
    return '';
  };

  return (
    <section className="glass-card mindfulness-center" aria-labelledby="mindfulness-title">
      <h2 id="mindfulness-title" className="logo-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        🧘 Adaptive Mindfulness Breathing
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '500px', marginBottom: '2rem' }}>
        Practice guided respiratory feedback. Select a rhythm below, or let Aura analyze your journal logs to assign a custom pacing.
      </p>

      {/* Pace Selectors */}
      <div className="pace-selector" role="tablist" aria-label="Breathing exercises">
        {Object.entries(breathingPaces).map(([name, config]) => (
          <button
            key={name}
            type="button"
            className={`pace-btn ${selectedPace === name ? 'active' : ''}`}
            onClick={() => {
              setSelectedPace(name);
              setIsActive(false); // Reset timer on change
            }}
            role="tab"
            aria-selected={selectedPace === name}
          >
            {config.label}
          </button>
        ))}
      </div>

      <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        "{currentPace.desc}"
      </p>

      {/* Breathing Bubble */}
      <div className="breathing-bubble-wrapper">
        <div 
          className={`breathing-bubble ${isActive ? phase : 'exhale'}`}
          aria-live="polite"
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', textTransform: 'uppercase' }}>{getPhaseText()}</div>
            {isActive && <div style={{ fontSize: '1.8rem', marginTop: '0.2rem' }}>{secondsLeft}s</div>}
          </div>
        </div>
      </div>

      {/* Trigger Button */}
      <button 
        type="button" 
        className="btn-primary" 
        style={{
          background: isActive 
            ? 'linear-gradient(135deg, #ef4444, #b91c1c)' 
            : 'linear-gradient(135deg, #10b981, #047857)',
          fontSize: '1.1rem',
          padding: '0.8rem 2.5rem'
        }}
        onClick={toggleTrainer}
      >
        {isActive ? 'Stop Session' : 'Start Session'}
      </button>
    </section>
  );
}
