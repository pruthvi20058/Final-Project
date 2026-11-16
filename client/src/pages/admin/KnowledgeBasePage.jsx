import React, { useState } from 'react';
import DemoBanner from '../../components/DemoBanner';
import { DEMO_EVIDENCE } from '../../services/api';

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState(DEMO_EVIDENCE.sources);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSources(prev => prev.filter(s => s.title.toLowerCase().includes(query.toLowerCase()) || s.summary.toLowerCase().includes(query.toLowerCase())));
  };

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🌐 RAG Medical Knowledge Base & Vector Index</h2>
        <p>Manage indexed clinical practice guidelines, peer-reviewed medical papers, and vector embedding sources.</p>
      </div>

      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search indexed medical literature (e.g. ADA diabetes guidelines, Troponin thresholds)..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="submit">
            🔍 Vector Search
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sources.map(source => (
          <div key={source.id} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: '0.72rem', background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  {source.type}
                </span>
                <h4 style={{ color: '#fff', fontSize: '1.05rem', marginTop: 4 }}>{source.title}</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Section: {source.section}</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>Indexed in FAISS</span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-elevated)', padding: 12, borderRadius: 6 }}>
              "{source.summary}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
