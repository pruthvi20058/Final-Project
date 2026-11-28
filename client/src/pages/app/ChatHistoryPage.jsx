import React, { useState, useEffect } from 'react';
import { healthCompanionService } from '../../services/api';

export default function ChatHistoryPage({ onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await healthCompanionService.getChatSessions();
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        selectSession(data[0].sessionId);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectSession = async (sid) => {
    setSelectedSessionId(sid);
    try {
      const data = await healthCompanionService.getChatHistory(sid);
      setMessages(data);
    } catch (err) {
      console.error('Fetch session messages error:', err);
    }
  };

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;
    try {
      await healthCompanionService.deleteChatSession(sid);
      setSessions(prev => prev.filter(s => s.sessionId !== sid));
      if (selectedSessionId === sid) {
        setSelectedSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      alert('Delete session error: ' + err.message);
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>📜</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Health Companion Chat History
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Review past health inquiries, responses, and source citations • Full user data privacy controls
          </p>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('companion')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>💬</span>
          <span>New Consultation</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', minHeight: '600px' }}>
        {/* Sessions Sidebar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '700px' }}>
          <h4 style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Saved Sessions ({sessions.length})
          </h4>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
              No chat sessions saved yet. Start chatting in Health Companion!
            </div>
          ) : (
            sessions.map(s => (
              <div
                key={s.sessionId}
                onClick={() => selectSession(s.sessionId)}
                style={{
                  background: selectedSessionId === s.sessionId ? 'var(--bg-elevated)' : 'transparent',
                  border: selectedSessionId === s.sessionId ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Session: {s.sessionId.slice(0, 14)}...
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {s.messageCount} messages • {s.preferredLanguage.toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(s.sessionId, e)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                  title="Delete Session"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Message Thread Viewer */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '700px' }}>
          {selectedSessionId ? (
            messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No messages in this session.
              </div>
            ) : (
              messages.map(m => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    backgroundColor: m.role === 'user' ? 'var(--accent-primary-dim)' : 'var(--bg-card)',
                    border: m.role === 'user' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                  }}
                >
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                    {m.role === 'user' ? 'User Question' : `MediAgent Assistant • Tool: ${m.toolInvoked || 'NLP'}`}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.role === 'user' ? m.originalMessage : m.response}
                  </div>
                </div>
              ))
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
              Select a session on the left to view the complete conversation transcript.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
