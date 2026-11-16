import React from 'react';
import DemoBanner from '../../components/DemoBanner';
import StatusBadge from '../../components/StatusBadge';
import { DEMO_SYSTEM_STATUS } from '../../services/api';

export default function SystemStatusPage() {
  const status = DEMO_SYSTEM_STATUS;

  const services = [
    { name: 'FastAPI / Express Backend API', value: status.backend, icon: '⚡', desc: 'REST API routing and session token manager' },
    { name: 'XGBoost ML Classification Model', value: status.mlModel, icon: '🧬', desc: 'Calibrated Platt scaling inference engine' },
    { name: 'Computer Vision & OCR Engine', value: status.ocrEngine, icon: '📄', desc: 'PaddleOCR / Tesseract bounding box parser' },
    { name: 'FAISS RAG Vector Store', value: status.ragEngine, icon: '📚', desc: 'Dense sentence-transformer medical embeddings' },
    { name: 'SQLAlchemy / SQLite Database', value: status.database, icon: '💾', desc: 'Patient clinical records & HIPAA audit store' },
    { name: 'LLM Reasoning Provider', value: status.llmProvider, icon: '🧠', desc: 'Configurable medical reasoning synthesis API' }
  ];

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🟢 Live System Health & Service Status</h2>
        <p>Real-time operational status for all MediAgent backend microservices, ML models, OCR, and RAG vector indexes.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {services.map((s, idx) => (
          <div key={idx} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '1.6rem' }}>{s.icon}</span>
              <StatusBadge status={s.value} />
            </div>

            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: 4 }}>{s.name}</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
