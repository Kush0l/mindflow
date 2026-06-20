/**
 * @fileoverview Enhanced Mindfulness component.
 * Features Guided Breathing, Web Audio API sound synthesis,
 * and an interactive generative Zen Sandbox grounding canvas.
 *
 * @author MindFlow Team
 * @version 1.3.0
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
    desc: 'Quick focus breathing to combat fatigue and exam burnout.',
    inhale: 4,
    hold: 0,
    exhale: 4,
    holdPost: 0,
  },
};

/**
 * ZenSandbox Component - Generative Particle Drawing Board
 * @returns {React.ReactElement}
 */
function ZenSandbox() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const isDrawingRef = useRef(false);
  const requestRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize handler
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 350;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class helper
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 6 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * -1.5 - 0.5;
        this.hue = Math.random() * 60 + 180; // Blue to purple spectrum HSL
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.008;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= this.decay;
        if (this.size > 0.2) this.size -= 0.05;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        // Soothing glow gradient
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, `hsla(${this.hue}, 100%, 80%, 1)`);
        grad.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
        ctx.fill();
        ctx.restore();
      }
    }

    const addParticles = (x, y, count = 3) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(new Particle(x, y));
      }
    };

    const handleMove = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      addParticles(x, y);
    };

    // Listeners
    const onMouseMove = (e) => {
      if (!isDrawingRef.current && e.buttons !== 1) return;
      handleMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('mousedown', () => { isDrawingRef.current = true; });
    window.addEventListener('mouseup', () => { isDrawingRef.current = false; });

    // Animation Loop
    const draw = () => {
      // Trail effect
      ctx.fillStyle = 'rgba(10, 11, 22, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0 || particles[i].size <= 0.2) {
          particles.splice(i, 1);
        }
      }

      requestRef.current = requestAnimationFrame(draw);
    };
    requestRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
        🌌 <strong>Zen Grounding Sandbox:</strong> Click and drag your cursor (or swipe your finger) slowly to trace soothing trails and clear your mind.
      </p>
      <div style={{ width: '100%', background: '#0a0b16', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <canvas 
          ref={canvasRef} 
          style={{ display: 'block', cursor: 'crosshair' }} 
          aria-label="Zen Sandbox Drawing Board. Click and drag to create floating particles."
        />
      </div>
    </div>
  );
}

/**
 * Mindfulness Component
 * @param {Object} props
 * @param {string} props.activePaceName
 * @param {Object} props.activePaceConfig
 * @returns {React.ReactElement}
 */
