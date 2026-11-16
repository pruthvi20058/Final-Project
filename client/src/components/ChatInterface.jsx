import { useState, useRef, useEffect } from 'react';
import { sendChat } from '../utils/api';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m the MediAgent AI Assistant, powered by RAG (Retrieval-Augmented Generation). I can answer questions about medical conditions, symptoms, treatments, drug interactions, and clinical guidelines.\n\nTry asking me about:\n• Symptoms of pneumonia\n• Treatment for hypertension\n• Drug interactions with Warfarin\n• What is COPD?\n\n⚕️ *This is a demonstration system — not for real clinical use.*' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await sendChat(userMsg, sessionId);
      if (res.sessionId) setSessionId(res.sessionId);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, sources: res.sources }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setLoading(false);
  };

  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} style={{ fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <p key={i} style={{ paddingLeft: 12 }}>• {line.substring(2)}</p>;
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={i} style={{ fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 6 }}>{line.replace(/\*/g, '')}</p>;
      }
      return line ? <p key={i}>{line}</p> : <br key={i} />;
    });
  };

  const quickPrompts = [
    'What are the symptoms of a heart attack?',
    'Tell me about pneumonia treatment',
    'What drugs interact with Warfarin?',
    'COPD management guidelines'
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>💬 AI Assistant</h2>
        <p>Chat with MediAgent's RAG-powered medical knowledge engine</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="chat-container" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="chat-messages" style={{ padding: '20px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                {renderContent(msg.content)}
                {msg.sources?.length > 0 && (
                  <div style={{ marginTop: 8, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Sources: </span>
                    {msg.sources.map((s, j) => (
                      <span key={j} className="chip chip-teal" style={{ fontSize: '0.65rem', margin: 2 }}>
                        {s.name} ({s.relevance}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div className="spinner"></div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Searching knowledge base...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {quickPrompts.map((p, i) => (
                <button key={i} className="btn btn-secondary btn-sm" onClick={() => { setInput(p); }}
                  style={{ fontSize: '0.78rem' }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-area" style={{ padding: '14px 20px' }}>
            <input className="form-input" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about symptoms, conditions, treatments..." />
            <button className="btn btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
