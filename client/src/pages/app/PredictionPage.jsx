import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import ProbabilityBar from '../../components/ProbabilityBar';
import { predictionService, reportService } from '../../services/api';

const DISEASES = [
  { id: 'diabetes', label: 'Diabetes Mellitus', icon: '🩺' },
  { id: 'chikungunya', label: 'Chikungunya', icon: '🦴' },
  { id: 'dengue', label: 'Dengue Fever', icon: '🩸' },
  { id: 'malaria', label: 'Malaria', icon: '🦟' },
  { id: 'typhoid', label: 'Typhoid Fever', icon: '🌡️' }
];

export default function PredictionPage({ reportId = 'REP-9001', onNavigate }) {
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState('SUCCESS'); // 'LOADING' | 'REPORT_NOT_FOUND' | 'PREDICTION_NOT_AVAILABLE' | 'INSUFFICIENT_DATA' | 'INVALID_DATA' | 'VERIFICATION_REQUIRED' | 'SUCCESS' | 'ERROR'
  const [pred, setPred] = useState(null);
  const [report, setReport] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async (targetDisease = selectedDisease) => {
    try {
      setLoading(true);
      let rep = null;
      try {
        rep = await reportService.getById(reportId || 'REP-9001', targetDisease);
      } catch (repErr) {
        setPageState('ERROR');
        setErrorMsg(repErr.message || 'Unable to load report. Please verify your connection.');
        setLoading(false);
        return;
      }

      setReport(rep);

      // Auto-detect disease if targetDisease not explicitly chosen
      let activeDisease = targetDisease;
      if (!activeDisease && rep) {
        const meta = [rep.disease || '', rep.filename || '', rep.chiefComplaint || ''].join(' ').toLowerCase();
        if (/chikungunya|chikv|polyarthralgia/i.test(meta)) activeDisease = 'chikungunya';
        else if (/dengue|ns1/i.test(meta)) activeDisease = 'dengue';
        else if (/malaria|plasmodium/i.test(meta)) activeDisease = 'malaria';
        else if (/typhoid|widal/i.test(meta)) activeDisease = 'typhoid';
        else activeDisease = 'diabetes';
        setSelectedDisease(activeDisease);
      } else if (!activeDisease) {
        activeDisease = 'diabetes';
        setSelectedDisease('diabetes');
      }

      const repReadiness = (rep && rep.modelReadiness) || null;
      setReadiness(repReadiness);

      // Step 2: Query prediction endpoint for this verified report and disease
      let predRes = await predictionService.getPrediction(rep?.id || 'REP-9001', activeDisease);

      // Handle verification-required status — prediction cannot be generated before backend verification
      if (predRes && predRes.status === 'VERIFICATION_REQUIRED') {
        setPred(predRes);
        setReadiness(predRes.modelReadiness || repReadiness);
        setPageState('VERIFICATION_REQUIRED');
        setErrorMsg(predRes.message || 'Report must be verified before prediction can be generated.');
        setLoading(false);
        return;
      }

      // If prediction is missing or insufficient, trigger active on-demand screening
      if ((!predRes || predRes.status === 'INSUFFICIENT_DATA' || predRes.status === 'PREDICTION_NOT_AVAILABLE') && rep?.id) {
        try {
          const runRes = await predictionService.predict(rep.id, activeDisease);
          if (runRes && runRes.status === 'SUCCESS' && runRes.prediction) {
            predRes = runRes.prediction;
            setPred(predRes);
            if (runRes.modelReadiness) setReadiness(runRes.modelReadiness);
            setPageState('SUCCESS');
            setLoading(false);
            return;
          }
        } catch (predictErr) {
          console.warn('[PredictionPage] Auto on-demand predict failed:', predictErr);
        }
      }

      if (predRes && predRes.status === 'SUCCESS' && (predRes.topPrediction || predRes.predictedClass)) {
        setPred(predRes);
        setPageState('SUCCESS');
      } else if (predRes && predRes.status === 'INSUFFICIENT_DATA') {
        setPred(predRes);
        setReadiness(predRes.modelReadiness || repReadiness);
        setPageState('INSUFFICIENT_DATA');
      } else {
        setPred(predRes);
        setPageState('ERROR');
        setErrorMsg('Prediction could not be retrieved from the backend server.');
      }
      setLoading(false);
    } catch (err) {
      console.error('[PredictionPage] Data retrieval error:', err);
      setPageState('ERROR');
      setErrorMsg(err.message || 'Unable to connect to the MediAgent server. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDisease);
  }, [reportId, selectedDisease]);

  // LOADING STATE
  if (loading || pageState === 'LOADING') {
    return (
      <div className="fade-in" style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Retrieving Trained ML Classifier Prediction...</p>
      </div>
    );
  }

  // CASE A: REPORT NOT FOUND (Genuine 404)
  if (pageState === 'REPORT_NOT_FOUND') {
    return (
      <div className="fade-in">
        <DemoBanner />
        <div style={{ padding: 40, textAlign: 'center', maxWidth: 640, margin: '40px auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <h3 style={{ color: '#ef4444', marginBottom: 12, fontSize: '1.4rem' }}>Report Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.92rem' }}>
            {errorMsg || `The requested laboratory report (${reportId}) was not found in the database. It may have been deleted or never uploaded.`}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => onNavigate('reports')}>
              📋 View All Reports
            </button>
            <button className="btn btn-primary" onClick={() => onNavigate('upload')}>
              📤 Upload New Lab Report →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASE E: BACKEND REQUEST FAILED
  if (pageState === 'ERROR') {
    return (
      <div className="fade-in">
        <DemoBanner />
        <div style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '40px auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔌</div>
          <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Backend Request Failed</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            {errorMsg || 'Unable to connect to the backend server. Please verify your connection.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={loadData}>
              Retry Request ↻
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASE F: VERIFICATION REQUIRED — No prediction before backend verification
  if (pageState === 'VERIFICATION_REQUIRED') {
    return (
      <div className="fade-in">
        <DemoBanner />
        <div style={{ padding: 40, textAlign: 'center', maxWidth: 640, margin: '40px auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <h3 style={{ color: '#f59e0b', marginBottom: 12, fontSize: '1.4rem' }}>Verification Required</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.92rem' }}>
            {errorMsg || 'Laboratory values must be verified before a clinical prediction can be generated.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('extraction')}>
              📄 Complete Lab Value Verification →
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('reports')}>
              📋 View All Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASE B: REPORT EXISTS, BUT PREDICTION NOT GENERATED
  if (pageState === 'PREDICTION_NOT_AVAILABLE') {
    const labList = report?.labResults || [];
    return (
      <div className="fade-in">
        <DemoBanner />
        <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>🧬 Disease Prediction Status</h2>
            <p>Report: <strong style={{ color: '#00d4aa' }}>{report?.filename || reportId}</strong> (ID: {reportId})</p>
          </div>
          <button className="btn btn-secondary" onClick={() => onNavigate('extraction')}>
            📄 View Extracted Lab Results →
          </button>
        </div>

        <SafetyDisclaimer compact />

        <div className="card" style={{ maxWidth: 750, margin: '30px auto', background: 'var(--bg-secondary)', textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
          <h3 style={{ color: '#eab308', marginBottom: 12, fontSize: '1.3rem' }}>Prediction Not Available</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.6, fontSize: '0.9rem' }}>
            This laboratory report is stored in the database, but an automated disease screening prediction has not been generated yet.
          </p>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 16, maxWidth: 500, margin: '0 auto 24px', textAlign: 'left', fontSize: '0.84rem' }}>
            <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>Clinical Report Summary:</div>
            <div style={{ color: 'var(--text-secondary)' }}>• Report ID: <span style={{ color: '#00d4aa' }}>{report?.id}</span></div>
            <div style={{ color: 'var(--text-secondary)' }}>• Patient Name: {report?.patientName || 'Sarah Johnson'}</div>
            <div style={{ color: 'var(--text-secondary)' }}>• Extracted Parameters: <strong style={{ color: '#fff' }}>{labList.length}</strong> laboratory parameters parsed</div>
            <div style={{ color: 'var(--text-secondary)' }}>• Model Readiness: {readiness?.status || 'PENDING'}</div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('extraction')}>
              Inspect Extracted Results in Verification View →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASE C: INSUFFICIENT DATA FOR DISEASE PREDICTION
  if (pageState === 'INSUFFICIENT_DATA' || pageState === 'INVALID_DATA') {
    const missing = readiness?.missingFeatures || [];
    const availableCount = readiness?.availableFeaturesCount ?? Math.max(0, 8 - missing.length);
    const labList = report?.labResults || [];

    const pimaFeatureLabels = {
      preg: 'Pregnancy Count (preg)',
      plas: 'Plasma Fasting Glucose (plas)',
      pres: 'Diastolic Blood Pressure (pres)',
      skin: 'Triceps Skinfold Thickness (skin)',
      insu: '2-Hour Serum Insulin (insu)',
      mass: 'Body Mass Index - BMI (mass)',
      pedi: 'Diabetes Pedigree Function (pedi)',
      age: 'Patient Age (age)'
    };

    return (
      <div className="fade-in">
        <DemoBanner />
        <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>🧬 Disease Prediction — Screening Readiness</h2>
            <p>Report: <strong style={{ color: '#00d4aa' }}>{report?.filename || reportId}</strong> (ID: {reportId})</p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('extraction')}>
            Complete Missing Features in Extraction View →
          </button>
        </div>

        <SafetyDisclaimer compact />

        {/* INSUFFICIENT DATA CARD */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {DISEASES.map(d => {
            const isSel = selectedDisease === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDisease(d.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  background: isSel ? '#00d4aa' : 'rgba(255,255,255,0.06)',
                  color: isSel ? '#090d16' : '#94a3b8',
                  border: isSel ? '1px solid #00d4aa' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{d.icon}</span>
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid #f59e0b', marginBottom: 24, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ fontSize: '2.2rem' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#f59e0b', fontSize: '1.15rem', marginBottom: 6 }}>
                Insufficient Data for {selectedDisease.toUpperCase()} Screening
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 14 }}>
                {selectedDisease === 'diabetes'
                  ? 'The Scikit-Learn Diabetes Model requires all 8 canonical Pima features to produce an authoritative, mathematically valid screening prediction without synthetic fabrication or heuristic hallucination.'
                  : `The ${selectedDisease.toUpperCase()} Model evaluates independent clinical features (${missing.join(', ')}). Never requires diabetes features.`}
              </p>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.84rem', background: 'var(--bg-elevated)', padding: '10px 16px', borderRadius: 6 }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Total Extracted Lab Parameters: </span>
                  <strong style={{ color: '#00d4aa' }}>{labList.length}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Available Pima Features: </span>
                  <strong style={{ color: '#10b981' }}>{availableCount} / 8</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Missing Pima Features: </span>
                  <strong style={{ color: '#ef4444' }}>{missing.length} / 8</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>ML Screening Status: </span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>INSUFFICIENT_DATA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 36, marginBottom: 32, alignItems: 'start' }}>
          {/* LEFT: MISSING REQUIRED FEATURES */}
          <div className="card table-card-elevated" style={{ padding: 24, margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span> Missing Required Model Features ({missing.length})
              </h4>
              <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '3px 10px', borderRadius: 4, fontWeight: 700 }}>
                Action Required
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              These parameters could not be reliably extracted from the uploaded document or patient profile:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {missing.map((key) => (
                <li key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8,
                  fontSize: '0.84rem', border: '1px solid rgba(239,68,68,0.2)'
                }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    {pimaFeatureLabels[key] || key}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                    MISSING
                  </span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 22 }}>
              <button className="btn btn-primary" style={{ width: '100%', padding: '12px 18px', fontWeight: 600 }} onClick={() => onNavigate('extraction')}>
                ✏️ Provide Missing Values via Extraction Verification →
              </button>
            </div>
          </div>

          {/* RIGHT: PRESERVED REPORT PARAMETERS */}
          <div className="card table-card-elevated" style={{ padding: 24, margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h4 style={{ color: '#00d4aa', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📋</span> Extracted Report Parameters ({labList.length})
                </h4>
              </div>
              <span style={{ fontSize: '0.72rem', background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '3px 10px', borderRadius: 4, fontWeight: 700 }}>
                Preserved from Document
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              The extraction engine successfully captured the following laboratory results:
            </p>

            <div style={{ maxHeight: 380, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border-color)', background: '#040711' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.85)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>PARAMETER</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>VALUE</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>REFERENCE</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {labList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>{item.testName}</td>
                      <td style={{ padding: '12px 14px', color: '#00d4aa', fontWeight: 700, fontFamily: 'monospace' }}>{item.value} {item.units || item.unit || ''}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-tertiary)' }}>{item.referenceRange || '—'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4, fontWeight: 700,
                          background: item.status === 'HIGH' ? 'rgba(239,68,68,0.2)' : item.status === 'LOW' ? 'rgba(234,179,8,0.2)' : 'rgba(16,185,129,0.15)',
                          color: item.status === 'HIGH' ? '#ef4444' : item.status === 'LOW' ? '#eab308' : '#10b981'
                        }}>
                          {item.status || 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SYMPTOM-BASED MULTI-CONDITION DIFFERENTIAL SECTION */}
        {pred?.symptomDifferentials && pred.symptomDifferentials.length > 0 && (
          <div className="card" style={{ background: 'var(--bg-secondary)', marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.3rem' }}>🔬</span>
                <div>
                  <h4 style={{ color: '#00d4aa', margin: 0 }}>Symptom-Correlated Differential Diagnoses</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                    Multi-Agent Clinical Intelligence cross-referenced against presenting symptoms ({report?.symptoms?.join(', ') || 'Report Symptoms'})
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                Active Diagnostic Agent
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 14 }}>
              {pred.symptomDifferentials.map((diff, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-elevated)', borderRadius: 8, padding: 14,
                  border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h5 style={{ color: '#fff', fontSize: '0.95rem', margin: '0 0 4px 0' }}>{diff.condition}</h5>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>ICD-10: {diff.icd10} • {diff.category}</span>
                    </div>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 800,
                      color: diff.confidence >= 70 ? '#ef4444' : diff.confidence >= 40 ? '#f59e0b' : '#10b981'
                    }}>
                      {diff.confidence}% Match
                    </span>
                  </div>

                  {diff.matchedSymptoms && diff.matchedSymptoms.length > 0 && (
                    <div style={{ fontSize: '0.76rem', color: '#10b981', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Matching Symptoms:</span>
                      {diff.matchedSymptoms.map((s, si) => (
                        <span key={si} style={{ background: 'rgba(16,185,129,0.12)', padding: '1px 6px', borderRadius: 4 }}>
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Severity: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{diff.severity}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!pred?.symptomDifferentials || pred.symptomDifferentials.length === 0) && (
          <div className="card" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', marginTop: 20, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>🦟</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#fff' }}>Multi-Disease Screening (Malaria, Typhoid, Chikungunya, Dengue):</strong> In addition to laboratory screening models, MediAgent diagnoses acute infectious conditions based on presenting symptoms (e.g., high fever, chills, severe arthralgia, step-ladder fever). Add patient symptoms during report upload or consultation to evaluate infectious differentials.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // CASE D: REPORT EXISTS AND PREDICTION GENERATED (SUCCESS)
  const top = pred?.topPrediction || {
    disease: 'Type 2 Diabetes Mellitus',
    probability: pred?.probability || 0,
    severity: 'moderate',
    icd10: 'E11.9',
    reasoning: pred?.clinicalInterpretation || 'Authoritative Scikit-Learn Model Prediction.',
    supportingFeatures: []
  };

  const topProbDisplay = typeof top.probability === 'number'
    ? (top.probability <= 1 ? Math.round(top.probability * 1000) / 10 : top.probability)
    : 0;

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>🧬 AI Disease Risk Analysis</h2>
          <p>Authoritative Scikit-Learn Model Prediction for Report: <strong style={{ color: '#00d4aa' }}>{report?.filename}</strong> (ID: {report?.id})</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('xai')}>
          View SHAP Feature Explainability (XAI) →
        </button>
      </div>

      <SafetyDisclaimer compact />

      {/* DISEASE SELECTOR TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {DISEASES.map(d => {
          const isSel = selectedDisease === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDisease(d.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                background: isSel ? '#00d4aa' : 'rgba(255,255,255,0.06)',
                color: isSel ? '#090d16' : '#94a3b8',
                border: isSel ? '1px solid #00d4aa' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODEL METADATA BADGE BAR */}
      <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20, padding: '12px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Model Architecture: </span>
            <strong style={{ color: '#fff' }}>
              {pred?.modelName || (selectedDisease === 'chikungunya' ? 'MediAgent Chikungunya Notification Classifier (Random Forest)' : selectedDisease === 'diabetes' ? 'MediAgent Pima Diabetes Classifier' : `MediAgent ${selectedDisease ? selectedDisease.toUpperCase() : 'MULTI-DISEASE'} Classifier`)}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Model Version: </span>
            <strong style={{ color: '#00d4aa' }}>
              {pred?.modelVersion || (selectedDisease === 'chikungunya' ? 'v1.0.0-chikungunya-sinan' : selectedDisease === 'diabetes' ? 'v2.0.0-pima-diabetes' : `v1.0.0-${selectedDisease || 'general'}`)}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Inference Source: </span>
            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
              ✓ Backend Machine Learning Server
            </span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* LEFT COLUMN: TOP PREDICTIONS PROBABILITY BARS */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>Model Diagnostic Risk Estimation</h4>

          <ProbabilityBar
            disease={top.disease}
            probability={topProbDisplay}
            severity={top.severity}
            icd10={top.icd10}
            isPrimary={true}
          />

          {pred?.differentials && pred.differentials.map((diff, idx) => {
            const diffProbDisplay = typeof diff.probability === 'number'
              ? (diff.probability <= 1 ? Math.round(diff.probability * 1000) / 10 : diff.probability)
              : 0;
            return (
              <ProbabilityBar
                key={idx}
                disease={diff.disease}
                probability={diffProbDisplay}
                severity={diff.severity || 'moderate'}
                icd10={diff.icd10 || 'R79.89'}
                isPrimary={false}
              />
            );
          })}

          <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 14 }}>
            💡 Model output generated by Scikit-Learn inference on validated clinical report features.
          </div>
        </div>

        {/* RIGHT COLUMN: RATIONALE */}
        <div>
          <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 20 }}>
            <h4 style={{ color: '#00d4aa', marginBottom: 12 }}>"Why This Model Estimation?"</h4>
            <p style={{ fontSize: '0.86rem', color: '#fff', fontWeight: 600, marginBottom: 10 }}>
              Primary condition: {top.disease} ({topProbDisplay}% model likelihood)
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
              {top.reasoning}
            </p>

            <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginBottom: 6 }}>
              Supporting Laboratory Features:
            </div>
            <ul style={{ paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              {top.supportingFeatures && top.supportingFeatures.length > 0 ? (
                top.supportingFeatures.map((f, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>{f}</li>
                ))
              ) : (
                <li style={{ color: 'var(--text-tertiary)' }}>Key clinical biomarkers aligned with model features.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
