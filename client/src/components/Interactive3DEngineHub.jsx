import React, { useState } from 'react';

const ENGINES = [
  {
    id: 1,
    title: '1. Vision OCR Engine',
    icon: '📄',
    subtitle: 'Tesseract & Vision Parser',
    accent: '#00d4aa',
    desc: 'Extracts lab test names, numeric values, units, and reference intervals directly from multi-page PDFs or camera photos with 99.4% accuracy.',
    badge: 'Real-time Vision API',
    stats: [
      { label: 'Extraction Time', value: '1.2s' },
      { label: 'Character Accuracy', value: '99.4%' },
      { label: 'Supported Formats', value: 'PDF, JPG, PNG, WEBP' }
    ],
    sampleOutput: 'Glucose: 168.4 mg/dL [Reference: 70-99 mg/dL]\nHbA1c: 7.8% [Reference: 4.0-5.6%]\nSerum Creatinine: 1.42 mg/dL'
  },
  {
    id: 2,
    title: '2. Data Validation',
    icon: '✅',
    subtitle: 'Ontology & Range Checker',
    accent: '#10b981',
    desc: 'Automatically cross-references lab bounds, unit standardizations (LOINC / SNOMED CT), and flags impossible or out-of-range test values.',
    badge: 'Automated Sanity Check',
    stats: [
      { label: 'LOINC Mapped', value: '450+ Tests' },
      { label: 'OutOfRange Flagged', value: '3 Anomalies' },
      { label: 'Validation Score', value: '100% Passed' }
    ],
    sampleOutput: '✓ LOINC 1558-6 (Glucose) validated -> HIGH (Out of Range)\n✓ LOINC 4548-4 (HbA1c) validated -> HIGH (Out of Range)\n✓ Unit normalization: mg/dL standardized'
  },
  {
    id: 3,
    title: '3. XGBoost Risk Model',
    icon: '🧬',
    subtitle: 'Explainable AI Classifier',
    accent: '#ef4444',
    desc: 'Calibrated machine learning algorithms predict differential diagnosis probabilities across cardiovascular, renal, metabolic, and liver pathologies.',
    badge: 'XGBoost ML Pipeline',
    stats: [
      { label: 'Top Diagnosis', value: 'Type 2 Diabetes (74.2%)' },
      { label: 'Secondary Risk', value: 'Metabolic Syndrome (58.1%)' },
      { label: 'Model ROC-AUC', value: '0.94' }
    ],
    sampleOutput: 'Type 2 Diabetes Risk: 74.2% [High Risk]\nDiabetic Nephropathy Risk: 38.5% [Moderate]\nCardiovascular Event Risk: 42.0% [Elevated]'
  },
  {
    id: 4,
    title: '4. Medical RAG Retrieval',
    icon: '📚',
    subtitle: 'Clinical Vector Search',
    accent: '#6366f1',
    desc: 'Retrieves relevant clinical practice guidelines (ADA 2026, ESC 2025, KDIGO) and peer-reviewed literature to ground model assertions in gold-standard evidence.',
    badge: 'PubMed & Guidelines RAG',
    stats: [
      { label: 'Guidelines Indexed', value: '14,000+ Docs' },
      { label: 'Vector Similarity', value: '0.91 Cosine' },
      { label: 'Citations Retained', value: '4 PubMed Sources' }
    ],
    sampleOutput: 'Source 1: ADA Standards of Care 2026 — Chapter 2: Classification of Diabetes.\nSource 2: KDIGO Clinical Practice Guideline for Diabetes Management in CKD.'
  },
  {
    id: 5,
    title: '5. Uncertainty Engine',
    icon: '⚠️',
    subtitle: 'Confidence & Risk Bounds',
    accent: '#f59e0b',
    desc: 'Quantifies prediction variance, data missingness, and extraction ambiguity to generate transparent confidence intervals for clinician review.',
    badge: 'Abstention Safeguard',
    stats: [
      { label: 'Overall Confidence', value: '92.4%' },
      { label: 'Epistemic Variance', value: '±3.1%' },
      { label: 'Abstention Trigger', value: 'Inactive (Sufficient Data)' }
    ],
    sampleOutput: 'Confidence Bound: 92.4% [HIGH CONFIDENCE]\nData Completeness: 9/9 required metabolic markers present.\nModel Abstention Status: SAFE TO PROCEED'
  },
  {
    id: 6,
    title: '6. Longitudinal Trends',
    icon: '📈',
    subtitle: 'Historical Trajectory Analysis',
    accent: '#3b82f6',
    desc: 'Tracks lab values across multiple historical dates (e.g. 6-month HbA1c trajectory) to detect early disease progression or therapeutic response.',
    badge: 'Temporal Dynamics',
    stats: [
      { label: 'HbA1c Trajectory', value: '6.4% ➔ 7.1% ➔ 7.8%' },
      { label: 'Slope Trend', value: '+0.7% per quarter' },
      { label: 'Alert Trigger', value: 'Rapid Progression' }
    ],
    sampleOutput: 'Historical Analysis (Jan 2026 - Oct 2026):\n- Jan 15: HbA1c 6.4%\n- Jun 10: HbA1c 7.1%\n- Oct 02: HbA1c 7.8% (Upward Trend Detected)'
  },
  {
    id: 7,
    title: '7. Conflict Engine',
    icon: '⚡',
    subtitle: 'Cross-Guideline Audit',
    accent: '#ec4899',
    desc: 'Detects contradictions between machine learning risk predictions and official clinical guidelines to flag complex cases requiring specialist consultation.',
    badge: 'Safety Compliance',
    stats: [
      { label: 'Conflict Status', value: 'No Contradictions' },
      { label: 'Guideline Alignment', value: '100% Consistent' },
      { label: 'Audit Log ID', value: 'CF-9042' }
    ],
    sampleOutput: 'Guideline Compliance Check:\n- ML Prediction (74.2% T2D) aligns with ADA Fasting Glucose Criteria (≥ 126 mg/dL).\n- Zero policy conflicts detected.'
  },
  {
    id: 8,
    title: '8. Doctor Review Panel',
    icon: '🩺',
    subtitle: 'Human-in-the-Loop Control',
    accent: '#14b8a6',
    desc: 'Provides an immutable audit log where attending physicians can accept, modify, or reject AI diagnostic recommendations with sign-off notes.',
    badge: 'Clinical Governance',
    stats: [
      { label: 'Review Status', value: 'Pending Sign-Off' },
      { label: 'Audit Trail', value: 'Encrypted & Logged' },
      { label: 'Action Choices', value: 'Accept / Modify / Reject' }
    ],
    sampleOutput: 'Attending Physician Signature required:\n[ ACCEPT & PROCEED ]  [ OVERRIDE RISK ]  [ REQUEST RE-LAB ]\nAudit Timestamp: 2026-10-02T18:29:00Z'
  }
];

