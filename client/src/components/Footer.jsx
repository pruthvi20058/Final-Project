import React from 'react';
import SafetyDisclaimer from './SafetyDisclaimer';

export default function Footer({ onNavigate }) {
  return (
    <footer style={{
      background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)',
      padding: '48px 24px 24px', marginTop: 60
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SafetyDisclaimer />

        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40,
          margin: '40px 0 32px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>⚕️</span>
              <strong style={{ fontSize: '1.2rem', color: '#fff' }}>MediAgent</strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360 }}>
              An Agentic Multimodal Clinical Decision-Support System for Automated Laboratory Report Understanding, Explainable Disease Prediction and Uncertainty-Aware Risk Assessment.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: 14 }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('features')}>Key Features</span>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('how-it-works')}>Agentic Workflow</span>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('research')}>Benchmark Evaluation</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: 14 }}>Research</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('research')}>XAI & SHAP Methods</span>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('about')}>Clinical Guideline RAG</span>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('research')}>GPT-4 Benchmarks</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: 14 }}>Access</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('login')}>Doctor Portal</span>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('contact')}>Research Access</span>
              <span style={{ cursor: 'pointer' }} onClick={() => onNavigate('contact')}>Contact Team</span>
            </div>
          </div>
        </div>

        <div style={{
          paddingTop: 20, borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.78rem', color: 'var(--text-tertiary)'
        }}>
          <div>© 2026 MediAgent Clinical Research Team. All rights reserved.</div>
          <div>HIPAA Compliant Architecture • DEMO Prototype</div>
        </div>
      </div>
    </footer>
  );
}
