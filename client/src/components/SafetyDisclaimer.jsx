import React from 'react';

export default function SafetyDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <div style={{
        padding: '8px 14px', borderRadius: 'var(--radius-sm)',
        background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)',
        color: '#fbbf24', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span>⚠️</span>
        <span>MediAgent is a clinical decision-support research prototype. Not a definitive diagnosis. Doctor review required.</span>
      </div>
    );
  }

  return (
    <div className="safety-disclaimer-card">
      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🛡️</span>
      <div>
        <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: 2 }}>
          CLINICAL SAFETY & INTENDED USE DISCLAIMER
        </strong>
        <span>
          MediAgent is an AI-assisted clinical decision-support research prototype. It does not provide a definitive diagnosis and does not replace qualified medical professionals. All AI-generated outputs must be reviewed by an appropriate healthcare professional.
        </span>
      </div>
    </div>
  );
}