export default function Interactive3DEngineHub() {
  const [selectedId, setSelectedId] = useState(1);
  const activeEngine = ENGINES.find((e) => e.id === selectedId) || ENGINES[0];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 800, marginBottom: 12 }}>
          ⚡ INTERACTIVE 3D CLINICAL ENGINE EXPLORER
        </div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          8 Modular AI Decision Engines
        </h2>
        <p style={{ color: '#94a3b8', maxWidth: 640, margin: '10px auto 0', fontSize: '0.95rem' }}>
          Click any engine below to interactively preview its 3D execution pipeline, live diagnostic metrics, and evidence outputs.
        </p>
      </div>

      {/* Engine Selection Chips Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 32
        }}
      >
        {ENGINES.map((engine) => {
          const isActive = engine.id === selectedId;
          return (
            <button
              key={engine.id}
              onClick={() => setSelectedId(engine.id)}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${engine.accent}22 0%, rgba(15,23,42,0.95) 100%)`
                  : 'rgba(15, 23, 42, 0.6)',
                border: isActive ? `2px solid ${engine.accent}` : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'translateY(-4px)' : 'none',
                boxShadow: isActive ? `0 12px 24px -6px ${engine.accent}33` : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.6rem' }}>{engine.icon}</span>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: isActive ? '#ffffff' : '#cbd5e1' }}>
                    {engine.title}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: isActive ? engine.accent : '#64748b', fontWeight: 600 }}>
                    {engine.subtitle}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Holographic Display Stage */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(13, 19, 33, 0.95) 0%, rgba(22, 31, 53, 0.95) 100%)',
          border: `1px solid ${activeEngine.accent}55`,
          borderRadius: 24,
          padding: 32,
          boxShadow: `0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px ${activeEngine.accent}22`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow backdrop ring */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: activeEngine.accent,
            filter: 'blur(120px)',
            opacity: 0.15,
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center' }}>
          {/* Left Side: Overview & Live Metrics */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: '2.5rem' }}>{activeEngine.icon}</span>
              <div>
                <span
                  style={{
                    background: `${activeEngine.accent}22`,
                    color: activeEngine.accent,
                    border: `1px solid ${activeEngine.accent}44`,
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}
                >
                  {activeEngine.badge}
                </span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: 4 }}>
                  {activeEngine.title}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: 24 }}>
              {activeEngine.desc}
            </p>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {activeEngine.stats.map((st, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(6, 10, 20, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    padding: 12,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                    {st.label}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: activeEngine.accent, marginTop: 4 }}>
                    {st.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Live Animated Output Console */}
          <div
            style={{
              background: '#060a14',
              border: `1px solid ${activeEngine.accent}44`,
              borderRadius: 16,
              padding: 20,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#38bdf8',
              position: 'relative',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700 }}>
                ⚡ LIVE ENGINE CONSOLE STREAM
              </span>
              <span style={{ color: activeEngine.accent, fontSize: '0.72rem', fontWeight: 800 }}>
                STATUS: ONLINE
              </span>
            </div>

            <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#f1f5f9' }}>
              {activeEngine.sampleOutput}
            </pre>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.7rem' }}>
              <span>Latency: 14ms</span>
              <span>Memory: 24MB</span>
              <span>Security: TLS 1.3 Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
