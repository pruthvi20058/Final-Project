import React, { useState } from 'react';
import DemoBanner from '../../components/DemoBanner';

export default function SettingsPage() {
  const [ocrEngine, setOcrEngine] = useState('PaddleOCR v2.6');
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [autoAbstain, setAutoAbstain] = useState(true);

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🔧 System Settings & Threshold Configuration</h2>
        <p>Configure OCR parameters, risk thresholds, abstention logic, and research environment options.</p>
      </div>

      <div className="card" style={{ background: 'var(--bg-secondary)', maxWidth: 700 }}>
        <h4 style={{ color: '#fff', marginBottom: 16 }}>1. Computer Vision & OCR Configuration</h4>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>OCR Processing Engine</label>
          <select className="form-select" value={ocrEngine} onChange={e => setOcrEngine(e.target.value)}>
            <option value="PaddleOCR v2.6">PaddleOCR v2.6 (High Accuracy Multilingual)</option>
            <option value="Tesseract v5.3">Tesseract OCR v5.3 (Fast Local Processing)</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Minimum OCR Character Confidence Threshold ({confidenceThreshold}%)
          </label>
          <input type="range" min="60" max="95" value={confidenceThreshold} onChange={e => setConfidenceThreshold(e.target.value)} style={{ width: '100%' }} />
        </div>

        <h4 style={{ color: '#fff', marginBottom: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          2. Safety & Abstention Engine
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <strong style={{ color: '#fff', fontSize: '0.88rem', display: 'block' }}>Automatic Model Abstention</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Refrain from automated diagnosis if OCR confidence or data completeness is low</span>
          </div>
          <input type="checkbox" checked={autoAbstain} onChange={e => setAutoAbstain(e.target.checked)} style={{ width: 18, height: 18 }} />
        </div>

        <button className="btn btn-primary">
          Save System Configuration
        </button>
      </div>
    </div>
  );
}
