import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import SafetyDisclaimer from './SafetyDisclaimer';
import Hero3DCanvas from './Hero3DCanvas';
import Interactive3DCard from './Interactive3DCard';
import Interactive3DEngineHub from './Interactive3DEngineHub';

export default function LandingPage({ onNavigate, onEnterApp }) {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <Navbar activePage="home" onNavigate={onNavigate} onEnterApp={onEnterApp} />

      {/* SECTION 1: 3D ANIMATED HERO SECTION */}
      <section style={{ position: 'relative', padding: '90px 24px 70px', minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Interactive WebGL / Canvas 3D Neural Constellation & DNA Helix */}
        <Hero3DCanvas />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', textAlign: 'center', width: '100%' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 20,
              background: 'rgba(0, 212, 170, 0.12)',
              border: '1px solid rgba(0, 212, 170, 0.4)',
              color: '#00d4aa',
              fontSize: '0.85rem',
              fontWeight: 800,
              marginBottom: 24,
              boxShadow: '0 0 20px rgba(0, 212, 170, 0.15)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <span>✨ Multimodal 3D AI Clinical Decision Support System</span>
          </div>

          <h1
            style={{
              fontSize: '3.8rem',
              fontWeight: 900,
              lineHeight: 1.12,
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              maxWidth: 980,
              margin: '0 auto 24px',
              letterSpacing: '-0.02em'
            }}
          >
            Transform Unstructured Lab Reports Into <span style={{ color: '#00d4aa', WebkitTextFillColor: '#00d4aa', textShadow: '0 0 30px rgba(0,212,170,0.4)' }}>Explainable 3D Medical Intelligence</span>
          </h1>

          <p
            style={{
              fontSize: '1.2rem',
              color: 'var(--text-secondary)',
              maxWidth: 820,
              margin: '0 auto 40px',
              lineHeight: 1.65
            }}
          >
            Automated Vision OCR, logistic regression diagnostic risk scoring, TF-IDF RAG clinical guideline retrieval, SHAP feature explainability, and doctor-in-the-loop governance.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 56, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={onEnterApp}
              style={{
                fontSize: '1.1rem',
                padding: '16px 36px',
                borderRadius: 14,
                boxShadow: '0 0 30px rgba(0, 212, 170, 0.4)',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.25s'
              }}
            >
              📄 Launch Interactive Diagnostic Engine →
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => onNavigate('how-it-works')}
              style={{
                fontSize: '1.1rem',
                padding: '16px 32px',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🔬 Explore How It Works
            </button>
          </div>

          {/* 3D TILT INTERACTIVE SHOWCASE CARD PREVIEW */}
          <Interactive3DCard />
        </div>
      </section>

      {/* SECTION 2: PROBLEM STATEMENT WITH 3D GLASS CARDS */}
      <section style={{ background: 'var(--bg-secondary)', padding: '80px 24px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 800, marginBottom: 12 }}>
              THE CLINICAL CHALLENGE
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: 12 }}>
              Why Generic LLMs Fail in Clinical Decision Making
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 680, margin: '0 auto' }}>
              Standard chatbots lack deterministic extraction, calibrated confidence scores, and guideline RAG verification.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { icon: '📋', title: 'Unstructured Formats', desc: 'Lab reports arrive as unstructured PDFs or scanned photos requiring tedious manual keying.' },
              { icon: '⏱️', title: 'Cognitive Overload', desc: 'Clinicians spend valuable minutes cross-checking reference ranges across multiple historical dates.' },
              { icon: '📈', title: 'Trend Invisibility', desc: 'Isolating subtle progressive disease trajectories across consecutive tests requires complex longitudinal tracking.' },
              { icon: '❓', title: 'Black-Box AI', desc: 'Generic AI models generate unverified claims lacking SHAP feature importance and medical citation grounding.' }
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 18,
                  padding: 24,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }}
                className="problem-3d-card"
              >
                <div style={{ fontSize: '2.2rem', marginBottom: 14 }}>{p.icon}</div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 8, color: '#ffffff' }}>{p.title}</h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: 8 MODULAR CLINICAL ENGINES 3D INTERACTIVE HUB */}
      <section style={{ padding: '40px 0', background: 'var(--bg-primary)' }}>
        <Interactive3DEngineHub />
      </section>

      {/* SECTION 4: 7-STAGE PIPELINE WORKFLOW */}
      <section style={{ background: 'var(--bg-secondary)', padding: '80px 24px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: 12 }}>
              End-to-End Agentic Transformation Workflow
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              From initial lab report upload to doctor sign-off, every step is transparent and audited.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {[
              { step: '01', title: 'Upload Report', icon: '📄', desc: 'PDF / Image OCR' },
              { step: '02', title: 'OCR Extract', icon: '🔍', desc: 'Tesseract & Vision' },
              { step: '03', title: 'Validate Data', icon: '✅', desc: 'LOINC Range Check' },
              { step: '04', title: 'ML Predict', icon: '🧬', desc: 'Logistic Regression Score' },
              { step: '05', title: 'Explain (XAI)', icon: '📊', desc: 'SHAP Feature Drivers' },
              { step: '06', title: 'Retrieve RAG', icon: '📚', desc: 'ADA / ESC Evidence' },
              { step: '07', title: 'Doctor Review', icon: '🩺', desc: 'Human Oversight' }
            ].map((st, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(0, 212, 170, 0.25)',
                  borderRadius: 16,
                  padding: '18px 12px',
                  textAlign: 'center',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#00d4aa', fontWeight: 900, marginBottom: 6 }}>
                  STEP {st.step}
                </div>
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{st.icon}</div>
                <strong style={{ fontSize: '0.86rem', color: '#fff', display: 'block', marginBottom: 4 }}>
                  {st.title}
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{st.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: SAFETY & GOVERNANCE */}
      <section style={{ maxWidth: 1100, margin: '60px auto 40px', padding: '0 24px' }}>
        <SafetyDisclaimer />
      </section>

      <Footer onNavigate={onNavigate} />

      <style>{`
        .problem-3d-card:hover {
          transform: translateY(-6px) scale(1.02);
          border-color: rgba(0, 212, 170, 0.4) !important;
          boxShadow: 0 12px 30px rgba(0, 212, 170, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
