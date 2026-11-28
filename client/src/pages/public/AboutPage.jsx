import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function AboutPage({ onNavigate, onEnterApp, doctor, onLogout }) {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <Navbar activePage="about" onNavigate={onNavigate} onEnterApp={onEnterApp} doctor={doctor} onLogout={onLogout} />

      <div style={{ maxWidth: 1000, margin: '60px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>About MediAgent</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 32 }}>
          MediAgent is an agentic multimodal clinical decision-support research system developed to bridge computer vision report understanding, machine learning disease prediction, explainable AI (SHAP), and evidence-based RAG retrieval.
        </p>

        <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', color: '#00d4aa', marginBottom: 12 }}>Our Clinical Mission</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Laboratory reports contain vital diagnostic signals, but unstructured text and varying reference formats create administrative overhead for clinicians. MediAgent automates extraction while ensuring every diagnostic suggestion is backed by medical guidelines, feature importance attribution, and uncertainty calibration.
          </p>
        </div>

        <div className="grid-2">
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <h4 style={{ color: '#fff', marginBottom: 8 }}>🔬 Research Focus</h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Evaluating task-specific machine learning classifiers against general-purpose LLM baselines (e.g. GPT-4) on lab extraction accuracy, calibration error, and hallucination reduction.
            </p>
          </div>
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <h4 style={{ color: '#fff', marginBottom: 8 }}>🛡️ Safety & Ethics</h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Designed explicitly as a decision-support tool — not a replacement for qualified medical professionals. Every recommendation includes confidence bounds and requires physician review.
            </p>
          </div>
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
