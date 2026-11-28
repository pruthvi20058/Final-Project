import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';

export default function AnalysisProgressPage({ reportId = 'REP-9001', onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { name: 'Document Uploaded & Verified', icon: '📄', desc: 'File payload checked for OCR processing' },
    { name: 'Image Preprocessing & Noise Reduction', icon: '🖼️', desc: 'Contour alignment, thresholding & deskewing' },
    { name: 'OCR Text & Table Recognition', icon: '🔍', desc: 'Parsing bounding boxes and tabular structures' },
    { name: 'Clinical Information Extraction', icon: '📊', desc: 'Extracting test names, numeric values, units, reference ranges' },
    { name: 'Range & Outlier Validation', icon: '✅', desc: 'Verifying values against medical threshold boundaries' },
    { name: 'Patient Profile Synchronization', icon: '👤', desc: 'Integrating historical lab records & clinical context' },
    { name: 'ML Disease Risk Prediction', icon: '🧬', desc: 'Logistic Regression classifier computing probabilities' },
    { name: 'Explainability & Feature Importance (SHAP)', icon: '💡', desc: 'Attributing key biomarker weights driving risk score' },
    { name: 'Medical Evidence RAG Retrieval', icon: '📚', desc: 'TF-IDF hybrid search indexing clinical guidelines' },
    { name: 'Risk Assessment & Uncertainty Engine', icon: '🛡️', desc: 'Calculating overall risk level and confidence bounds' },
    { name: 'Clinical Decision-Support Report Generation', icon: '📋', desc: 'Synthesizing 13-section physician summary report' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(() => onComplete && onComplete(reportId), 800);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(timer);
  }, [reportId, onComplete, steps.length]);

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>⚡ Real-Time Processing Pipeline</h2>
        <p>MediAgent Multi-Agent Engine is executing OCR extraction, ML prediction, RAG retrieval, and risk scoring.</p>
      </div>

      <div className="card" style={{ maxWidth: 850, margin: '0 auto', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#00d4aa', fontWeight: 700, letterSpacing: '0.05em' }}>
              PIPELINE PROGRESS: STEP {currentStep + 1} OF {steps.length}
            </span>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginTop: 4 }}>
              {steps[currentStep].name}
            </h3>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00d4aa' }}>
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{
            width: `${((currentStep + 1) / steps.length) * 100}%`, height: '100%',
            background: 'linear-gradient(90deg, #00d4aa, #6366f1)', borderRadius: 4,
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Step Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map((s, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                background: isCurrent ? 'rgba(0, 212, 170, 0.08)' : isDone ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-elevated)',
                border: `1px solid ${isCurrent ? 'rgba(0, 212, 170, 0.3)' : isDone ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: isCurrent ? '#fff' : isDone ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      Step {idx + 1}: {s.name}
                    </strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {s.desc}
                    </span>
                  </div>
                </div>

                <div>
                  {isDone ? (
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.82rem' }}>✓ Completed</span>
                  ) : isCurrent ? (
                    <span style={{ color: '#00d4aa', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing...
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
