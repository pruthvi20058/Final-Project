import React, { useState, useRef } from 'react';

export default function Interactive3DCard() {
  const cardRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 5, y: -8 });
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0.15 });
  const [activeTab, setActiveTab] = useState('raw'); // 'raw' | 'parsed' | 'shap'

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // Max 12 deg tilt
    const rotateY = ((x - centerX) / centerX) * 14;

    setRotate({ x: rotateX, y: rotateY });
    setShine({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 5, y: -8 });
    setShine({ x: 50, y: 50, opacity: 0.1 });
  };

  return (
    <div
      style={{
        perspective: '1200px',
        maxWidth: 960,
        margin: '0 auto',
        padding: '20px 0'
      }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transition: 'transform 0.12s cubic-bezier(0.1, 0.9, 0.2, 1)',
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(26, 37, 64, 0.95) 100%)',
          border: '1px solid rgba(0, 212, 170, 0.35)',
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 212, 170, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff'
        }}
      >
        {/* Holographic Specular Shine Effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(0, 212, 170, ${shine.opacity}), transparent 60%)`,
            pointerEvents: 'none',
            borderRadius: 24,
            zIndex: 1
          }}
        />

        {/* Animated Laser Scanning Line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, transparent 0%, #00d4aa 50%, transparent 100%)',
            boxShadow: '0 0 15px #00d4aa, 0 0 30px #00d4aa',
            animation: 'scanLaser 3.5s ease-in-out infinite alternate',
            zIndex: 2,
            pointerEvents: 'none'
          }}
        />

        {/* Floating 3D Badge 1: Live Status */}
        <div
          style={{
            transform: 'translateZ(40px)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 20,
            background: 'rgba(0, 212, 170, 0.15)',
            border: '1px solid rgba(0, 212, 170, 0.4)',
            color: '#00d4aa',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            marginBottom: 20,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 20px rgba(0,212,170,0.2)'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 8px #00d4aa', animation: 'pulse 1.5s infinite' }} />
          <span>REAL-TIME VISION OCR & CLINICAL REASONING DEMO</span>
        </div>

        {/* Top Header & Tab Toggle */}
        <div
          style={{
            transform: 'translateZ(30px)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: 16
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>📑 Comprehensive Metabolic & Cardiac Report</span>
              <span style={{ fontSize: '0.72rem', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>Patient #8492</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
              Scanned from high-resolution PDF • 99.4% OCR extraction accuracy
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.4)', padding: 4, borderRadius: 12 }}>
            <button
              onClick={() => setActiveTab('raw')}
              style={{
                background: activeTab === 'raw' ? '#00d4aa' : 'transparent',
                color: activeTab === 'raw' ? '#060a14' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📷 OCR View
            </button>
            <button
              onClick={() => setActiveTab('parsed')}
              style={{
                background: activeTab === 'parsed' ? '#00d4aa' : 'transparent',
                color: activeTab === 'parsed' ? '#060a14' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📊 Extracted Data
            </button>
            <button
              onClick={() => setActiveTab('shap')}
              style={{
                background: activeTab === 'shap' ? '#00d4aa' : 'transparent',
                color: activeTab === 'shap' ? '#060a14' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🧬 XAI Feature SHAP
            </button>
          </div>
        </div>

        {/* Main Grid Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, transform: 'translateZ(20px)' }}>
          {/* Left Panel: Simulated Lab Report & OCR Highlights */}
          <div
            style={{
              background: 'rgba(6, 10, 20, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: 18,
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.72rem', borderBottom: '1px solid #1e293b', paddingBottom: 8, marginBottom: 12 }}>
              <span>TEST PARAMETER</span>
              <span>RESULT</span>
              <span>REFERENCE</span>
            </div>

            {[
              { name: 'Fasting Plasma Glucose', val: '168.4 mg/dL', ref: '70.0 - 99.0', status: 'CRITICAL_HIGH', shap: '+24.5%' },
              { name: 'Hemoglobin A1c (HbA1c)', val: '7.8 %', ref: '4.0 - 5.6', status: 'HIGH', shap: '+18.2%' },
              { name: 'Serum Creatinine', val: '1.42 mg/dL', ref: '0.70 - 1.20', status: 'ELEVATED', shap: '+9.1%' },
              { name: 'Total Cholesterol', val: '245 mg/dL', ref: '< 200', status: 'HIGH', shap: '+7.4%' },
              { name: 'Triglycerides', val: '210 mg/dL', ref: '< 150', status: 'ELEVATED', shap: '+5.3%' },
              { name: 'hs-CRP (Cardiac Risk)', val: '3.8 mg/L', ref: '< 1.0', status: 'HIGH', shap: '+6.8%' }
            ].map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 8,
                  marginBottom: 6,
                  background: row.status.includes('HIGH') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: row.status.includes('HIGH') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{row.name}</span>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ref: {row.ref}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: row.status.includes('HIGH') ? '#ef4444' : '#00d4aa', fontWeight: 800 }}>{row.val}</span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.65rem',
                      color: '#ef4444',
                      fontWeight: 700
                    }}
                  >
                    {row.status} ({row.shap})
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel: Holographic AI Analysis & Floating 3D Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Floating 3D Risk Dial Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 16,
                padding: 16,
                transform: 'translateZ(35px)',
                boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)'
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🧬 PRIMARY DIFFERENTIAL RISK
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff' }}>74.2%</span>
                <span style={{ fontSize: '1rem', color: '#ef4444', fontWeight: 700 }}>Type 2 Diabetes Mellitus</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', height: 8, borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: '74.2%', height: '100%', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', borderRadius: 4 }} />
              </div>
            </div>

            {/* Secondary Risk Card */}
            <div
              style={{
                background: 'rgba(13, 19, 33, 0.9)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 16,
                padding: 16,
                transform: 'translateZ(25px)'
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase' }}>
                🛡️ RAG GUIDELINE EVIDENCE MATCH
              </div>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: 6, lineHeight: 1.4 }}>
                <strong>ADA Standards of Care (2026):</strong> Fasting plasma glucose ≥ 126 mg/dL and HbA1c ≥ 6.5% confirm diagnostic criteria for Type 2 Diabetes.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  ✓ ADA Guidelines 2026
                </span>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  ✓ ESC Lipid Criteria
                </span>
              </div>
            </div>

            {/* Confidence & Action Badge */}
            <div
              style={{
                background: 'rgba(0, 212, 170, 0.08)',
                border: '1px solid rgba(0, 212, 170, 0.3)',
                borderRadius: 14,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                transform: 'translateZ(45px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: '1.4rem' }}>🩺</div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Doctor Review Panel</div>
                  <div style={{ fontSize: '0.7rem', color: '#00d4aa' }}>Human-in-the-Loop Audit Active</div>
                </div>
              </div>
              <span style={{ background: '#00d4aa', color: '#060a14', fontSize: '0.72rem', fontWeight: 800, padding: '6px 12px', borderRadius: 8 }}>
                VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 5%; opacity: 0.3; }
          50% { opacity: 1; }
          100% { top: 92%; opacity: 0.3; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
