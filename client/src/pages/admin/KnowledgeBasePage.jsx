import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import { evidenceService } from '../../services/api';

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadSources() {
      try {
        setLoading(true);
        // KnowledgeBasePage displays general educational sources from the RAG knowledge base.
        // Evidence for a specific report is retrieved via GET /api/reports/:id/evidence.
        const data = await evidenceService.getEvidence('general');
        if (mounted) {
          const srcs = data && data.sources ? data.sources : [];
          setSources(Array.isArray(srcs) ? srcs : []);
        }
      } catch (err) {
        if (mounted) {
          // Evidence may be unavailable — show empty state rather than fabricated sources
          setSources([]);
          setError(err.message || 'Unable to load knowledge base sources');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSources();
    return () => { mounted = false; };
  }, []);

  const filtered = sources.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    (s.summary && s.summary.toLowerCase().includes(query.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 60, textAlign: 'center' }}>
        <DemoBanner />
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading knowledge base...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🌐 RAG Medical Knowledge Base</h2>
        <p>Indexed clinical practice guidelines and verified medical sources from the RAG retrieval system.</p>
      </div>

      {error && (
        <div style={{ padding: 20, maxWidth: 640, margin: '0 auto 20px auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: '0.85rem' }}>
          ⚠️ {error}. No fabricated sources are displayed.
        </div>
      )}

      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
        <form onSubmit={(e) => { e.preventDefault(); }} style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search indexed medical literature (e.g. ADA diabetes guidelines, Troponin thresholds)..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="button" onClick={() => {}}>
            🔍 Search
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.length > 0 ? (
          filtered.map(source => (
            <div key={source.id || source.title} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    {source.type || 'Clinical Guideline'}
                  </span>
                  <h4 style={{ color: '#fff', fontSize: '1.05rem', marginTop: 4 }}>{source.title}</h4>
                  {source.section && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Section: {source.section}</span>
                  )}
                </div>
                {source.relevanceScore !== null && source.relevanceScore !== undefined && (
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                    Relevance: {source.relevanceScore}%
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-elevated)', padding: 12, borderRadius: 6 }}>
                "{source.summary || 'No excerpt available.'}"
              </p>

              {source.organization || source.publicationDate || source.url && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.76rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                  {source.organization && <span>🏢 {source.organization}</span>}
                  {source.publicationDate && <span>📅 {source.publicationDate}</span>}
                  {source.url && <span>🔗 {source.url}</span>}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            {sources.length === 0 && !error ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
                <p>No evidence sources available from the RAG knowledge base.</p>
                <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: 8 }}>
                  Evidence sources are retrieved dynamically via GET /api/reports/:id/evidence for verified reports.
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
