import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { mlService } from '../../services/api';

/**
 * Readiness -> display label + color
 */
function readinessInfo(readiness = 'UNKNOWN') {
  const r = String(readiness).toUpperCase();
  const map = {
    VERIFIED: { label: 'Verified', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    VERIFIED_LOW_PERFORMANCE: { label: 'Verified (Low Perf.)', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    LOW_PERFORMANCE: { label: 'Low Performance', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    NEEDS_VALIDATION: { label: 'Needs Validation', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    DATA_LEAKAGE_SUSPECTED: { label: 'Data Leakage Suspected', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    NOT_TRAINED: { label: 'Not Trained', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
    TRAINING: { label: 'Training', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
    FAILED: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    UNAVAILABLE: { label: 'Unavailable', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
  };
  return map[r] || { label: readiness, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
}

/**
 * Format a metric safely — never fabricate.
 */
function fmtMetric(val) {
  if (val === null || val === undefined) return 'N/A';
  const n = Number(val);
  if (!Number.isFinite(n)) return 'N/A';
  return (n * 100).toFixed(1) + '%';
}
function fmtScore(val) {
  if (val === null || val === undefined) return 'N/A';
  const n = Number(val);
  if (!Number.isFinite(n)) return 'N/A';
  return n.toFixed(3);
}

export default function ModelsPage({ onNavigate }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await mlService.getModels();
        if (res && res.success && res.models) {
          const list = Object.entries(res.models).map(([diseaseKey, m]) => ({
            disease: diseaseKey,
            display_name: m.display_name || diseaseKey.toUpperCase(),
            model_name: m.model_name || 'Standard Classifier',
            model_version: m.model_version || 'v1.0.0',
            status: m.status || 'UNKNOWN',
            readiness: m.readiness || 'UNKNOWN',
            readiness_reason: m.readiness_reason || '',
            features_count: m.features_count || (m.features ? m.features.length : 0),
            features: m.features || [],
            metrics: m.metrics || {},
            cv_metrics: m.cv_metrics || {},
            audit_flags: m.audit_flags || [],
            training_dataset: m.dataset_provenance
              ? `${m.dataset_provenance.name} (${m.dataset_provenance.sample_size || 0} records)`
              : `${diseaseKey} clinical dataset`,
            algorithm: m.algorithm || 'Machine Learning Classifier',
          }));
          setModels(list);
        }
      } catch (err) {
        setError(err.message || 'Failed to load model registry from backend.');
        console.warn('[ModelsPage] Live models fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 20, color: 'var(--text-secondary)' }}>
        <DemoBanner />
        <h2>Multi-Disease Machine Learning Model Registry</h2>
        <p>Loading model registry from backend…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in" style={{ padding: 20, color: '#ef4444' }}>
        <DemoBanner />
        <h2>Multi-Disease Machine Learning Model Registry</h2>
        <p style={{ color: '#ef4444' }}>⚠️ {error}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
          Ensure the backend server is running and reachable.
        </p>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="fade-in" style={{ padding: 20, color: 'var(--text-secondary)' }}>
        <DemoBanner />
        <h2>Multi-Disease Machine Learning Model Registry</h2>
        <p>No disease models are currently registered in the backend.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚙️</span> Multi-Disease Machine Learning Model Registry
          </h2>
          <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
            Authoritative clinical decision models for Diabetes, Malaria, Dengue, Typhoid, and Chikungunya.
            Metrics are computed on held-out test data only — no training accuracy is reported as test accuracy.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onNavigate && onNavigate('dataset-studio')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🧪</span> Open Dataset & Training Studio
        </button>
      </div>

      {models.length > 0 && (
        <div style={{ marginTop: 16, color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: 16 }}>
          📋 Models listed in registry order. Readiness status determines whether inference is served.
          Models flagged <strong>DATA_LEAKAGE_SUSPECTED</strong> are blocked from prediction.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {models.map((m, idx) => {
          const ri = readinessInfo(m.readiness);
          const acc = fmtMetric(m.metrics?.accuracy);
          const sens = fmtMetric(m.metrics?.recall_sensitivity ?? m.metrics?.sensitivity);
          const spec = fmtMetric(m.metrics?.specificity);
          const f1 = fmtScore(m.metrics?.f1_score ?? m.metrics?.f1);
          const roc = fmtScore(m.metrics?.roc_auc);
          const blocked = ['DATA_LEAKAGE_SUSPECTED', 'NEEDS_VALIDATION', 'FAILED', 'UNAVAILABLE', 'NOT_TRAINED'].includes(
            String(m.readiness).toUpperCase()
          );

          return (
            <div key={idx} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: '#00d4aa', fontWeight: 700 }}>
                      {m.model_version}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: ri.bg, padding: '2px 8px', borderRadius: 4, color: ri.color, fontWeight: 700 }}>
                      {ri.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: 'rgba(56,189,248,0.15)', padding: '2px 8px', borderRadius: 4, color: '#38bdf8', fontWeight: 700 }}>
                      {m.features_count} Features
                    </span>
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '1.15rem', marginTop: 6, marginBottom: 2 }}>
                    {m.display_name} — {m.model_name}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    Algorithm: {m.algorithm}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusBadge status={m.status} />
                  {blocked && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: 4 }}>
                      Prediction Blocked
                    </span>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => onNavigate && onNavigate('dataset-studio')}
                    disabled={blocked}
                    style={{ fontSize: '0.76rem', padding: '4px 10px', opacity: blocked ? 0.6 : 1 }}
                  >
                    Retrain / Test →
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: '0.82rem', background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Training Dataset:</span>
                  <strong style={{ color: '#fff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.training_dataset}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Accuracy (Holdout):</span>
                  <strong style={{ color: '#00d4aa', display: 'block' }}>{acc}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Sensitivity / F1:</span>
                  <strong style={{ color: '#10b981', display: 'block' }}>{sens} / {f1}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Specificity / ROC-AUC:</span>
                  <strong style={{ color: '#38bdf8', display: 'block' }}>{spec} / {roc}</strong>
                </div>
              </div>

              {m.audit_flags && m.audit_flags.length > 0 && (
                <div style={{ marginTop: 10, padding: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, marginBottom: 6 }}>
                    ⚠️ Audit Flags
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {m.audit_flags.map((flag, fi) => (
                      <li key={fi} style={{ marginBottom: 3 }}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {m.readiness_reason && (
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 8, borderRadius: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>Readiness:</span> {m.readiness_reason}
                </div>
              )}

              <button
                className="btn btn-secondary"
                onClick={() => onNavigate && onNavigate('dataset-studio')}
                style={{ marginTop: 10, fontSize: '0.76rem', padding: '6px 12px' }}
              >
                View Dataset Studio →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
