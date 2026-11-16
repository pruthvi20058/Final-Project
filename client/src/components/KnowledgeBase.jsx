import { useState, useEffect } from 'react';
import { fetchConditions, fetchCondition, searchKnowledge } from '../utils/api';

export default function KnowledgeBase() {
  const [conditions, setConditions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => { fetchConditions().then(setConditions).catch(() => {}); }, []);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const results = await searchKnowledge(search);
    setSearchResults(results);
  };

  const loadCondition = async (id) => {
    const cond = await fetchCondition(id);
    setSelected(cond);
  };

  const categoryColors = {
    Respiratory: 'chip-blue', Cardiovascular: 'chip-red', Endocrine: 'chip-amber',
    Infectious: 'chip-teal', Neurological: 'chip-indigo', Gastrointestinal: 'chip-amber',
    Psychiatric: 'chip-indigo', Renal: 'chip-blue', Immunological: 'chip-red'
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>📚 Medical Knowledge Base</h2>
        <p>Browse conditions, guidelines, and drug interactions powered by RAG</p>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search symptoms, conditions, or treatments..." 
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button className="btn btn-primary" onClick={handleSearch}>🔍 Search</button>
        </div>
        {searchResults && (
          <div style={{ marginTop: 14 }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              RAG Results ({searchResults.length} matches)
            </h4>
            {searchResults.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                marginBottom: 6, cursor: 'pointer', border: '1px solid var(--border-color)'
              }} onClick={() => loadCondition(r.condition.id)}>
                <span style={{ fontWeight: 600 }}>{r.condition.name}</span>
                <span className="chip chip-teal">{r.relevanceScore}% match</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Condition Detail */}
      {selected ? (
        <div className="card slide-in" style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.3rem' }}>{selected.name}</h3>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <span className={`chip ${categoryColors[selected.category] || 'chip-blue'}`}>{selected.category}</span>
                <span className="chip chip-indigo">ICD-10: {selected.icd10}</span>
                <span className={`chip ${selected.severity === 'critical' ? 'chip-red' : selected.severity?.includes('high') ? 'chip-amber' : 'chip-teal'}`}>
                  {selected.severity}
                </span>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>✕ Close</button>
          </div>
          <hr className="section-divider" />
          <div className="grid-2">
            <div>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>Symptoms</h4>
              <div className="symptom-chips">
                {selected.symptoms?.map((s, i) => <span key={i} className="chip chip-teal">{s}</span>)}
              </div>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Risk Factors</h4>
              <div className="symptom-chips">
                {selected.risk_factors?.map((r, i) => <span key={i} className="chip chip-amber">{r}</span>)}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>Clinical Guidelines</h4>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{selected.guidelines}</p>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Treatments</h4>
              {selected.treatments?.map((t, i) => (
                <div key={i} style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 4, fontSize: '0.85rem' }}>
                  💊 {t}
                </div>
              ))}
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>Differentials</h4>
              <div className="symptom-chips">
                {selected.differentials?.map((d, i) => <span key={i} className="chip chip-indigo">{d}</span>)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Condition Grid */}
      <div className="condition-grid">
        {conditions.map(c => (
          <div key={c.id} className="card condition-card" onClick={() => loadCondition(c.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className={`chip ${categoryColors[c.category] || 'chip-blue'} condition-category`}>{c.category}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{c.icd10}</span>
            </div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: 4 }}>{c.name}</h4>
            <span className={`chip ${c.severity === 'critical' ? 'chip-red' : c.severity?.includes('high') ? 'chip-amber' : 'chip-teal'}`} style={{ fontSize: '0.68rem' }}>
              {c.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
