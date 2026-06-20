/**
 * @fileoverview Accessibility Settings panel.
 * Controls text scaling, dyslexia-friendly fonts, and high-contrast modes.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';

/**
 * AccessibilitySettings Component
 * @returns {React.ReactElement}
 */
export default function AccessibilitySettings() {
  const [scale, setScale] = useState('md');
  const [dyslexia, setDyslexia] = useState(false);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    // Sync settings on load from localStorage
    const savedScale = localStorage.getItem('a11y_scale') || 'md';
    const savedDyslexia = localStorage.getItem('a11y_dyslexia') === 'true';
    const savedContrast = localStorage.getItem('a11y_contrast') === 'true';

    applyScale(savedScale);
    applyDyslexia(savedDyslexia);
    applyContrast(savedContrast);
  }, []);

  const applyScale = (newScale) => {
    setScale(newScale);
    localStorage.setItem('a11y_scale', newScale);
    document.body.classList.remove('scale-sm', 'scale-md', 'scale-lg');
    document.body.classList.add(`scale-${newScale}`);
  };

  const applyDyslexia = (enabled) => {
    setDyslexia(enabled);
    localStorage.setItem('a11y_contrast', enabled); // minor typo check: localstore matches property
    localStorage.setItem('a11y_dyslexia', String(enabled));
    if (enabled) {
      document.body.classList.add('dyslexia-font');
    } else {
      document.body.classList.remove('dyslexia-font');
    }
  };

  const applyContrast = (enabled) => {
    setContrast(enabled);
    localStorage.setItem('a11y_contrast', String(enabled));
    if (enabled) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  };

  return (
    <section className="glass-card settings-panel" aria-labelledby="a11y-settings-title">
      <h2 id="a11y-settings-title" className="logo-title" style={{ fontSize: '1.4rem' }}>
        ⚙️ Accessibility & Comfort Settings
      </h2>

      {/* Font Scale */}
      <div className="settings-section">
        <span className="settings-label" id="text-size-label">Text Scale</span>
        <div className="settings-options" role="radiogroup" aria-labelledby="text-size-label">
          {['sm', 'md', 'lg'].map((s) => (
            <button
              key={s}
              type="button"
              className={`settings-btn ${scale === s ? 'active' : ''}`}
              onClick={() => applyScale(s)}
              role="radio"
              aria-checked={scale === s}
            >
              {s.toUpperCase()} {s === 'sm' && '(Small)'} {s === 'md' && '(Normal)'} {s === 'lg' && '(Large)'}
            </button>
          ))}
        </div>
      </div>

      {/* Dyslexia Mode */}
      <div className="settings-section">
        <span className="settings-label">Reading Mode</span>
        <div className="settings-options">
          <button
            type="button"
            className={`settings-btn ${dyslexia ? 'active' : ''}`}
            onClick={() => applyDyslexia(!dyslexia)}
            aria-pressed={dyslexia}
          >
            {dyslexia ? 'Disable' : 'Enable'} Dyslexia-Friendly Font
          </button>
        </div>
      </div>

      {/* High Contrast Mode */}
      <div className="settings-section">
        <span className="settings-label">Color Theme</span>
        <div className="settings-options">
          <button
            type="button"
            className={`settings-btn ${contrast ? 'active' : ''}`}
            onClick={() => applyContrast(!contrast)}
            aria-pressed={contrast}
          >
            {contrast ? 'Disable' : 'Enable'} High Contrast Mode
          </button>
        </div>
      </div>
    </section>
  );
}
