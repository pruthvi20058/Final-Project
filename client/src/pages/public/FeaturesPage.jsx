import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function FeaturesPage({ onNavigate, onEnterApp }) {
  const features = [
    { title: '1. AI Laboratory Report Extraction', desc: 'Parses unstructured image/PDF lab documents using OCR and vision processing into structured lab test tables.' },
    { title: '2. Clinical Data Validation', desc: 'Validates numeric ranges, units, and tags abnormal values with high/low/critical markers.' },
    { title: '3. Explainable Disease Prediction', desc: 'Logistic regression models predict disease probabilities with confidence intervals.' },
    { title: '4. Medical Evidence Retrieval (RAG)', desc: 'TF-IDF hybrid search retrieves clinical guidelines to cite evidence rationale.' },
    { title: '5. Risk & Uncertainty Engine', desc: 'Calculates overall patient risk score and quantifies data completeness and model certainty.' },
    { title: '6. Longitudinal Trend Analysis', desc: 'Plots historical lab value progression (e.g. HbA1c trajectory over time) with Recharts charts.' },
    { title: '7. Evidence Conflict Detection', desc: 'Detects discrepancies between model output and clinical guideline recommendations.' },
    { title: '8. Doctor Review & Audit Log', desc: 'Human-in-the-loop decision recording (Accept, Modify, Reject) with complete audit trail.' }
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <Navbar activePage="features" onNavigate={onNavigate} onEnterApp={onEnterApp} />

      <div style={{ maxWidth: 1100, margin: '60px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12 }}>Core Platform Features</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 40 }}>
          8 modular clinical engines powering end-to-end laboratory report analysis and decision support.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#00d4aa', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
