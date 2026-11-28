import React, { useState, useEffect } from 'react';
import DemoBanner from '../../components/DemoBanner';
import SafetyDisclaimer from '../../components/SafetyDisclaimer';
import StatusBadge from '../../components/StatusBadge';
import { reportService, predictionService, reviewService } from '../../services/api';

export default function DoctorReviewPage({ reportId = 'REP-9001', doctor, notify, onNavigate }) {
  const [report, setReport] = useState(null);
  const [pred, setPred] = useState(null);
  const [decision, setDecision] = useState(null); // 'accepted' | 'modified' | 'rejected' | 'info_requested'
  const [comments, setComments] = useState('');
  const [modifiedPrediction, setModifiedPrediction] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setErrorMsg(null);
        const rep = await reportService.getById(reportId || 'REP-9001');
        const p = await predictionService.getPrediction(rep?.id || reportId || 'REP-9001');
        if (mounted) {
          if (rep) setReport(rep);
          if (p) setPred(p);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Unable to connect to the MediAgent server. Please try again.');
        }
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [reportId]);

  if (errorMsg) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔌</div>
        <h3 style={{ color: '#ef4444', marginBottom: 12 }}>Unable to load doctor review panel</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{errorMsg}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry ↻
        </button>
      </div>
    );
  }

  if (!report || !pred) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Doctor Review Panel...</p>
      </div>
    );
  }

  const handleSubmitReview = async () => {
    if (!decision) {
      notify && notify('Please select a review decision action', 'error');
      return;
    }

    if (decision === 'rejected' && !comments.trim()) {
      notify && notify('Rejection requires a documented clinical reason', 'error');
      return;
    }

    await reviewService.submitReview({
      reportId: report.id,
      doctorId: doctor?.id || null,
      doctorName: doctor?.name || 'Unknown',
      decision,
      comments,
      modifiedPrediction: decision === 'modified' ? modifiedPrediction : null,
      timestamp: new Date().toISOString()
    });

    setReviewSubmitted(true);
    notify && notify(`Doctor review decision (${decision.toUpperCase()}) recorded in HIPAA audit log!`, 'success');
  };

  return (
    <div className="fade-in">
      <DemoBanner />
      <div className="page-header" style={{ marginTop: 16 }}>
        <h2>🩺 Doctor Review & Signature Panel</h2>
        <p>Human-in-the-loop decision validation for: <strong style={{ color: '#00d4aa' }}>{report.filename}</strong></p>
      </div>

      <SafetyDisclaimer compact />

      <div className="grid-2" style={{ marginTop: 20 }}>
        {/* LEFT: AI SUMMARY FOR REVIEW */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 12 }}>AI Clinical Recommendation Summary</h4>

          <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Report ID & Patient</div>
            <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{report.filename} — {report.patientName} ({report.patientId})</strong>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0', paddingTop: 10 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Primary AI Prediction</div>
              <strong style={{ color: '#ef4444', fontSize: '1.05rem', display: 'block' }}>
                {pred.topPrediction.disease} ({pred.topPrediction.probability}%)
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ICD-10: {pred.topPrediction.icd10}</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Parsed Lab Findings</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {report.labResults.slice(0, 4).map(l => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• {l.testName}:</span>
                    <strong style={{ color: l.status === 'high' || l.status === 'critical' ? '#ef4444' : l.status === 'low' ? '#f59e0b' : '#10b981' }}>
                      {l.value} {l.units} ({l.status.toUpperCase()})
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => onNavigate('clinical-report')}>
            📄 View Full 13-Section Clinical Report
          </button>
        </div>

        {/* RIGHT: DOCTOR DECISION & SIGN-OFF FORM */}
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h4 style={{ color: '#fff', marginBottom: 16 }}>Attending Physician Sign-Off</h4>

          {reviewSubmitted ? (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: 'var(--radius-md)', padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
              <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: 4 }}>Review Sign-Off Recorded</h3>
              <p style={{ color: '#10b981', fontSize: '0.86rem', fontWeight: 600 }}>
                Decision: {decision?.toUpperCase()}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 8 }}>
                Logged by {doctor?.name || 'Unknown'} on {new Date().toLocaleString()}
              </p>
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setReviewSubmitted(false)}>
                Edit Decision
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Select Clinical Action:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => setDecision('accepted')}
                  style={{
                    padding: 14, borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    background: decision === 'accepted' ? 'rgba(16,185,129,0.2)' : 'var(--bg-elevated)',
                    border: `1px solid ${decision === 'accepted' ? '#10b981' : 'var(--border-color)'}`,
                    color: decision === 'accepted' ? '#10b981' : '#fff', fontWeight: 700
                  }}
                >
                  ✓ Accept AI Report
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('modified')}
                  style={{
                    padding: 14, borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    background: decision === 'modified' ? 'rgba(245,158,11,0.2)' : 'var(--bg-elevated)',
                    border: `1px solid ${decision === 'modified' ? '#f59e0b' : 'var(--border-color)'}`,
                    color: decision === 'modified' ? '#f59e0b' : '#fff', fontWeight: 700
                  }}
                >
                  ✎ Modify Diagnosis
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('rejected')}
                  style={{
                    padding: 14, borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    background: decision === 'rejected' ? 'rgba(239,68,68,0.2)' : 'var(--bg-elevated)',
                    border: `1px solid ${decision === 'rejected' ? '#ef4444' : 'var(--border-color)'}`,
                    color: decision === 'rejected' ? '#ef4444' : '#fff', fontWeight: 700
                  }}
                >
                  ✕ Reject AI Report
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('info_requested')}
                  style={{
                    padding: 14, borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    background: decision === 'info_requested' ? 'rgba(99,102,241,0.2)' : 'var(--bg-elevated)',
                    border: `1px solid ${decision === 'info_requested' ? '#6366f1' : 'var(--border-color)'}`,
                    color: decision === 'info_requested' ? '#a5b4fc' : '#fff', fontWeight: 700
                  }}
                >
                  ↻ Request More Info
                </button>
              </div>

              {decision === 'modified' && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Modified Clinical Diagnosis</label>
                  <input className="form-input" value={modifiedPrediction} onChange={e => setModifiedPrediction(e.target.value)} placeholder="Enter revised diagnosis..." />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Physician Clinical Notes & Rationale {decision === 'rejected' && <span style={{ color: '#ef4444' }}>* Required</span>}
                </label>
                <textarea className="form-input" rows={3} value={comments} onChange={e => setComments(e.target.value)} placeholder="Document clinical notes, treatment modifications, or rejection reasons..." />
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleSubmitReview}>
                Submit Clinical Sign-Off →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
