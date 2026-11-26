import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import StatusBadge from '../../components/StatusBadge';
import { reportService, patientService, predictionService, evidenceService, riskService } from '../../services/api';

export default function ClinicalReportPage({ reportId = 'REP-9001', onNavigate }) {
  const [report, setReport] = useState(null);
  const [patient, setPatient] = useState(null);
  const [pred, setPred] = useState(null);
  const [xai, setXai] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      try {
        const rep = await reportService.getById(reportId);
        const pat = await patientService.getById(rep.patientId);
        const p = await predictionService.getPrediction(rep.id);
        const x = await predictionService.getXAI(p.id);
        const e = await evidenceService.getEvidence(p.id);
        const r = await riskService.getRisk(rep.id);

        if (mounted) {
          setReport(rep);
          setPatient(pat);
          setPred(p);
          setXai(x);
          setEvidence(e);
          setRiskData(r);
          setErrorMsg(null);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Unable to connect to the MediAgent server. Please try again.');
        }
      }
    }
    loadAll();
    return () => { mounted = false; };
  }, [reportId]);

  if (errorMsg) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔌</div>
        <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Unable to load clinical report</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{errorMsg}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry ↻
        </button>
      </div>
    );
  }

  if (!report || !patient || !pred || !xai || !evidence || !riskData) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Compiling 13-Section Multimodal Clinical Report...</p>
      </div>
    );
  }

  const { risk, uncertainty } = riskData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📄 Clinical Decision-Support Report</h2>
          <p>Comprehensive 13-section AI-assisted report for: <strong style={{ color: '#00d4aa' }}>{report.filename}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handlePrint}>
            🖨️ Print / Save PDF
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('review')}>
            🩺 Open Doctor Review Panel →
          </button>
        </div>
      </div>

      <div className="card" style={{ background: '#090d16', border: '1px solid var(--border-color)', padding: 32 }}>
        {/* REPORT HEADER */}
        <div style={{ borderBottom: '2px solid var(--accent-primary)', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.8rem' }}>⚕️</span>
              <h1 style={{ fontSize: '1.6rem', color: '#fff', margin: 0 }}>MEDIAGENT</h1>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#00d4aa', fontWeight: 700, letterSpacing: '0.08em' }}>
              MULTIMODAL CLINICAL DECISION-SUPPORT REPORT
            </span>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            <div>Report ID: <strong>{report.id}</strong></div>
            <div>Generated: {report.uploadDate}</div>
            <div>Status: <StatusBadge status={report.status} /></div>
          </div>
        </div>

        <SafetyDisclaimer />

        {/* SECTION 1: PATIENT SUMMARY */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#00d4aa', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginBottom: 12 }}>
            1. Patient Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: '0.84rem' }}>
            <div><span style={{ color: 'var(--text-tertiary)' }}>Name:</span> <strong style={{ color: '#fff' }}>{patient.name}</strong></div>
            <div><span style={{ color: 'var(--text-tertiary)' }}>ID / Age / Gender:</span> <strong style={{ color: '#fff' }}>{patient.id} / {patient.age}y / {patient.gender}</strong></div>
            <div><span style={{ color: 'var(--text-tertiary)' }}>Blood Group:</span> <strong style={{ color: '#fff' }}>{patient.bloodType}</strong></div>
            <div><span style={{ color: 'var(--text-tertiary)' }}>Allergies:</span> <strong style={{ color: '#ef4444' }}>{patient.allergies.join(', ') || 'None'}</strong></div>
          </div>
        </div>

        {/* SECTION 2 & 3: LAB & ABNORMAL FINDINGS */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#00d4aa', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginBottom: 12 }}>
            2 & 3. Extracted Laboratory Findings & Abnormal Highlights ({report.filename})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', marginBottom: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: 6 }}>Test Parameter</th>
                <th style={{ padding: 6 }}>Result</th>
                <th style={{ padding: 6 }}>Units</th>
                <th style={{ padding: 6 }}>Reference Range</th>
                <th style={{ padding: 6 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.labResults.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 6, color: '#fff' }}>{r.testName}</td>
                  <td style={{ padding: 6, fontWeight: 700, color: r.status === 'high' || r.status === 'critical' ? '#ef4444' : r.status === 'low' ? '#f59e0b' : '#10b981' }}>{r.value}</td>
                  <td style={{ padding: 6, color: 'var(--text-secondary)' }}>{r.units}</td>
                  <td style={{ padding: 6, color: 'var(--text-tertiary)' }}>{r.referenceRange}</td>
                  <td style={{ padding: 6 }}><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTION 4 & 5: EXTRACTION CONFIDENCE & TOP PREDICTIONS */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#00d4aa', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginBottom: 12 }}>
            4 & 5. OCR Confidence & Top Disease Risk Probabilities
          </h3>
          <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 8, fontSize: '0.86rem', marginBottom: 12 }}>
            <div>OCR Character Extraction Confidence: <strong>{report.ocrConfidence}%</strong></div>
            <div style={{ marginTop: 6, color: '#ef4444', fontWeight: 700 }}>
              Primary Differential: {pred.topPrediction.disease} ({pred.topPrediction.probability}% probability, ICD-10: {pred.topPrediction.icd10})
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Secondary Differentials: {pred.differentials.map(d => `${d.disease} (${d.probability}%)`).join('; ') || 'None'}
            </div>
          </div>
        </div>

        {/* SECTION 6 & 7: EXPLAINABILITY & MEDICAL EVIDENCE */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#00d4aa', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginBottom: 12 }}>
            6 & 7. SHAP Explainability & RAG Medical Evidence Citations
          </h3>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
            <strong>Dominant SHAP Factors:</strong> {xai.topContributingFactors.join(' | ')}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <strong>Clinical Guidelines Cited:</strong> {evidence.sources.map(s => `${s.title} (${s.relevanceScore}% match)`).join('; ')}
          </div>
        </div>

        {/* SECTION 8, 9, 10: CONSISTENCY, RISK & UNCERTAINTY */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#00d4aa', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginBottom: 12 }}>
            8, 9 & 10. Evidence Consistency, Risk Level & Uncertainty Metrics
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: '0.84rem' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Evidence Consistency:</span>
              <strong style={{ display: 'block', color: '#10b981' }}>{evidence.consistencyStatus.toUpperCase()} ({evidence.consistencyScore}%)</strong>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Calculated Risk Score:</span>
              <strong style={{ display: 'block', color: risk.overallRisk === 'HIGH' || risk.overallRisk === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>{risk.overallRisk} ({risk.riskScore}/100)</strong>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Decision Support Status:</span>
              <strong style={{ display: 'block', color: '#00d4aa' }}>{uncertainty.decisionSupportStatus}</strong>
            </div>
          </div>
        </div>

        {/* SECTION 11 & 12: SUGGESTED NEXT STEPS */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#00d4aa', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 6, marginBottom: 12 }}>
            11 & 12. Clinical Rationale & Suggested Next Steps
          </h3>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {risk.recommendations.map((rec, idx) => (
              <div key={idx}>• {rec}</div>
            ))}
          </div>
        </div>

        {/* SECTION 13: DOCTOR REVIEW Persisted Status */}
        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 16 }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: 6 }}>13. Attending Physician Review & Signature</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Status: Pending Attending Physician Signature. Final diagnostic decision must be recorded in the Doctor Review Panel.
          </p>
        </div>
      </div>
    </div>
  );
}