export default function Mindfulness({ activePaceName, activePaceConfig }) {
  const [subTab, setSubTab] = useState('breathing'); // 'breathing' | 'zen'
  const [selectedPace, setSelectedPace] = useState('Grounding Breath (5-5 Calm)');
  const [phase, setPhase] = useState('exhale');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // References for timing & audio synthesis
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const osc1Ref = useRef(null);
  const osc2Ref = useRef(null);
  const gainNodeRef = useRef(null);

  // Load preselected recommendations
  useEffect(() => {
    if (activePaceName && breathingPaces[activePaceName]) {
      setSelectedPace(activePaceName);
      setIsActive(true);
    } else if (activePaceConfig && activePaceConfig.inhale) {
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

  // Initialize Web Audio Synth
  const initAudio = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Master gain node
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;

      // Two warm sine oscillators for a soothing ambient minor third interval chord
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(196.00, ctx.currentTime); // G3 note
      osc1.connect(gainNode);
      osc1.start();
      osc1Ref.current = osc1;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(233.08, ctx.currentTime); // Bb3 note (Minor third - comforting)
      osc2.connect(gainNode);
      osc2.start();
      osc2Ref.current = osc2;
    } catch (e) {
      console.warn("Web Audio API not supported in this browser:", e);
    }
  };

  // Adjust audio parameters dynamically based on breathing phase
  const adjustAudioSynth = (currentPhase, secondsInPhase) => {
    if (!soundEnabled || !audioCtxRef.current || !gainNodeRef.current) return;
    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;
    const osc1 = osc1Ref.current;
    const osc2 = osc2Ref.current;

    const t = ctx.currentTime;

    if (currentPhase === 'inhale') {
      // Swell volume and raise frequency slightly
      gain.gain.linearRampToValueAtTime(0.25, t + secondsInPhase);
      osc1.frequency.exponentialRampToValueAtTime(220.00, t + secondsInPhase); // swell up to A3
      osc2.frequency.exponentialRampToValueAtTime(261.63, t + secondsInPhase); // swell up to C4
    } else if (currentPhase === 'hold') {
      // Hold high drone volume
      gain.gain.setValueAtTime(0.25, t);
    } else if (currentPhase === 'exhale') {
      // Fade out volume and return frequency
      gain.gain.linearRampToValueAtTime(0.02, t + secondsInPhase);
      osc1.frequency.exponentialRampToValueAtTime(196.00, t + secondsInPhase);
      osc2.frequency.exponentialRampToValueAtTime(233.08, t + secondsInPhase);
    } else {
      // holdPost (empty) - complete silence
      gain.gain.linearRampToValueAtTime(0, t + 0.5);
    }
  };

  // Handle breathing state machine
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('exhale');
      setSecondsLeft(0);
      
      // Turn off synth
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.3);
      }
      return;
    }

    // Trigger audio initialization on start
    if (soundEnabled && !audioCtxRef.current) {
      initAudio();
    }

    let currentPhase = 'inhale';
    let duration = currentPace.inhale;
    setPhase(currentPhase);
    setSecondsLeft(duration);
    adjustAudioSynth(currentPhase, duration);

    // Track completed sessions locally
    let tickCount = 0;
    const secondsPerCycle = currentPace.inhale + currentPace.hold + currentPace.exhale + currentPace.holdPost;

    timerRef.current = setInterval(() => {
      // Log mindfulness completions
      tickCount++;
      if (tickCount % secondsPerCycle === 0) {
        const currentCount = Number(localStorage.getItem('mindflow_sessions_completed') || 0);
        localStorage.setItem('mindflow_sessions_completed', String(currentCount + 1));
      }

      setSecondsLeft((prev) => {
        if (prev <= 1) {
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
          adjustAudioSynth(currentPhase, duration);
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, selectedPace, soundEnabled]);

  // Clean up sound context on unmount
  useEffect(() => {
    return () => {
      if (osc1Ref.current) osc1Ref.current.stop();
      if (osc2Ref.current) osc2Ref.current.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

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
    <section className="glass-card" aria-labelledby="mindfulness-title">
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.8rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setSubTab('breathing')}
          className="tab-btn"
          style={{ flex: 'none', background: subTab === 'breathing' ? 'rgba(255,255,255,0.06)' : 'transparent', color: subTab === 'breathing' ? '#fff' : 'var(--text-muted)' }}
        >
          🧘 Guided Breathing
        </button>
        <button
          type="button"
          onClick={() => setSubTab('zen')}
          className="tab-btn"
          style={{ flex: 'none', background: subTab === 'zen' ? 'rgba(255,255,255,0.06)' : 'transparent', color: subTab === 'zen' ? '#fff' : 'var(--text-muted)' }}
        >
          🌌 Zen Sandbox
        </button>
      </div>

      {subTab === 'zen' ? (
        <ZenSandbox />
      ) : (
        <div className="mindfulness-center">
          <h2 id="mindfulness-title" className="logo-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'none' }}>
            Breathing Space
          </h2>

          {/* Pace Selectors */}
          <div className="pace-selector" role="tablist" aria-label="Breathing exercises">
            {Object.entries(breathingPaces).map(([name, config]) => (
              <button
                key={name}
                type="button"
                className={`pace-btn ${selectedPace === name ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPace(name);
                  setIsActive(false);
                }}
                role="tab"
                aria-selected={selectedPace === name}
              >
                {config.label}
              </button>
            ))}
          </div>

          <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            "{currentPace.desc}"
          </p>

          {/* Audio Synthesizer Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <input
              type="checkbox"
              id="audio-synth-toggle"
              checked={soundEnabled}
              onChange={(e) => {
                setSoundEnabled(e.target.checked);
                setIsActive(false); // Reset
              }}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="audio-synth-toggle" style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              🔊 Enable Soothing Binaural Audio Guide (Ambient Synthesizer)
            </label>
          </div>

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
        </div>
      )}
    </section>
  );
}
