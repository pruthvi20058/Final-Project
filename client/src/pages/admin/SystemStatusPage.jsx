import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { evaluationService } from '../../services/api';

const STATUS_COLORS = {
  ONLINE: '#10b981',
  CONFIGURED: '#10b981',
  OFFLINE: '#ef4444',
  UNAVAILABLE: '#f59e0b',
  UNKNOWN: '#94a3b8',
  ERROR: '#ef4444'
};

export default function SystemStatusPage() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      try {
        setLoading(true);
        const data = await evaluationService.getSystemStatus();
        if (mounted) {
          setChecks(data.checks || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load system status');
          setChecks([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStatus();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 60, textAlign: 'center' }}>
        <DemoBanner />
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading system status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
        <DemoBanner />
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
        <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Unable to Load System Status</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry ↻
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🟢 Live System Health & Service Status</h2>
        <p>Real-time operational status for all MediAgent backend services, ML models, OCR, and RAG knowledge base.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {checks.map((s, idx) => {
          const color = STATUS_COLORS[s.status] || STATUS_COLORS.UNKNOWN;
          return (
            <div key={idx} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>⚙️</span>
                <StatusBadge status={s.status} customColor={color} />
              </div>

              <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: 4 }}>{s.name}</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{s.detail}</p>
            </div>
          )
        })}
      </div>
    </div>
  );
}
