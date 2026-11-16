import React from 'react';

export default function DemoBanner() {
  return (
    <div className="demo-banner-strip">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          background: '#6366f1', color: '#fff', fontSize: '0.65rem',
          padding: '2px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em'
        }}>
          DEMO DATA
        </span>
        <span>
          MediAgent Research Environment — All patient records and model inference parameters are synthetic/demo data.
        </span>
      </div>
      <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
        v1.0.4 Calibrated Classifier
      </span>
    </div>
  );
}
