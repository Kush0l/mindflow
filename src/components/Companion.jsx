/**
 * @fileoverview Companion component.
 * Handles the digital chatbot dialogue and animated avatar expressions.
 *
 * @author MindFlow Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';

const expressionsMap = {
  calm: { emoji: '😌', color: 'rgba(6, 182, 212, 0.4)' },
  empathetic: { emoji: '🫂', color: 'rgba(147, 51, 234, 0.4)' },
  encouraging: { emoji: '✨', color: 'rgba(16, 185, 129, 0.4)' },
  listening: { emoji: '👂', color: 'rgba(107, 114, 128, 0.4)' },
  thoughtful: { emoji: '🤔', color: 'rgba(245, 158, 11, 0.4)' },
  alert: { emoji: '❤️', color: 'rgba(239, 68, 68, 0.4)' },
};

/**
 * Companion Component
 * @param {Object} props
 * @param {Array<Object>} props.chats - Chat history list
 * @param {string} props.deviceId - Device UUID
 * @param {function(Object): void} props.onNewMessage - Callback for logging message
 * @returns {React.ReactElement}
 */
export default function Companion({ chats = [], deviceId, onNewMessage }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState('calm');
  const chatEndRef = useRef(null);

  // Auto-scroll chat window to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setExpression('listening');

    // Save user message locally first
    const uMsg = { role: 'user', content: userMessage, created_at: new Date().toISOString() };
    onNewMessage(uMsg);

    // Filter past chats into standard role/content format
    const historyPayload = chats.map((c) => ({
      role: c.role === 'user' ? 'user' : 'model',
      content: c.content,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          message: userMessage,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reach companion API');
      }

      const result = await response.json();
      if (result.success) {
        setExpression(result.data.expression || 'calm');
        onNewMessage({
          role: 'assistant',
          content: result.data.response,
          created_at: result.data.created_at,
        });
      } else {
        throw new Error(result.message || 'Chatbot reasoning failed');
      }
    } catch (error) {
      console.error(error);
      setExpression('alert');
      onNewMessage({
        role: 'assistant',
        content: "I'm having trouble connecting right now, but please remember: you are not defined by an exam. Take a deep breath. Let's try again in a few seconds.",
        created_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const expInfo = expressionsMap[expression] || expressionsMap.calm;

  return (
    <section className="glass-card chat-container" aria-labelledby="chat-companion-title">
      {/* Header & Avatar */}
      <div className="chat-header">
        <div 
          className={`avatar-circle ${expression}`} 
          style={{ background: expInfo.color }}
          aria-hidden="true"
        >
          {expInfo.emoji}
        </div>
        <div>
          <h2 id="chat-companion-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
            Aura — Digital Companion
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Status: {loading ? 'thinking...' : expression === 'listening' ? 'listening...' : 'ready to support'}
          </span>
        </div>
      </div>

      {/* History */}
      <div className="chat-history" aria-label="Conversation history with Aura">
        {chats.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', maxWidth: '400px' }}>
            <p>👋 Hi! I'm Aura, your mental wellness companion.</p>
            <p>Exam preparation can feel overwhelming. How are you feeling today? Talk to me about your stress, study schedule, or anything on your mind.</p>
          </div>
        ) : (
          chats.map((c, index) => (
            <div 
              key={index} 
              className={`chat-bubble ${c.role === 'user' ? 'user' : 'model'}`}
            >
              {c.content}
            </div>
          ))
        )}
        {loading && (
          <div className="chat-bubble model skeleton-loader" style={{ width: '40%' }}>
            <div className="skeleton-line" style={{ width: '100%', margin: 0 }}></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share what is bothering you..."
          disabled={loading}
          aria-label="Message text"
          aria-required="true"
        />
        <button type="submit" className="btn-primary" disabled={loading || !message.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
