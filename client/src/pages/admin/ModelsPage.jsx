import React from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';

export default function ModelsPage() {
  const models = [
    {
      name: 'XGBoost Disease Classifier',
      version: 'v1.0.4-calibrated',
      algorithm: 'XGBoost + Platt Scaling',
      dataset: 'MediAgent Clinical Dataset (550 Cases)',
      trainingDate: '2026-06-15',
      accuracy: '91.4%',
      f1Score: '0.909',
      calibration: 'Validated',
      status: 'Active'
    },
    {
      name: 'Random Forest Baseline Model',
      version: 'v0.9.1',
      algorithm: 'Random Forest (100 Trees)',
      dataset: 'Synthetic Metabolic Panel v0.9',
      trainingDate: '2026-04-10',
      accuracy: '86.2%',
      f1Score: '0.841',
      calibration: 'Uncalibrated',
      status: 'Archived'
    },
    {
      name: 'FAISS Vector RAG Embedder',
      version: 'sentence-transformers/all-MiniLM-L6-v2',
      algorithm: 'Dense Vector Embedder (384-dim)',
      dataset: 'ADA / ESC Clinical Guidelines Index',
      trainingDate: '2026-05-20',
      accuracy: '96.2% Retrieval Top-3',
      f1Score: 'N/A',
      calibration: 'Cosine Normalized',
      status: 'Active'
    }
  ];

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>⚙️ Machine Learning Model Registry</h2>
        <p>Active and archived ML classification models, training dates, calibration statuses, and performance metadata.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {models.map((m, idx) => (
          <div key={idx} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: '#00d4aa', fontWeight: 700 }}>
                  {m.version}
                </span>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: 4 }}>{m.name}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Algorithm: {m.algorithm}</span>
              </div>
              <StatusBadge status={m.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: '0.82rem', background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Training Dataset:</span> <strong style={{ color: '#fff', display: 'block' }}>{m.dataset}</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Training Date:</span> <strong style={{ color: '#fff', display: 'block' }}>{m.trainingDate}</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Classification Accuracy:</span> <strong style={{ color: '#00d4aa', display: 'block' }}>{m.accuracy}</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Calibration Status:</span> <strong style={{ color: '#10b981', display: 'block' }}>{m.calibration}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
