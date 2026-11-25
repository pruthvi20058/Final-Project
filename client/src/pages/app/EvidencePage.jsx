import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { evidenceService, reportService } from '../../services/api';

export default function EvidencePage({ predictionId, reportId = 'REP-9001', onNavigate }) {
  const [evidence, setEvidence] = useState(null);
  const [report, setReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadEvidence() {
      try {
        setErrorMsg(null);
        const activeId = reportId || (predictionId ? predictionId.replace('PRED-', '') : 'REP-9001');
        const r = await reportService.getById(activeId);
        const data = await evidenceService.getEvidence(r?.id || activeId);
        if (mounted && data) {
          if (r) setReport(r);
          setEvidence(data);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Unable to connect to the MediAgent server. Please try again.');
        }
      }
    }
    loadEvidence();
    return () => { mounted = false; };
  }, [predictionId, reportId]);

  if (errorMsg) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔌</div>
        <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Unable to load medical evidence</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{errorMsg}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry ↻
        </button>
      </div>
    );
  }

  if (!evidence || !report) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Querying FAISS medical vector database...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📚 Medical Evidence Retrieval (RAG)</h2>
          <p>FAISS vector search matching findings from <strong style={{ color: '#00d4aa' }}>{report.filename}</strong> against indexed clinical practice guidelines.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('risk-uncertainty')}>
          View Risk & Uncertainty Assessment →
        </button>
      </div>

      {/* EVIDENCE CONSISTENCY SUMMARY CARD */}
      <div className="card" style={{
        background: evidence.consistencyStatus === 'conflict_detected' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
        border: `1px solid ${evidence.consistencyStatus === 'conflict_detected' ? '#ef4444' : 'var(--border-color)'}`,
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: '2rem' }}>
              {evidence.consistencyStatus === 'high' ? '🎯' : evidence.consistencyStatus === 'conflict_detected' ? '⚠️' : '🔍'}
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: 2 }}>Prediction–Evidence Consistency Status</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                FAISS vector relevance match score: <strong style={{ color: '#00d4aa' }}>{evidence.consistencyScore}%</strong>
              </p>
            </div>
          </div>
          <StatusBadge status={evidence.consistencyStatus} />
        </div>

        {evidence.consistencyStatus === 'conflict_detected' && (
          <div style={{ marginTop: 14, padding: 12, background: 'rgba(239, 68, 68, 0.15)', borderRadius: 8, color: '#ef4444', fontSize: '0.84rem' }}>
            ⚠️ <strong>Prediction and retrieved evidence are not fully consistent.</strong> Additional clinical review recommended.
          </div>
        )}
      </div>

      {/* RETRIEVED EVIDENCE CARDS */}
      <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 16 }}>Retrieved Clinical Literature & Guidelines</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {evidence.sources.map(source => (
          <div key={source.id} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: source.type === 'Clinical Guideline' ? 'rgba(0,212,170,0.15)' : 'rgba(99,102,241,0.15)',
                  color: source.type === 'Clinical Guideline' ? '#00d4aa' : '#a5b4fc', textTransform: 'uppercase'
                }}>
                  {source.type}
                </span>
                <h4 style={{ color: '#fff', fontSize: '1.05rem', marginTop: 6, marginBottom: 2 }}>
                  {source.title}
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  Section: {source.section}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'block' }}>Relevance</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00d4aa' }}>{source.relevanceScore}%</span>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12
            }}>
              "{source.summary}"
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Indexed Source ID: {source.id}</span>
              <a href={source.link} target="_blank" rel="noreferrer" style={{ color: '#00d4aa', textDecoration: 'none', fontWeight: 600 }}>
                View Original Document ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
