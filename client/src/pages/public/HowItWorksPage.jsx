import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function HowItWorksPage({ onNavigate, onEnterApp }) {
  const stages = [
    { num: '01', title: 'Laboratory Report Upload', desc: 'Upload JPG, PNG, or PDF lab report documents.' },
    { num: '02', title: 'Computer Vision & Preprocessing', desc: 'Noise reduction, thresholding, and contour detection for document orientation.' },
    { num: '03', title: 'OCR Text & Table Extraction', desc: 'PaddleOCR / Tesseract parses tabular test data with bounding box coordinates.' },
    { num: '04', title: 'Clinical Data Extraction', desc: 'Normalizes test names, numeric values, measurement units, and reference ranges.' },
    { num: '05', title: 'Boundary Validation', desc: 'Validates values against clinical age/gender ranges and flags low OCR confidence.' },
    { num: '06', title: 'Patient Profile Synchronization', desc: 'Integrates extracted lab data with historical medical records and current medications.' },
    { num: '07', title: 'ML Disease Risk Prediction', desc: 'Calibrated XGBoost models compute probabilities for top 3 differential diagnoses.' },
    { num: '08', title: 'XAI (SHAP) Attribution', desc: 'Computes feature importance values showing exact parameters driving prediction.' },
    { num: '09', title: 'Medical Evidence RAG Retrieval', desc: 'FAISS vector search retrieves relevant ADA / ESC clinical practice guidelines.' },
    { num: '10', title: 'Risk & Uncertainty Engine', desc: 'Quantifies data completeness, model uncertainty, and overall patient risk level.' },
    { num: '11', title: 'Doctor Review & Decision Recording', desc: 'Generates structured clinical report for attending physician review (Accept/Modify/Reject).' }
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <Navbar activePage="how-it-works" onNavigate={onNavigate} onEnterApp={onEnterApp} />

      <div style={{ maxWidth: 1000, margin: '60px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 12 }}>11-Stage Agentic Workflow</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 40 }}>
          How MediAgent transforms unstructured lab reports into doctor-reviewable decision support.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stages.map(s => (
            <div key={s.num} className="card" style={{ background: 'var(--bg-secondary)', display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00d4aa', width: 45 }}>{s.num}</div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: 4 }}>{s.title}</h4>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
